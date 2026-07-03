"""Bepacom REST client."""

from __future__ import annotations

import asyncio
import logging

import aiohttp

_LOGGER = logging.getLogger(__name__)


class BepacomClient:

    def __init__(
        self,
        host: str,
        port: int = 8099,
    ) -> None:

        self._host = host
        self._port = port

    @property
    def base_url(self) -> str:
        return f"http://{self._host}:{self._port}"

    async def get_json(self) -> dict:

        url = f"{self.base_url}/apiv1/json"

        _LOGGER.debug("GET %s", url)

        timeout = aiohttp.ClientTimeout(total=20)

        async with aiohttp.ClientSession(timeout=timeout) as session:

            async with session.get(url) as response:

                response.raise_for_status()

                return await response.json()

    async def ping(self) -> bool:

        try:

            await self.get_json()

            return True

        except (
            aiohttp.ClientError,
            asyncio.TimeoutError,
        ):

            return False