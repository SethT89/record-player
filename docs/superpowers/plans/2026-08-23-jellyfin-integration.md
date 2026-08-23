# Jellyfin Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth music source — a user's own Jellyfin media server — alongside Deezer, local files, and Subsonic, letting them connect once, browse by artist or search, and load albums into the existing playback pipeline unchanged.

**Architecture:** A `jellyfinConnection` module (login persistence via `localStorage`) backs a `jellyfin.js` API client, structured so every request funnels through one `buildApiUrl()` function and every response is parsed by a small, independently-testable pure function — the same shape as the existing `subsonic.js`/`subsonicConnection.js` pair. Two new modal components (`JellyfinConnectModal`, `JellyfinBrowseModal`) plug into the existing `SourceMenu` → `activeModal` pattern in `App.jsx`, terminating in the same `onAlbumSelected(tracks)` call every other source already uses.

**Tech Stack:** React 19, plain CSS, Vitest for unit tests. No new dependencies — unlike Subsonic, Jellyfin's auth needs no hand-rolled hashing, just a login POST.

**API verified live against `https://demo.jellyfin.org/stable`** (username `demo`, blank password) during planning — every endpoint shape below (auth response, `/Artists`, `/Items` with `ArtistIds`/`searchTerm`/`ParentId`, `/Items/{id}/Images/Primary`, `/Audio/{id}/stream`) was exercised with real `curl` requests, not assumed from docs. CORS is wide open (`access-control-allow-origin: *`, including on the `AuthenticateByName` preflight), confirming this server works for live verification in Task 6.

---

### Task 1: Jellyfin connection persistence

**Files:**
- Create: `src/api/jellyfinConnection.js`
- Test: `src/api/jellyfinConnection.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/api/jellyfinConnection.test.js`:

```js
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  generateDeviceId,
  saveConnection,
  loadConnection,
  clearConnection,
} from "./jellyfinConnection";

describe("generateDeviceId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateDeviceId()).toBe("string");
    expect(generateDeviceId().length).toBeGreaterThan(0);
  });

  it("generates a different id on each call", () => {
    expect(generateDeviceId()).not.toBe(generateDeviceId());
  });
});

describe("saveConnection / loadConnection / clearConnection", () => {
  const connection = {
    serverUrl: "https://jellyfin.example.com",
    userId: "user-1",
    accessToken: "token-1",
    deviceId: "device-1",
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a connection through localStorage", () => {
    saveConnection(connection);
    expect(loadConnection()).toEqual(connection);
  });

  it("returns null when nothing is saved", () => {
    expect(loadConnection()).toBeNull();
  });

  it("clearConnection removes the saved connection", () => {
    saveConnection(connection);
    clearConnection();
    expect(loadConnection()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './jellyfinConnection'`.

- [ ] **Step 3: Implement `src/api/jellyfinConnection.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests across all test files green.

- [ ] **Step 5: Commit**

```bash
git add src/api/jellyfinConnection.js src/api/jellyfinConnection.test.js
git commit -m "$(cat <<'EOF'
Add Jellyfin connection persistence

generateDeviceId gives each saved connection a stable per-browser device
id. save/load/clearConnection persist {serverUrl, userId, accessToken,
deviceId} to localStorage, same per-browser-isolation rationale as
subsonicConnection.js.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Jellyfin API client

**Files:**
- Create: `src/api/jellyfin.js`
- Test: `src/api/jellyfin.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/api/jellyfin.test.js`. Fixture shapes below are trimmed to the fields the parse functions actually read, but match real response shapes confirmed against `demo.jellyfin.org` during planning (e.g. albums carry `AlbumArtist` as a plain string, tracks carry `Album`/`AlbumId`/`AlbumArtist`, and everything is wrapped in `{ Items: [...] }`):

```js
import { describe, it, expect } from "vitest";
import {
  buildApiUrl,
  parseArtistsResponse,
  parseAlbumsResponse,
  parseAlbumTracksResponse,
  getCoverArtUrl,
  getStreamUrl,
} from "./jellyfin";

const connection = {
  serverUrl: "https://jellyfin.example.com",
  userId: "user-1",
  accessToken: "token-1",
  deviceId: "device-1",
};

describe("buildApiUrl", () => {
  it("includes the api_key auth param", () => {
    const url = buildApiUrl(connection, "/Artists");
    expect(url).toContain("https://jellyfin.example.com/Artists?");
    expect(url).toContain("api_key=token-1");
  });

  it("strips a trailing slash from serverUrl instead of producing a double slash", () => {
    const trailing = { ...connection, serverUrl: "https://jellyfin.example.com/" };
    const url = buildApiUrl(trailing, "/Artists");
    expect(url).toContain("https://jellyfin.example.com/Artists?");
    expect(url).not.toContain("com//Artists");
  });

  it("merges in extra params", () => {
    const url = buildApiUrl(connection, "/Items", { ParentId: "abc" });
    expect(url).toContain("ParentId=abc");
  });
});

describe("parseArtistsResponse", () => {
  it("maps Items into a plain artist list", () => {
    const body = {
      Items: [
        { Id: "1", Name: "ABBA" },
        { Id: "2", Name: "Beatles" },
      ],
    };
    expect(parseArtistsResponse(body)).toEqual([
      { id: "1", name: "ABBA" },
      { id: "2", name: "Beatles" },
    ]);
  });

  it("returns an empty array when there are no artists", () => {
    expect(parseArtistsResponse({})).toEqual([]);
  });
});

describe("parseAlbumsResponse", () => {
  it("maps Items into a plain album list, keyed off each item's own id for cover art", () => {
    const body = {
      Items: [{ Id: "10", Name: "Arrival", AlbumArtist: "ABBA" }],
    };
    expect(parseAlbumsResponse(body, connection)).toEqual([
      {
        id: "10",
        title: "Arrival",
        artist: "ABBA",
        coverArt: getCoverArtUrl(connection, "10"),
      },
    ]);
  });

  it("returns an empty array when there are no albums", () => {
    expect(parseAlbumsResponse({}, connection)).toEqual([]);
  });
});

describe("getCoverArtUrl / getStreamUrl", () => {
  it("builds a cover art URL for a given item id", () => {
    const url = getCoverArtUrl(connection, "item-1");
    expect(url).toContain("/Items/item-1/Images/Primary");
    expect(url).toContain("api_key=token-1");
  });

  it("returns undefined when there's no item id", () => {
    expect(getCoverArtUrl(connection, undefined)).toBeUndefined();
  });

  it("builds a stream URL for a given item id, requesting the original file", () => {
    const url = getStreamUrl(connection, "item-1");
    expect(url).toContain("/Audio/item-1/stream");
    expect(url).toContain("static=true");
    expect(url).toContain("api_key=token-1");
  });
});

describe("parseAlbumTracksResponse", () => {
  it("maps an album's Items into the app's standard track shape", () => {
    const body = {
      Items: [
        {
          Id: "100",
          Name: "When I Kissed the Teacher",
          Album: "Arrival",
          AlbumId: "10",
          AlbumArtist: "ABBA",
        },
        {
          Id: "101",
          Name: "Dancing Queen",
          Album: "Arrival",
          AlbumId: "10",
          AlbumArtist: "ABBA",
        },
      ],
    };
    const result = parseAlbumTracksResponse(body, connection);

    expect(result.title).toBe("Arrival");
    expect(result.coverArt).toBe(getCoverArtUrl(connection, "10"));
    expect(result.tracks).toEqual([
      {
        title: "When I Kissed the Teacher",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "100"),
        coverArt: getCoverArtUrl(connection, "100"),
      },
      {
        title: "Dancing Queen",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "101"),
        coverArt: getCoverArtUrl(connection, "101"),
      },
    ]);
  });

  it("returns an empty tracks array and no title/coverArt when the album has no tracks", () => {
    expect(parseAlbumTracksResponse({}, connection)).toEqual({
      title: undefined,
      coverArt: undefined,
      tracks: [],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './jellyfin'`.

- [ ] **Step 3: Implement `src/api/jellyfin.js`**

```js
const CLIENT_NAME = "RecordPlayer";
const CLIENT_VERSION = "1.0.0";

/*
  jellyfin
  --------
  The Jellyfin API client. Every request funnels through buildApiUrl —
  the one seam that would need to change if a CORS relay is ever added
  in front of direct browser-to-server calls; nothing else in this file
  or its callers would need to know.

  Unlike Subsonic, auth is a single login call (authenticate) rather than
  a locally-derived token, and the resulting accessToken travels as the
  api_key query param on every subsequent request — verified to work for
  both fetch() JSON calls and direct <img>/<audio> src URLs against a
  live Jellyfin server (demo.jellyfin.org) during planning.

  Each fetch-based function (getArtists, getArtistAlbums, searchAlbums,
  getAlbumTracks) is a thin wrapper around jellyfinFetch plus one of the
  parse*Response functions below. Those parse functions are pure — given
  an already-decoded JSON body, they don't touch the network — so they're
  unit-tested directly with fixture data instead of live requests.
*/
export function buildApiUrl(connection, path, params = {}) {
  const base = connection.serverUrl.replace(/\/+$/, "");
  const query = new URLSearchParams({
    api_key: connection.accessToken,
    ...params,
  });
  return `${base}${path}?${query.toString()}`;
}

async function jellyfinFetch(connection, path, params = {}) {
  const url = buildApiUrl(connection, path, params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Jellyfin server returned ${response.status}.`);
  }
  return response.json();
}

export function parseArtistsResponse(body) {
  const items = body.Items ?? [];
  return items.map((item) => ({ id: item.Id, name: item.Name }));
}

export function getCoverArtUrl(connection, itemId) {
  if (!itemId) return undefined;
  return buildApiUrl(connection, `/Items/${itemId}/Images/Primary`);
}

export function getStreamUrl(connection, itemId) {
  return buildApiUrl(connection, `/Audio/${itemId}/stream`, { static: "true" });
}

export function parseAlbumsResponse(body, connection) {
  const items = body.Items ?? [];
  return items.map((item) => ({
    id: item.Id,
    title: item.Name,
    artist: item.AlbumArtist,
    coverArt: getCoverArtUrl(connection, item.Id),
  }));
}

export function parseAlbumTracksResponse(body, connection) {
  const items = body.Items ?? [];
  const first = items[0];
  const albumCoverArt = first ? getCoverArtUrl(connection, first.AlbumId) : undefined;
  const tracks = items.map((item) => ({
    title: item.Name,
    album: item.Album,
    artist: item.AlbumArtist,
    previewUrl: getStreamUrl(connection, item.Id),
    coverArt: getCoverArtUrl(connection, item.Id),
  }));
  return { title: first?.Album, coverArt: albumCoverArt, tracks };
}

/*
  authenticate
  ------------
  Logs in via POST /Users/AuthenticateByName. Doesn't go through
  buildApiUrl/jellyfinFetch since there's no token yet to attach — this is
  the one call that produces the token instead of consuming it. Throws on
  any non-2xx response (401 for wrong credentials, etc.); callers
  distinguish that from a network-level failure the same way
  SubsonicConnectModal already does.
*/
export async function authenticate(serverUrl, username, password, deviceId) {
  const base = serverUrl.replace(/\/+$/, "");
  const response = await fetch(`${base}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": `MediaBrowser Client="${CLIENT_NAME}", Device="Browser", DeviceId="${deviceId}", Version="${CLIENT_VERSION}"`,
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });
  if (response.status === 401) {
    throw new Error("Wrong username or password.");
  }
  if (!response.ok) {
    throw new Error("Couldn't find a Jellyfin server at that address.");
  }
  const body = await response.json();
  return { userId: body.User.Id, accessToken: body.AccessToken };
}

export async function getArtists(connection) {
  const body = await jellyfinFetch(connection, "/Artists", {
    userId: connection.userId,
  });
  return parseArtistsResponse(body);
}

export async function getArtistAlbums(connection, artistId) {
  const body = await jellyfinFetch(connection, "/Items", {
    userId: connection.userId,
    IncludeItemTypes: "MusicAlbum",
    Recursive: "true",
    ArtistIds: artistId,
  });
  return parseAlbumsResponse(body, connection);
}

export async function searchAlbums(connection, query) {
  const body = await jellyfinFetch(connection, "/Items", {
    userId: connection.userId,
    IncludeItemTypes: "MusicAlbum",
    Recursive: "true",
    searchTerm: query,
  });
  return parseAlbumsResponse(body, connection);
}

export async function getAlbumTracks(connection, albumId) {
  const body = await jellyfinFetch(connection, "/Items", {
    userId: connection.userId,
    ParentId: albumId,
    SortBy: "IndexNumber",
    SortOrder: "Ascending",
  });
  return parseAlbumTracksResponse(body, connection);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no warnings or errors.

- [ ] **Step 6: Commit**

```bash
git add src/api/jellyfin.js src/api/jellyfin.test.js
git commit -m "$(cat <<'EOF'
Add Jellyfin API client

authenticate/getArtists/getArtistAlbums/searchAlbums/getAlbumTracks, each
a thin fetch wrapper (or, for authenticate, the login call itself) around
a pure, independently-tested parse*Response function. Every read request
funnels through one buildApiUrl(). Endpoint shapes and params (Items
wrapper, ArtistIds/searchTerm/ParentId filters, api_key auth) verified
live against demo.jellyfin.org during planning.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `JellyfinConnectModal`

**Files:**
- Create: `src/components/JellyfinConnectModal.jsx`
- Create: `src/components/JellyfinConnectModal.css`

No automated tests for this task — matches this project's existing convention (only pure logic in `src/api`/`src/player` is unit-tested; React components are verified manually in-browser). Task 6 covers manual verification.

- [ ] **Step 1: Create `JellyfinConnectModal.css`**

```css
.jellyfin-connect-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
  box-sizing: border-box;
}

.jellyfin-connect-modal {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  background: #1c1d1f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.jellyfin-connect-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.jellyfin-connect-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #9a9a9a;
  font-size: 13px;
}

.jellyfin-connect-input {
  background: #101112;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px 14px;
  color: #e5e5e5;
  font-size: 16px;
}

.jellyfin-connect-input:focus-visible {
  outline: 2px solid #e5e5e5;
  outline-offset: 1px;
}

.jellyfin-connect-submit {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  padding: 12px 18px;
  color: #e5e5e5;
  font-size: 16px;
  cursor: pointer;
}

.jellyfin-connect-submit:hover {
  background: rgba(255, 255, 255, 0.14);
}

.jellyfin-connect-submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.jellyfin-connect-status {
  margin: 12px 0 0;
  font-size: 13px;
  color: #9a9a9a;
}

.jellyfin-connect-status--error {
  color: #e28a8a;
}
```

- [ ] **Step 2: Create `JellyfinConnectModal.jsx`**

```jsx
import { useState } from "react";
import { generateDeviceId, saveConnection } from "../api/jellyfinConnection";
import { authenticate } from "../api/jellyfin";
import "./JellyfinConnectModal.css";

/*
  JellyfinConnectModal
  ---------------------
  One-time setup form for a Jellyfin server connection. Validates via
  authenticate() before saving — a bad URL/credentials never gets
  persisted.

  Props:
    - onClose: function — invoked when the scrim is clicked.
    - onConnected: function(connection) — invoked once authenticate()
        succeeds and the connection has been saved to localStorage.
*/
export function JellyfinConnectModal({ onClose, onConnected }) {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | connecting | error
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!serverUrl.trim() || !username.trim()) return;

    setStatus("connecting");
    setErrorMessage("");
    const trimmedUrl = serverUrl.trim();
    const deviceId = generateDeviceId();

    try {
      const { userId, accessToken } = await authenticate(
        trimmedUrl,
        username.trim(),
        password,
        deviceId
      );
      const connection = { serverUrl: trimmedUrl, userId, accessToken, deviceId };
      saveConnection(connection);
      onConnected(connection);
    } catch (error) {
      setStatus("error");
      if (error instanceof TypeError) {
        setErrorMessage(
          "Couldn't reach that server. If it's self-hosted, make sure it allows requests from this site (CORS)."
        );
      } else if (error instanceof SyntaxError) {
        setErrorMessage("Couldn't find a Jellyfin server at that address.");
      } else {
        setErrorMessage(error.message);
      }
    }
  };

  return (
    <div className="jellyfin-connect-scrim" onClick={onClose}>
      <div
        className="jellyfin-connect-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Connect to a Jellyfin server"
        onClick={(event) => event.stopPropagation()}
      >
        <form className="jellyfin-connect-form" onSubmit={handleSubmit}>
          <label className="jellyfin-connect-label">
            Server URL
            <input
              type="url"
              className="jellyfin-connect-input"
              placeholder="https://jellyfin.example.com"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              autoFocus
            />
          </label>
          <label className="jellyfin-connect-label">
            Username
            <input
              type="text"
              className="jellyfin-connect-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="jellyfin-connect-label">
            Password
            <input
              type="password"
              className="jellyfin-connect-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="jellyfin-connect-submit"
            disabled={status === "connecting"}
          >
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
        </form>

        {status === "error" && (
          <p className="jellyfin-connect-status jellyfin-connect-status--error">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS on both.

- [ ] **Step 4: Commit**

```bash
git add src/components/JellyfinConnectModal.jsx src/components/JellyfinConnectModal.css
git commit -m "$(cat <<'EOF'
Add JellyfinConnectModal

Server URL/username/password form, validated via authenticate() before
saving. Distinguishes network/CORS failures, wrong credentials, and
invalid URLs into three separate error messages, mirroring
SubsonicConnectModal. Not wired into App yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `JellyfinBrowseModal`

**Files:**
- Create: `src/components/JellyfinBrowseModal.jsx`
- Create: `src/components/JellyfinBrowseModal.css`

No automated tests for this task, same rationale as Task 3.

- [ ] **Step 1: Create `JellyfinBrowseModal.css`**

```css
.jellyfin-browse-scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
  box-sizing: border-box;
}

.jellyfin-browse-modal {
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #1c1d1f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.jellyfin-browse-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.jellyfin-browse-tab {
  background: none;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  color: #9a9a9a;
  font-size: 14px;
  cursor: pointer;
}

.jellyfin-browse-tab--active {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e5e5;
}

.jellyfin-browse-change-server {
  margin-left: auto;
  background: none;
  border: none;
  color: #9a9a9a;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.jellyfin-browse-search-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.jellyfin-browse-search-input {
  flex: 1;
  min-width: 0;
  background: #101112;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px 14px;
  color: #e5e5e5;
  font-size: 16px;
}

.jellyfin-browse-search-input:focus-visible {
  outline: 2px solid #e5e5e5;
  outline-offset: 1px;
}

.jellyfin-browse-search-submit {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  padding: 12px 18px;
  color: #e5e5e5;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.jellyfin-browse-search-submit:hover {
  background: rgba(255, 255, 255, 0.14);
}

.jellyfin-browse-status {
  margin: 0 0 12px;
  font-size: 13px;
  color: #9a9a9a;
}

.jellyfin-browse-status--error {
  color: #e28a8a;
}

.jellyfin-browse-back {
  align-self: flex-start;
  background: none;
  border: none;
  color: #9a9a9a;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 8px;
  padding: 4px 0;
}

.jellyfin-browse-list,
.jellyfin-browse-results {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.jellyfin-browse-list-item {
  width: 100%;
  display: block;
  background: none;
  border: none;
  border-radius: 6px;
  padding: 12px 8px;
  color: #e5e5e5;
  font-size: 16px;
  cursor: pointer;
  text-align: left;
}

.jellyfin-browse-list-item:hover,
.jellyfin-browse-list-item:focus-visible {
  background: rgba(255, 255, 255, 0.06);
}

.jellyfin-browse-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: none;
  border: none;
  border-radius: 6px;
  padding: 10px 8px;
  cursor: pointer;
  text-align: left;
}

.jellyfin-browse-result:hover,
.jellyfin-browse-result:focus-visible {
  background: rgba(255, 255, 255, 0.06);
}

.jellyfin-browse-result__title {
  color: #e5e5e5;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jellyfin-browse-result__artist {
  color: #9a9a9a;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Create `JellyfinBrowseModal.jsx`**

```jsx
import { useEffect, useState } from "react";
import {
  getArtists,
  getArtistAlbums,
  searchAlbums,
  getAlbumTracks,
} from "../api/jellyfin";
import { clearConnection } from "../api/jellyfinConnection";
import "./JellyfinBrowseModal.css";

/*
  JellyfinBrowseModal
  ---------------------
  Two tabs: Browse (artist list -> that artist's albums) and Search
  (text query -> matching albums). Either path ends the same way —
  loading an album's tracks and handing them to onAlbumSelected, exactly
  like every other source's terminal step.

  Props:
    - connection: object — from jellyfinConnection's saveConnection/
        loadConnection.
    - onClose: function — invoked when the scrim is clicked.
    - onAlbumSelected: function(tracks) — same callback Deezer/local
        files/Subsonic already use to hand off to the player.
    - onChangeServer: function — invoked after this component clears the
        saved connection, so the parent can show the connect form again.
*/
export function JellyfinBrowseModal({ connection, onClose, onAlbumSelected, onChangeServer }) {
  const [tab, setTab] = useState("browse"); // browse | search
  const [artists, setArtists] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [albums, setAlbums] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | loading-album | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (tab !== "browse" || artists !== null) return;
    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");
    getArtists(connection)
      .then((result) => {
        if (cancelled) return;
        setArtists(result);
        setStatus("idle");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, artists, connection]);

  const handleSelectArtist = async (artist) => {
    setSelectedArtist(artist);
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await getArtistAlbums(connection, artist.id);
      setAlbums(result);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  const handleBackToArtists = () => {
    setSelectedArtist(null);
    setAlbums(null);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const results = await searchAlbums(connection, query.trim());
      setSearchResults(results);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  const handleSelectAlbum = async (albumId) => {
    setStatus("loading-album");
    setErrorMessage("");
    try {
      const album = await getAlbumTracks(connection, albumId);
      if (album.tracks.length === 0) {
        throw new Error("That album has no tracks.");
      }
      onAlbumSelected(album.tracks);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  const handleChangeServer = () => {
    clearConnection();
    onChangeServer();
  };

  return (
    <div className="jellyfin-browse-scrim" onClick={onClose}>
      <div
        className="jellyfin-browse-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Browse your Jellyfin library"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="jellyfin-browse-tabs">
          <button
            type="button"
            className={`jellyfin-browse-tab${tab === "browse" ? " jellyfin-browse-tab--active" : ""}`}
            onClick={() => setTab("browse")}
          >
            Browse
          </button>
          <button
            type="button"
            className={`jellyfin-browse-tab${tab === "search" ? " jellyfin-browse-tab--active" : ""}`}
            onClick={() => setTab("search")}
          >
            Search
          </button>
          <button
            type="button"
            className="jellyfin-browse-change-server"
            onClick={handleChangeServer}
          >
            Change Server
          </button>
        </div>

        {tab === "search" && (
          <form className="jellyfin-browse-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="jellyfin-browse-search-input"
              placeholder="Search your library…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
            <button type="submit" className="jellyfin-browse-search-submit">
              Search
            </button>
          </form>
        )}

        {status === "loading" && <p className="jellyfin-browse-status">Loading…</p>}
        {status === "loading-album" && (
          <p className="jellyfin-browse-status">Loading album…</p>
        )}
        {status === "error" && (
          <p className="jellyfin-browse-status jellyfin-browse-status--error">
            {errorMessage}
          </p>
        )}

        {tab === "browse" && selectedArtist && (
          <button type="button" className="jellyfin-browse-back" onClick={handleBackToArtists}>
            ← {selectedArtist.name}
          </button>
        )}

        {tab === "browse" && !selectedArtist && artists && (
          <ul className="jellyfin-browse-list">
            {artists.map((artist) => (
              <li key={artist.id}>
                <button
                  type="button"
                  className="jellyfin-browse-list-item"
                  onClick={() => handleSelectArtist(artist)}
                >
                  {artist.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "browse" && selectedArtist && albums && (
          <ul className="jellyfin-browse-results">
            {albums.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  className="jellyfin-browse-result"
                  onClick={() => handleSelectAlbum(album.id)}
                >
                  <span className="jellyfin-browse-result__title">{album.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "search" && searchResults && (
          <ul className="jellyfin-browse-results">
            {searchResults.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  className="jellyfin-browse-result"
                  onClick={() => handleSelectAlbum(album.id)}
                >
                  <span className="jellyfin-browse-result__title">{album.title}</span>
                  <span className="jellyfin-browse-result__artist">{album.artist}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS on both.

- [ ] **Step 4: Commit**

```bash
git add src/components/JellyfinBrowseModal.jsx src/components/JellyfinBrowseModal.css
git commit -m "$(cat <<'EOF'
Add JellyfinBrowseModal

Browse (artist -> albums) and Search tabs, both terminating in the same
onAlbumSelected(tracks) handoff every other source already uses. Change
Server clears the saved connection and hands control back to the parent.
Not wired into App yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire Jellyfin into `SourceMenu` and `App.jsx`

**Files:**
- Modify: `src/components/SourceMenu.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the fourth option to `SourceMenu`**

Replace the full contents of `src/components/SourceMenu.jsx` with:

```jsx
import "./SourceMenu.css";

/*
  SourceMenu
  ----------
  The first thing you see when clicking the record or the now-playing
  display: a choice of where to load music from. "Demo Songs" opens
  the existing album search. "My Files" opens a native folder picker
  (browser-native, not our own UI) — audio files found in the folder
  become the new track list, playable the same way as a Deezer album.
  "Subsonic Library" and "Jellyfin Library" each connect to (or, if
  already connected, browse) a user's own self-hosted music server.
*/
export function SourceMenu({
  onClose,
  onSelectFiles,
  onSelectDeezer,
  onSelectSubsonic,
  onSelectJellyfin,
}) {
  return (
    <div className="source-menu-scrim" onClick={onClose}>
      <div
        className="source-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a music source"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="source-menu__option" onClick={onSelectFiles}>
          <span className="source-menu__option-title">My Files</span>
          <span className="source-menu__option-subtitle">Pick a Folder</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectDeezer}>
          <span className="source-menu__option-title">Demo Songs</span>
          <span className="source-menu__option-subtitle">Free</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectSubsonic}>
          <span className="source-menu__option-title">Subsonic Library</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectJellyfin}>
          <span className="source-menu__option-title">Jellyfin Library</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add imports to `App.jsx`**

Change:

```js
import { SubsonicConnectModal } from "./components/SubsonicConnectModal";
import { SubsonicBrowseModal } from "./components/SubsonicBrowseModal";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import { readTrackMetadata } from "./api/localMetadata";
import { loadConnection } from "./api/subsonicConnection";
import "./App.css";
```

to:

```js
import { SubsonicConnectModal } from "./components/SubsonicConnectModal";
import { SubsonicBrowseModal } from "./components/SubsonicBrowseModal";
import { JellyfinConnectModal } from "./components/JellyfinConnectModal";
import { JellyfinBrowseModal } from "./components/JellyfinBrowseModal";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import { readTrackMetadata } from "./api/localMetadata";
import { loadConnection as loadSubsonicConnection } from "./api/subsonicConnection";
import { loadConnection as loadJellyfinConnection } from "./api/jellyfinConnection";
import "./App.css";
```

- [ ] **Step 3: Update the `loadConnection` call site for Subsonic to use its renamed import**

Change:

```js
  const handleSelectSubsonic = () => {
    const existing = loadConnection();
```

to:

```js
  const handleSelectSubsonic = () => {
    const existing = loadSubsonicConnection();
```

- [ ] **Step 4: Add `jellyfinConnection` state and update the `activeModal` comment**

Change:

```js
  // null | "source" | "deezer" | "subsonic-connect" | "subsonic-browse"
  const [activeModal, setActiveModal] = useState(null);
  const [subsonicConnection, setSubsonicConnection] = useState(null);
  const audioRef = useRef(null);
```

to:

```js
  // null | "source" | "deezer" | "subsonic-connect" | "subsonic-browse"
  // | "jellyfin-connect" | "jellyfin-browse"
  const [activeModal, setActiveModal] = useState(null);
  const [subsonicConnection, setSubsonicConnection] = useState(null);
  const [jellyfinConnection, setJellyfinConnection] = useState(null);
  const audioRef = useRef(null);
```

- [ ] **Step 5: Add the Jellyfin handlers**

Change:

```js
  const handleChangeServer = () => {
    setSubsonicConnection(null);
    setActiveModal("subsonic-connect");
  };
```

to:

```js
  const handleChangeServer = () => {
    setSubsonicConnection(null);
    setActiveModal("subsonic-connect");
  };

  const handleSelectJellyfin = () => {
    const existing = loadJellyfinConnection();
    if (existing) {
      setJellyfinConnection(existing);
      setActiveModal("jellyfin-browse");
    } else {
      setActiveModal("jellyfin-connect");
    }
  };

  const handleJellyfinConnected = (connection) => {
    setJellyfinConnection(connection);
    setActiveModal("jellyfin-browse");
  };

  const handleChangeJellyfinServer = () => {
    setJellyfinConnection(null);
    setActiveModal("jellyfin-connect");
  };
```

- [ ] **Step 6: Render the new option and modals**

Change:

```jsx
      {activeModal === "source" && (
        <SourceMenu
          onClose={() => setActiveModal(null)}
          onSelectDeezer={handleSelectDeezer}
          onSelectFiles={handleSelectFiles}
          onSelectSubsonic={handleSelectSubsonic}
        />
      )}
```

to:

```jsx
      {activeModal === "source" && (
        <SourceMenu
          onClose={() => setActiveModal(null)}
          onSelectDeezer={handleSelectDeezer}
          onSelectFiles={handleSelectFiles}
          onSelectSubsonic={handleSelectSubsonic}
          onSelectJellyfin={handleSelectJellyfin}
        />
      )}
```

Change:

```jsx
      {activeModal === "subsonic-browse" && subsonicConnection && (
        <SubsonicBrowseModal
          connection={subsonicConnection}
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
          onChangeServer={handleChangeServer}
        />
      )}
```

to:

```jsx
      {activeModal === "subsonic-browse" && subsonicConnection && (
        <SubsonicBrowseModal
          connection={subsonicConnection}
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
          onChangeServer={handleChangeServer}
        />
      )}
      {activeModal === "jellyfin-connect" && (
        <JellyfinConnectModal
          onClose={() => setActiveModal(null)}
          onConnected={handleJellyfinConnected}
        />
      )}
      {activeModal === "jellyfin-browse" && jellyfinConnection && (
        <JellyfinBrowseModal
          connection={jellyfinConnection}
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
          onChangeServer={handleChangeJellyfinServer}
        />
      )}
```

- [ ] **Step 7: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS on both.

- [ ] **Step 8: Commit**

```bash
git add src/components/SourceMenu.jsx src/App.jsx
git commit -m "$(cat <<'EOF'
Wire Jellyfin into SourceMenu and the player

"Jellyfin Library" opens the connect form on first use, or jumps
straight to browsing if a connection is already saved — same pattern as
Subsonic. Reuses handleAlbumSelected unchanged — Jellyfin tracks feed
into the same loadAlbum(tracks) call every other source already uses.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Manual verification against demo.jellyfin.org

**Files:** none (verification only)

- [ ] **Step 1: Confirm the unit test suite and lint are clean end-to-end**

Run: `npm test && npm run lint`
Expected: PASS on both — exercises `jellyfinConnection` and `jellyfin.js`'s pure functions one more time as a full-suite sanity check before moving to manual UI verification.

- [ ] **Step 2: Start the dev server preview**

Use the `preview_start` tool with `{"name": "record-player-dev"}`.

- [ ] **Step 3: Verify the SourceMenu option and connect form render**

Click the record (or the now-playing display) to open `SourceMenu`. Confirm "Jellyfin Library" appears as a fourth option alongside "My Files", "Demo Songs", and "Subsonic Library". Click it — since no connection is saved yet, confirm `JellyfinConnectModal` opens with Server URL / Username / Password fields and a "Connect" button.

- [ ] **Step 4: Verify connection error handling**

Submit the form with a URL that doesn't resolve to anything reachable (e.g. `https://localhost:9`) and any username/password. Confirm an error message appears and the form stays open. Then try a syntactically-valid but non-Jellyfin URL (e.g. this app's own dev server URL) and confirm a distinct "couldn't find a Jellyfin server" style message appears. Then try `https://demo.jellyfin.org/stable` with username `demo` and an obviously wrong password (e.g. `wrongpassword`) and confirm the "Wrong username or password" message appears.

- [ ] **Step 5: Verify a real end-to-end connection against demo.jellyfin.org**

Connect with Server URL `https://demo.jellyfin.org/stable`, username `demo`, and a **blank password field** (confirmed during planning: this demo account has no password set). Confirm it lands on `JellyfinBrowseModal` with the Browse tab showing an artist list (e.g. "Binaerpilot", "Joshua Boniface", "Leap Fidei"). Click an artist with albums (e.g. "Leap Fidei") and confirm their albums appear (e.g. "Nemesis"). Click an album and confirm its tracks load into the player — vinyl art updates, now-playing display updates, Play works, and audio actually plays (this demo server serves real short demo tracks). Then switch to the Search tab, search for a term that matches an album (e.g. "nem"), confirm matching results appear, and confirm selecting one also loads and plays correctly.

- [ ] **Step 6: Verify "Change Server"**

From `JellyfinBrowseModal`, click "Change Server". Confirm it returns to `JellyfinConnectModal`, and confirm (via `localStorage.getItem('jellyfinConnection')` in the browser console, or the `javascript_tool`) that the saved connection was actually cleared.

- [ ] **Step 7: Verify the saved-connection shortcut**

After connecting once, close the modal, reopen `SourceMenu`, and click "Jellyfin Library" again. Confirm it goes straight to `JellyfinBrowseModal` (skipping the connect form), since a connection is now saved.

- [ ] **Step 8: Verify Subsonic still works unaffected**

Since `App.jsx` was modified to add Jellyfin state/handlers alongside the existing Subsonic ones, do a quick smoke check: open `SourceMenu`, confirm "Subsonic Library" is still present and unchanged, and confirm its existing behavior (connect-or-browse based on saved connection) wasn't disturbed by the Task 5 edits.

- [ ] **Step 9: Check the console for errors**

Use `read_console_messages` with `onlyErrors: true` across all the steps above. Expected: no errors beyond the deliberately-triggered connection failures from Step 4.

- [ ] **Step 10: Report results to the user**

Summarize what was verified, confirm the full connect → browse → search → play flow worked end-to-end against the live demo server, and note anything that didn't match the spec before considering the feature done.
