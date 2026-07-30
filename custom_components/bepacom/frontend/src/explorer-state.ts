export class ExplorerPreferences {
  public get(key: string, fallback: string): string {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  public set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }

  public getBoolean(key: string, fallback = false): boolean {
    const value = this.get(key, fallback ? "1" : "0");
    return value === "1" || value === "true";
  }
}
