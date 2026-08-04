import { localAdapter } from './localAdapter';
import type { StorageAdapter } from './types';

/**
 * The single place that decides which adapter the whole app talks to.
 *
 * Today there is exactly one: localStorage. When a cloud adapter lands, this
 * function is the only thing that changes — return `firebaseAdapter` when the
 * user is signed in, `localAdapter` otherwise. Nothing downstream needs to know.
 */
function selectAdapter(): StorageAdapter {
  return localAdapter;
}

export const storage: StorageAdapter = selectAdapter();

export { clearAllLocalData } from './localAdapter';
export * from './types';
// `useCollection` intentionally lives one import away (./useCollection) so this
// module stays free of cycles: the hook depends on the adapter, never the
// reverse.
