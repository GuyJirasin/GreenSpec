import { db, configured, checked } from './api';

let entering;
// Keep creation single-flight within a tab; Web Locks also serialize entry across tabs.
export function enterGuest() {
  if (entering) return entering;
  const enter = async () => {
    const probe = 'greenspec:storage-check';
    try { localStorage.setItem(probe, '1'); localStorage.removeItem(probe); }
    catch { throw new Error('Allow this website to save browser data so we can remember your account.'); }

    if (configured && db) {
      try {
        const { data, error } = await db.auth.getSession();
        if (!error && data?.session) return data.session;
        const result = await checked(db.auth.signInAnonymously());
        if (result?.session) return result.session;
      } catch {
        // Fallback to local demo session if cloud is unreachable
      }
    }

    // Local demo / bypass session fallback
    let guestId = localStorage.getItem('greenspec:demo-guest-id');
    if (!guestId) {
      guestId = crypto.randomUUID().slice(0, 8);
      localStorage.setItem('greenspec:demo-guest-id', guestId);
    }
    return {
      user: {
        id: `guest-${guestId}`,
        is_anonymous: true,
        email: `guest-${guestId}@greenspec.demo`
      }
    };
  };
  entering = (navigator.locks ? navigator.locks.request('greenspec:guest-entry', enter) : enter())
    .finally(() => { entering = null; });
  return entering;
}
