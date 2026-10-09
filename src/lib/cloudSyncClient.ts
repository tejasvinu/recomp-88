// Account-bound hydration and serialisation shared by every push trigger.
export class CloudSyncGate {
  private account: string | null = null;
  private generation = 0;
  private ready = false;
  switchAccount(account: string | null) {
    if (account !== this.account) { this.account = account; this.generation++; this.ready = false; }
    return this.generation;
  }
  isCurrent(generation: number) { return generation === this.generation && this.account !== null; }
  hydrate(generation: number) { if (this.isCurrent(generation)) this.ready = true; }
  canPush(generation: number) { return this.isCurrent(generation) && this.ready; }
}

export class SerialTaskQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task, task);
    this.tail = next.catch(() => {});
    return next;
  }
}
