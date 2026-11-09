type Listener = () => void;

const listeners = new Set<Listener>();

export function onHolidaysSynced(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyHolidaysSynced(): void {
  for (const listener of listeners) {
    listener();
  }
}