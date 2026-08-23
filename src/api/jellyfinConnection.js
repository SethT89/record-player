const STORAGE_KEY = "jellyfinConnection";

/*
  jellyfinConnection
  -------------------
  Owns Jellyfin connection persistence. Unlike Subsonic, there's no local
  salt/token derivation here — the connection is the result of a
  successful login (see jellyfin.js's authenticate()), so this module only
  handles generating a stable per-connection device id and the
  localStorage round-trip.

  Persistence is plain localStorage, same rationale as subsonicConnection:
  this app has no backend and no user accounts, so "remember this for
  next time" only ever needs to mean "remember it in this browser."
*/
export function generateDeviceId() {
  return crypto.randomUUID();
}

export function saveConnection(connection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
}

export function loadConnection() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearConnection() {
  localStorage.removeItem(STORAGE_KEY);
}
