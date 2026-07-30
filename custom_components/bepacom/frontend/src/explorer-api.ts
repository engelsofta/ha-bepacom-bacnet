import type { HomeAssistantLike } from "./types";

export class ExplorerApi {
  public constructor(private readonly hass: HomeAssistantLike) {}

  public call<T = any>(message: Record<string, unknown>): Promise<T> {
    return this.hass.callWS(message) as Promise<T>;
  }

  public async callWithTimeout<T = any>(
    message: Record<string, unknown>,
    timeoutMs = 15_000,
  ): Promise<T> {
    let timeoutId: number | undefined;
    try {
      return await Promise.race([
        this.call<T>(message),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error(`Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} Sekunden`)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  }
}
