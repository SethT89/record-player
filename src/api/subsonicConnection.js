import { md5 } from "./md5";

const STORAGE_KEY = "subsonicConnection";

function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/*
  subsonicConnection
  -------------------
  Owns Subsonic credential handling. createConnection never returns or
  stores the raw password — only the salt and the derived token, which is
  all any subsequent API call needs to authenticate (see subsonic.js).

  Persistence is plain localStorage: this app has no backend and no user
  accounts, so "keep this saved for next time" only ever needs to mean
  "remember it in this browser," which localStorage already provides for
  free, isolated per browser/device with no extra infrastructure.
*/
export function createConnection(serverUrl, username, password) {
  const salt = generateSalt();
  const token = md5(password + salt);
  return { serverUrl, username, salt, token };
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
