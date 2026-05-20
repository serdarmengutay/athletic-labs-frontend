import { MeasurementKey } from "./sportTestConfig";

export type OfflineMeasurements = Partial<Record<MeasurementKey, number>>;

export interface PendingMeasurementSave {
  id: string;
  athleteTestId: string;
  measurements: OfflineMeasurements;
  createdAt: string;
}

const DB_NAME = "athletic_labs_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_measurements";

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function queueMeasurementSave(
  athleteTestId: string,
  measurements: OfflineMeasurements
): Promise<PendingMeasurementSave> {
  const pendingSave: PendingMeasurementSave = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${athleteTestId}-${Date.now()}`,
    athleteTestId,
    measurements,
    createdAt: new Date().toISOString(),
  };

  await withStore("readwrite", (store) => store.put(pendingSave));
  return pendingSave;
}

export async function removeQueuedMeasurementSave(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function getQueuedMeasurementSaves(): Promise<
  PendingMeasurementSave[]
> {
  return withStore("readonly", (store) => store.getAll());
}

export async function getQueuedMeasurementCount(): Promise<number> {
  return withStore("readonly", (store) => store.count());
}
