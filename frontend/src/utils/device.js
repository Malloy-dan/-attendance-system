import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedFingerprint = null;

/**
 * Generates a stable hash of this browser/device. Combined with the
 * server-side unique constraint on (event, device_fingerprint), this is
 * what actually stops one phone from registering twice — the localStorage
 * flag below is just a fast, no-network shortcut for the common case.
 */
export async function getDeviceFingerprint() {
  if (cachedFingerprint) return cachedFingerprint;
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedFingerprint = result.visitorId;
  return cachedFingerprint;
}

function storageKey(eventSlug) {
  return `attendance:registered:${eventSlug}`;
}

export function getLocalRegistration(eventSlug) {
  const raw = localStorage.getItem(storageKey(eventSlug));
  return raw ? JSON.parse(raw) : null;
}

export function saveLocalRegistration(eventSlug, registration) {
  localStorage.setItem(
    storageKey(eventSlug),
    JSON.stringify({ registeredAt: new Date().toISOString(), ...registration })
  );
}
