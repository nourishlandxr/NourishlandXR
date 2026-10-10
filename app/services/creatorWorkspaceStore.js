const DB_NAME = 'nourishland-creator-field-v1';
let databasePromise;
function database() {
    if (!globalThis.indexedDB) return Promise.reject(new Error('Local field storage is unavailable in this browser.'));
    if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore('packages', { keyPath: 'projectId' });
            db.createObjectStore('operations', { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => { databasePromise = null; reject(request.error); };
    });
    return databasePromise;
}
async function transaction(store, mode, action) {
    const db = await database();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = action(tx.objectStore(store));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error || request.error);
        tx.onabort = () => reject(tx.error || new Error('Local field storage could not save the operation.'));
    });
}
export const loadFieldPackage = projectId => transaction('packages', 'readonly', store => store.get(projectId));
export const saveFieldPackage = value => transaction('packages', 'readwrite', store => store.put(value));
export const saveFieldOperation = value => transaction('operations', 'readwrite', store => store.put(value));
export const removeFieldOperation = id => transaction('operations', 'readwrite', store => store.delete(id));
export async function loadFieldOperations(projectId) {
    return (await transaction('operations', 'readonly', store => store.getAll())).filter(op => op.projectId === projectId).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
}
