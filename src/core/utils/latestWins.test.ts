import { describe, expect, it, vi } from "vitest";
import { createLatestAsyncLoadCoordinator, createLatestWins } from "./latestWins";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("createLatestWins", () => {
  it("marks an in-flight epoch stale once a newer load begins", () => {
    const guard = createLatestWins();
    const older = guard.begin();
    const newer = guard.begin();

    expect(guard.isCurrent(older)).toBe(false);
    expect(guard.isCurrent(newer)).toBe(true);
  });

  it("keeps the latest epoch current until invalidated", () => {
    const guard = createLatestWins();
    const epoch = guard.begin();

    expect(guard.isCurrent(epoch)).toBe(true);
    guard.invalidate();
    expect(guard.isCurrent(epoch)).toBe(false);
  });

  it("prevents an older response from overwriting a newer one after create/edit return", () => {
    const guard = createLatestWins();
    const staleLoad = guard.begin();

    guard.begin();

    expect(guard.isCurrent(staleLoad)).toBe(false);
  });

  it("resets the guard on unmount so no pending load can write afterwards", () => {
    const guard = createLatestWins();
    const epoch = guard.begin();

    guard.invalidate();

    expect(guard.isCurrent(epoch)).toBe(false);
    expect(guard.isCurrent(guard.begin())).toBe(true);
  });
});

describe("createLatestAsyncLoadCoordinator", () => {
  it("commits only the newest biweekly window when responses complete in reverse order", async () => {
    const coordinator = createLatestAsyncLoadCoordinator();
    const older = deferred<string>();
    const newer = deferred<string>();
    const writes: string[] = [];
    const callbacks = {
      onStart: () => undefined,
      onSuccess: (value: string) => writes.push(value),
      onError: () => undefined,
    };

    const oldRequest = coordinator.run(() => older.promise, callbacks);
    const newRequest = coordinator.run(() => newer.promise, callbacks);

    newer.resolve("newer window");
    await newRequest;
    older.resolve("older window");
    await oldRequest;

    expect(writes).toEqual(["newer window"]);
  });

  it("does not write a completed annual load after the screen is disposed", async () => {
    const coordinator = createLatestAsyncLoadCoordinator();
    const pending = deferred<string>();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const request = coordinator.run(() => pending.promise, {
      onStart: () => undefined,
      onSuccess,
      onError,
    });
    coordinator.invalidate();
    pending.resolve("annual totals");
    await request;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
