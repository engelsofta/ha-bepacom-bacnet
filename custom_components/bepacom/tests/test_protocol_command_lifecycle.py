"""Exercise real protocol command lifecycle methods without HA dependencies."""
import ast
import asyncio
import __future__
from pathlib import Path
import time
import unittest
from unittest.mock import AsyncMock, patch


class CannotConnect(Exception):
    pass


source = ast.parse((Path(__file__).parents[1] / 'api.py').read_text(encoding='utf-8'))
client_class = next(n for n in source.body if isinstance(n, ast.ClassDef) and n.name == 'BepacomClient')
methods = {'__init__', '_async_protocol_command', 'set_protocol_socket', 'handle_protocol_result', 'async_close'}
client_class.body = [n for n in client_class.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in methods]
namespace = {'asyncio': asyncio, 'time': time, 'CannotConnect': CannotConnect, 'InvalidResponse': ValueError}
exec(compile(ast.Module(body=[client_class], type_ignores=[]), 'api.py', 'exec', flags=__future__.annotations.compiler_flag), namespace)
Client = namespace['BepacomClient']


class ProtocolCommandTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.client = Client('gateway.local')
        self.socket = type('Socket', (), {'closed': False})()
        self.socket.send_json = AsyncMock()
        self.client.set_protocol_socket(self.socket)

    async def start_command(self):
        pending_before = len(self.client._protocol_pending)
        task = asyncio.create_task(self.client._async_protocol_command('write_property', {'value': 42}))
        await asyncio.sleep(0)
        self.assertEqual(len(self.client._protocol_pending), pending_before + 1)
        return task

    async def test_success_and_late_reply(self):
        task = await self.start_command()
        reply = {'id': 'ha-1', 'success': True}
        self.client.handle_protocol_result(reply)
        self.assertTrue(await task)
        self.client.handle_protocol_result(reply)
        self.assertFalse(self.client._protocol_pending)
        self.assertEqual(self.client._protocol_command_successes, 1)

    async def test_send_failure_cleans_up_without_retry(self):
        self.socket.send_json.side_effect = OSError('connection lost')
        with self.assertRaises(OSError):
            await self.client._async_protocol_command('write_property', {})
        self.assertFalse(self.client._protocol_pending)
        self.assertEqual(self.client._protocol_command_errors, 1)
        self.socket.send_json.assert_awaited_once()

    async def test_disconnect_fails_all_pending_immediately(self):
        tasks = [await self.start_command(), await self.start_command()]
        self.client.set_protocol_socket(None)
        self.assertFalse(self.client._protocol_pending)
        results = await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), 0.5)
        self.assertTrue(all(isinstance(result, CannotConnect) for result in results))
        self.assertEqual(self.client._protocol_command_errors, 2)
        self.assertEqual(self.socket.send_json.await_count, 2)

    async def test_replacement_fails_old_commands_but_same_socket_does_not(self):
        task = await self.start_command()
        self.client.set_protocol_socket(self.socket)
        self.assertFalse(task.done())
        self.client.set_protocol_socket(type('Socket', (), {'closed': False})())
        with self.assertRaises(CannotConnect):
            await task
        self.assertFalse(self.client._protocol_pending)

    async def test_cancellation_during_send_cleans_up(self):
        entered = asyncio.Event()
        async def blocked_send(message):
            entered.set()
            await asyncio.Event().wait()
        self.socket.send_json.side_effect = blocked_send
        task = asyncio.create_task(self.client._async_protocol_command('write_property', {}))
        await asyncio.wait_for(entered.wait(), 1)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertFalse(self.client._protocol_pending)

    async def test_send_timeout_cleans_up_without_retry(self):
        real_timeout = asyncio.timeout
        async def blocked_send(message):
            await asyncio.Event().wait()
        self.socket.send_json.side_effect = blocked_send
        with patch.object(asyncio, 'timeout', side_effect=lambda seconds: real_timeout(0.01)):
            with self.assertRaises(TimeoutError):
                await self.client._async_protocol_command('write_property', {})
        self.assertFalse(self.client._protocol_pending)
        self.assertEqual(self.client._protocol_command_errors, 1)
        self.socket.send_json.assert_awaited_once()

    async def test_cancellation_while_waiting_cleans_up(self):
        task = await self.start_command()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertFalse(self.client._protocol_pending)

    async def test_close_fails_waiter(self):
        task = await self.start_command()
        await self.client.async_close()
        with self.assertRaises(CannotConnect):
            await task
        self.assertFalse(self.client._protocol_pending)

    async def test_disconnect_during_send_then_send_failure(self):
        async def broken_send(message):
            self.client.set_protocol_socket(None)
            raise OSError('lost during send')
        self.socket.send_json.side_effect = broken_send
        with self.assertRaises(OSError):
            await self.client._async_protocol_command('write_property', {})
        self.assertFalse(self.client._protocol_pending)


if __name__ == '__main__':
    unittest.main()

