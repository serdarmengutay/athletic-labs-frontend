import { MeasurementKey } from "./sportTestConfig";

export type OfflineMeasurements = Partial<Record<MeasurementKey, number>>;

export interface PendingMeasurementSave {
  id: string;
  athleteTestId: string;
  measurements: OfflineMeasurements;
  createdAt: string;
}

export interface PendingXOneQrImport {
  id: string;
  testSessionId: string;
  athleteId: string;
  qrUrl: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const DB_NAME = "athletic_labs_offline";
const DB_VERSION = 2;
const MEASUREMENTS_STORE_NAME = "pending_measurements";
const X_ONE_IMPORTS_STORE_NAME = "pending_x_one_imports";

function createStoreIfMissing(db: IDBDatabase, storeName: string) {
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName, { keyPath: "id" });
  }
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      createStoreIfMissing(db, MEASUREMENTS_STORE_NAME);
      createStoreIfMissing(db, X_ONE_IMPORTS_STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
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

  await withStore(MEASUREMENTS_STORE_NAME, "readwrite", (store) =>
    store.put(pendingSave)
  );
  return pendingSave;
}

export async function removeQueuedMeasurementSave(id: string): Promise<void> {
  await withStore(MEASUREMENTS_STORE_NAME, "readwrite", (store) =>
    store.delete(id)
  );
}

export async function getQueuedMeasurementSaves(): Promise<
  PendingMeasurementSave[]
> {
  return withStore(MEASUREMENTS_STORE_NAME, "readonly", (store) =>
    store.getAll()
  );
}

export async function getQueuedMeasurementCount(): Promise<number> {
  return withStore(MEASUREMENTS_STORE_NAME, "readonly", (store) =>
    store.count()
  );
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function queueXOneQrImport(
  testSessionId: string,
  athleteId: string,
  qrUrl: string,
  error?: string
): Promise<PendingXOneQrImport> {
  const id = `${testSessionId}-${athleteId}-${stableHash(qrUrl)}`;
  const existing = await withStore<PendingXOneQrImport | undefined>(
    X_ONE_IMPORTS_STORE_NAME,
    "readonly",
    (store) => store.get(id)
  );
  const pendingImport: PendingXOneQrImport = {
    id,
    testSessionId,
    athleteId,
    qrUrl,
    createdAt: existing?.createdAt || new Date().toISOString(),
    attempts: existing?.attempts || 0,
    lastError: error || existing?.lastError,
  };

  await withStore(X_ONE_IMPORTS_STORE_NAME, "readwrite", (store) =>
    store.put(pendingImport)
  );
  return pendingImport;
}

export async function updateQueuedXOneQrImport(
  pendingImport: PendingXOneQrImport
): Promise<void> {
  await withStore(X_ONE_IMPORTS_STORE_NAME, "readwrite", (store) =>
    store.put(pendingImport)
  );
}

export async function removeQueuedXOneQrImport(id: string): Promise<void> {
  await withStore(X_ONE_IMPORTS_STORE_NAME, "readwrite", (store) =>
    store.delete(id)
  );
}

export async function getQueuedXOneQrImports(): Promise<PendingXOneQrImport[]> {
  return withStore(X_ONE_IMPORTS_STORE_NAME, "readonly", (store) =>
    store.getAll()
  );
}

export async function getQueuedXOneQrImportCount(): Promise<number> {
  return withStore(X_ONE_IMPORTS_STORE_NAME, "readonly", (store) =>
    store.count()
  );
}
