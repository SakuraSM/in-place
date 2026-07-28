export class ConcurrencyGate {
  private activeGlobal = 0;
  private readonly activeByKey = new Map<string, number>();

  constructor(
    private readonly maxGlobal: number,
    private readonly maxPerKey: number,
  ) {}

  tryAcquire(key: string): (() => void) | null {
    const activeForKey = this.activeByKey.get(key) ?? 0;
    if (this.activeGlobal >= this.maxGlobal || activeForKey >= this.maxPerKey) return null;
    this.activeGlobal += 1;
    this.activeByKey.set(key, activeForKey + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeGlobal -= 1;
      const remaining = (this.activeByKey.get(key) ?? 1) - 1;
      if (remaining <= 0) this.activeByKey.delete(key);
      else this.activeByKey.set(key, remaining);
    };
  }
}
