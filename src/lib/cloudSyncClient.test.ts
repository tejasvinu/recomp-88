import { describe, expect, it } from "vitest";
import { CloudSyncGate, SerialTaskQueue } from "./cloudSyncClient";
describe("account hydration and push ordering", () => {
  it("permits a hydrated empty account but blocks unavailable and previous-account work", () => {
    const gate = new CloudSyncGate();
    const a = gate.switchAccount("a");
    expect(gate.canPush(a)).toBe(false);
    gate.hydrate(a);
    expect(gate.canPush(a)).toBe(true);
    const b = gate.switchAccount("b");
    expect(gate.canPush(a)).toBe(false);
    expect(gate.canPush(b)).toBe(false);
    gate.hydrate(a); // delayed result from the old account
    expect(gate.canPush(b)).toBe(false);
    gate.hydrate(b); // success, including a null/empty cloud dataset
    expect(gate.canPush(b)).toBe(true);
  });
  it("serialises requests and continues after a failed task", async () => {
    const queue = new SerialTaskQueue();
    const order: string[] = [];
    const a = queue.run(async () => { order.push("a-start"); await Promise.resolve(); order.push("a-end"); throw new Error("offline"); });
    const b = queue.run(async () => { order.push("b"); return true; });
    await expect(a).rejects.toThrow("offline");
    expect(await b).toBe(true);
    expect(order).toEqual(["a-start", "a-end", "b"]);
  });
});
