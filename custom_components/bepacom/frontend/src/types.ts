export interface HomeAssistantLike {
  states?: Record<string, { state: string; attributes?: Record<string, unknown> }>;
  callWS<T = unknown>(message: Record<string, unknown>): Promise<T>;
}

export interface BepacomPanelConfig {
  config?: {
    domain?: string;
    entry_id?: string;
    version?: string;
    frontend_build?: string;
  };
}
