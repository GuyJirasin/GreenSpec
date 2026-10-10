import { db, configured, checked } from './api';

let entering;
// Keep creation single-flight within a tab; Web Locks also serialize entry across tabs.
export function enterGuest() {
  if (entering) return entering;
  const enter = async () => {
    if (!configured) throw new Error('The service is not connected yet. Please try again later.');
    const probe = 'greenspec:storage-check';
    try { localStorage.setItem(probe, '1'); localStorage.removeItem(probe); }
    catch { throw new Error('Allow this website to save browser data so we can remember your account.'); }
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    // Retain existing permanent accounts too; never replace a signed-in user's identity.
    if (data.session) return data.session;
    const result = await checked(db.auth.signInAnonymously());
    if (!result.session) throw new Error('We could not open your account. Please try again.');
    return result.session;
  };
  entering = (navigator.locks ? navigator.locks.request('greenspec:guest-entry', enter) : enter())
    .finally(() => { entering = null; });
  return entering;
}
