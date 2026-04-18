export interface TokenStorage {
  get(): Promise<string | null> | string | null;
  set(token: string | null): Promise<void> | void;
}
