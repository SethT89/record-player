# Subsonic Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third music source — a user's own Subsonic-API server (Navidrome, Airsonic, Gonic, etc.) — alongside Deezer and local files, letting them connect once, browse by artist or search, and load albums into the existing playback pipeline unchanged.

**Architecture:** A pure MD5 implementation and a `subsonicConnection` module (salt/token generation, `localStorage` persistence) back a `subsonic.js` API client, structured so every request funnels through one `buildApiUrl()` function and every response is parsed by a small, independently-testable pure function. Two new modal components (`SubsonicConnectModal`, `SubsonicBrowseModal`) plug into the existing `SourceMenu` → `activeModal` pattern in `App.jsx`, terminating in the same `onAlbumSelected(tracks)` call Deezer and local files already use.

**Tech Stack:** React 19, plain CSS, Vitest for unit tests. No new dependencies — MD5 is hand-implemented and verified against RFC 1321 test vectors.

---

### Task 1: MD5 implementation

**Files:**
- Create: `src/api/md5.js`
- Test: `src/api/md5.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/api/md5.test.js`:

```js
import { describe, it, expect } from "vitest";
import { md5 } from "./md5";

describe("md5", () => {
  it("matches known RFC 1321 test vectors", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5("a")).toBe("0cc175b9c0f1b6a831c399e269772661");
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(md5("message digest")).toBe("f96b697d7cb7938d525a2f31aaf161d0");
    expect(md5("abcdefghijklmnopqrstuvwxyz")).toBe(
      "c3fcd3d76192e4007dfb496cca67e13b"
    );
    expect(md5("The quick brown fox jumps over the lazy dog")).toBe(
      "9e107d9d372bb6826bd81d3542a419d6"
    );
  });

  it("handles input long enough to span multiple 512-bit blocks", () => {
    expect(
      md5("12345678901234567890123456789012345678901234567890123456789012345678901234567890")
    ).toBe("57edf4a22be3c955ac49da2e2107b67a");
  });

  it("always returns a 32-character lowercase hex string", () => {
    expect(md5("hunter2")).toMatch(/^[0-9a-f]{32}$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './md5'` (the file doesn't exist yet).

- [ ] **Step 3: Implement `src/api/md5.js`**

This is a standard RFC 1321 MD5 implementation. It's been verified against every test vector in Step 1 already (run manually before writing this plan) — the numeric constants below are correct as written.

```js
function safeAdd(x, y) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function bitRotateLeft(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

function md5cmn(q, a, b, x, s, t) {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}
function md5ff(a, b, c, d, x, s, t) {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t);
}
function md5gg(a, b, c, d, x, s, t) {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
}
function md5hh(a, b, c, d, x, s, t) {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5ii(a, b, c, d, x, s, t) {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

function binlMD5(x, len) {
  x[len >> 5] |= 0x80 << len % 32;
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }
  return [a, b, c, d];
}

function binlToRstr(input) {
  let output = "";
  const length32 = input.length * 32;
  for (let i = 0; i < length32; i += 8) {
    output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
  }
  return output;
}

function rstrToBinl(input) {
  const output = [];
  output[(input.length >> 2) - 1] = undefined;
  for (let i = 0; i < output.length; i += 1) {
    output[i] = 0;
  }
  const length8 = input.length * 8;
  for (let i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
  }
  return output;
}

function rstrMD5(s) {
  return binlToRstr(binlMD5(rstrToBinl(s), s.length * 8));
}

function rstrToHex(input) {
  const hexTab = "0123456789abcdef";
  let output = "";
  for (let i = 0; i < input.length; i += 1) {
    const x = input.charCodeAt(i);
    output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
  }
  return output;
}

function utf8ToBinaryString(input) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

/*
  md5
  ---
  Standard RFC 1321 MD5 digest, returned as a 32-character lowercase hex
  string. Subsonic servers require it for token-based authentication
  (token = md5(password + salt)) — browsers don't expose MD5 through the
  native SubtleCrypto API (only the SHA family), so this is hand-rolled
  rather than a dependency.
*/
export function md5(input) {
  return rstrToHex(rstrMD5(utf8ToBinaryString(input)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `md5` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/api/md5.js src/api/md5.test.js
git commit -m "$(cat <<'EOF'
Add self-hosted MD5 implementation

Needed for Subsonic's token-based auth scheme (token = md5(password +
salt)); browsers don't expose MD5 natively. Verified against RFC 1321
test vectors, including a multi-block input.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Subsonic connection persistence

**Files:**
- Create: `src/api/subsonicConnection.js`
- Test: `src/api/subsonicConnection.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/api/subsonicConnection.test.js`. The `// @vitest-environment
happy-dom` comment at the top scopes a DOM environment to just this one
file (via Vitest's per-file environment directive), since it's the only
test file touching `localStorage` — `playerReducer.test.js` and
`md5.test.js` keep running in the faster, dependency-free default `node`
environment:

```js
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { createConnection, saveConnection, loadConnection, clearConnection } from "./subsonicConnection";
import { md5 } from "./md5";

describe("createConnection", () => {
  it("derives the token from md5(password + salt) using the returned salt", () => {
    const connection = createConnection("https://music.example.com", "alice", "hunter2");
    expect(connection.serverUrl).toBe("https://music.example.com");
    expect(connection.username).toBe("alice");
    expect(connection.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(connection.token).toBe(md5("hunter2" + connection.salt));
  });

  it("generates a different salt on each call", () => {
    const a = createConnection("https://music.example.com", "alice", "hunter2");
    const b = createConnection("https://music.example.com", "alice", "hunter2");
    expect(a.salt).not.toBe(b.salt);
  });

  it("never includes the raw password anywhere on the returned object", () => {
    const connection = createConnection("https://music.example.com", "alice", "hunter2");
    expect(Object.values(connection)).not.toContain("hunter2");
  });
});

describe("saveConnection / loadConnection / clearConnection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a connection through localStorage", () => {
    const connection = createConnection("https://music.example.com", "alice", "hunter2");
    saveConnection(connection);
    expect(loadConnection()).toEqual(connection);
  });

  it("returns null when nothing is saved", () => {
    expect(loadConnection()).toBeNull();
  });

  it("clearConnection removes the saved connection", () => {
    saveConnection(createConnection("https://music.example.com", "alice", "hunter2"));
    clearConnection();
    expect(loadConnection()).toBeNull();
  });
});
```

Note: the `localStorage`-touching tests need a DOM-like test environment, which this project doesn't have yet — Step 1a installs it before running these.

- [ ] **Step 1a: Install the `happy-dom` test environment**

```bash
npm install --save-dev happy-dom
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './subsonicConnection'`.

- [ ] **Step 3: Implement `src/api/subsonicConnection.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests across all three test files green.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/api/subsonicConnection.js src/api/subsonicConnection.test.js
git commit -m "$(cat <<'EOF'
Add Subsonic connection persistence

createConnection derives a token from md5(password + salt) and never
stores the raw password. save/load/clearConnection persist to
localStorage, which already isolates credentials per browser/device with
no backend needed. Adds happy-dom as a dev dependency, scoped to this one
test file via a per-file @vitest-environment directive.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Subsonic API client

**Files:**
- Create: `src/api/subsonic.js`
- Test: `src/api/subsonic.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/api/subsonic.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  buildApiUrl,
  parseArtistsResponse,
  parseArtistAlbumsResponse,
  parseSearch3Response,
  parseAlbumTracksResponse,
  getCoverArtUrl,
  getStreamUrl,
} from "./subsonic";

const connection = {
  serverUrl: "https://music.example.com",
  username: "alice",
  salt: "abc123",
  token: "deadbeef",
};

describe("buildApiUrl", () => {
  it("includes auth params and the standard client identifiers", () => {
    const url = buildApiUrl(connection, "ping.view");
    expect(url).toContain("https://music.example.com/rest/ping.view?");
    expect(url).toContain("u=alice");
    expect(url).toContain("t=deadbeef");
    expect(url).toContain("s=abc123");
    expect(url).toContain("v=1.16.1");
    expect(url).toContain("c=RecordPlayer");
    expect(url).toContain("f=json");
  });

  it("strips a trailing slash from serverUrl instead of producing a double slash", () => {
    const trailing = { ...connection, serverUrl: "https://music.example.com/" };
    const url = buildApiUrl(trailing, "ping.view");
    expect(url).toContain("https://music.example.com/rest/ping.view?");
    expect(url).not.toContain("com//rest");
  });

  it("merges in extra params", () => {
    const url = buildApiUrl(connection, "getArtist.view", { id: "42" });
    expect(url).toContain("id=42");
  });
});

describe("parseArtistsResponse", () => {
  it("flattens the alphabetical index into a plain artist list", () => {
    const body = {
      artists: {
        index: [
          { name: "A", artist: [{ id: "1", name: "ABBA" }] },
          { name: "B", artist: [{ id: "2", name: "Beatles" }, { id: "3", name: "Blur" }] },
        ],
      },
    };
    expect(parseArtistsResponse(body)).toEqual([
      { id: "1", name: "ABBA" },
      { id: "2", name: "Beatles" },
      { id: "3", name: "Blur" },
    ]);
  });

  it("returns an empty array when there are no artists", () => {
    expect(parseArtistsResponse({})).toEqual([]);
  });
});

describe("parseArtistAlbumsResponse", () => {
  it("maps an artist's albums", () => {
    const body = {
      artist: { id: "1", name: "ABBA", album: [{ id: "10", name: "Arrival", coverArt: "al-10" }] },
    };
    expect(parseArtistAlbumsResponse(body)).toEqual([
      { id: "10", title: "Arrival", coverArt: "al-10" },
    ]);
  });

  it("returns an empty array when the artist has no albums", () => {
    expect(parseArtistAlbumsResponse({ artist: { id: "1", name: "ABBA" } })).toEqual([]);
  });
});

describe("parseSearch3Response", () => {
  it("maps matching albums", () => {
    const body = {
      searchResult3: {
        album: [{ id: "20", name: "Please Please Me", artist: "The Beatles", coverArt: "al-20" }],
      },
    };
    expect(parseSearch3Response(body)).toEqual([
      { id: "20", title: "Please Please Me", artist: "The Beatles", coverArt: "al-20" },
    ]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(parseSearch3Response({ searchResult3: {} })).toEqual([]);
  });
});

describe("getCoverArtUrl / getStreamUrl", () => {
  it("builds a getCoverArt URL for a given id", () => {
    const url = getCoverArtUrl(connection, "cover-1");
    expect(url).toContain("getCoverArt.view");
    expect(url).toContain("id=cover-1");
  });

  it("returns undefined when there's no cover art id", () => {
    expect(getCoverArtUrl(connection, undefined)).toBeUndefined();
  });

  it("builds a stream URL for a given song id", () => {
    const url = getStreamUrl(connection, "song-1");
    expect(url).toContain("stream.view");
    expect(url).toContain("id=song-1");
  });
});

describe("parseAlbumTracksResponse", () => {
  it("maps an album's songs into the app's standard track shape", () => {
    const body = {
      album: {
        id: "10",
        name: "Arrival",
        coverArt: "al-10",
        song: [
          { id: "100", title: "When I Kissed the Teacher", artist: "ABBA", coverArt: "song-100" },
          { id: "101", title: "Dancing Queen", artist: "ABBA" },
        ],
      },
    };
    const result = parseAlbumTracksResponse(body, connection);

    expect(result.title).toBe("Arrival");
    expect(result.coverArt).toBe(getCoverArtUrl(connection, "al-10"));
    expect(result.tracks).toEqual([
      {
        title: "When I Kissed the Teacher",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "100"),
        coverArt: getCoverArtUrl(connection, "song-100"),
      },
      {
        title: "Dancing Queen",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "101"),
        coverArt: getCoverArtUrl(connection, "al-10"),
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './subsonic'`.

- [ ] **Step 3: Implement `src/api/subsonic.js`**

```js
const API_VERSION = "1.16.1";
const CLIENT_NAME = "RecordPlayer";

/*
  subsonic
  --------
  The Subsonic API client. Every request funnels through buildApiUrl —
  the one seam that would need to change if a CORS relay is ever added
  in front of direct browser-to-server calls; nothing else in this file
  or its callers would need to know.

  Each fetch-based function (ping, getArtists, getArtistAlbums, search3,
  getAlbumTracks) is a thin wrapper around subsonicFetch plus one of the
  parse*Response functions below. Those parse functions are pure — given
  an already-decoded JSON body, they don't touch the network — so they're
  unit-tested directly with fixture data instead of live requests.
*/
export function buildApiUrl(connection, endpoint, params = {}) {
  const base = connection.serverUrl.replace(/\/+$/, "");
  const query = new URLSearchParams({
    u: connection.username,
    t: connection.token,
    s: connection.salt,
    v: API_VERSION,
    c: CLIENT_NAME,
    f: "json",
    ...params,
  });
  return `${base}/rest/${endpoint}?${query.toString()}`;
}

async function subsonicFetch(connection, endpoint, params = {}) {
  const url = buildApiUrl(connection, endpoint, params);
  const response = await fetch(url);
  const data = await response.json();
  const body = data["subsonic-response"];
  if (body.status !== "ok") {
    throw new Error(body.error?.message || "Subsonic server returned an error.");
  }
  return body;
}

export function parseArtistsResponse(body) {
  const index = body.artists?.index ?? [];
  return index
    .flatMap((group) => group.artist ?? [])
    .map((artist) => ({ id: artist.id, name: artist.name }));
}

export function parseArtistAlbumsResponse(body) {
  const albums = body.artist?.album ?? [];
  return albums.map((album) => ({
    id: album.id,
    title: album.name,
    coverArt: album.coverArt,
  }));
}

export function parseSearch3Response(body) {
  const albums = body.searchResult3?.album ?? [];
  return albums.map((album) => ({
    id: album.id,
    title: album.name,
    artist: album.artist,
    coverArt: album.coverArt,
  }));
}

export function getCoverArtUrl(connection, coverArtId) {
  if (!coverArtId) return undefined;
  return buildApiUrl(connection, "getCoverArt.view", { id: coverArtId });
}

export function getStreamUrl(connection, songId) {
  return buildApiUrl(connection, "stream.view", { id: songId });
}

export function parseAlbumTracksResponse(body, connection) {
  const album = body.album;
  const albumCoverArt = getCoverArtUrl(connection, album.coverArt);
  const tracks = (album.song ?? []).map((song) => ({
    title: song.title,
    album: album.name,
    artist: song.artist,
    previewUrl: getStreamUrl(connection, song.id),
    coverArt: getCoverArtUrl(connection, song.coverArt) ?? albumCoverArt,
  }));
  return { title: album.name, coverArt: albumCoverArt, tracks };
}

export async function ping(connection) {
  await subsonicFetch(connection, "ping.view");
}

export async function getArtists(connection) {
  const body = await subsonicFetch(connection, "getArtists.view");
  return parseArtistsResponse(body);
}

export async function getArtistAlbums(connection, artistId) {
  const body = await subsonicFetch(connection, "getArtist.view", { id: artistId });
  return parseArtistAlbumsResponse(body);
}

export async function search3(connection, query) {
  const body = await subsonicFetch(connection, "search3.view", { query });
  return parseSearch3Response(body);
}

export async function getAlbumTracks(connection, albumId) {
  const body = await subsonicFetch(connection, "getAlbum.view", { id: albumId });
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
git add src/api/subsonic.js src/api/subsonic.test.js
git commit -m "$(cat <<'EOF'
Add Subsonic API client

ping/getArtists/getArtistAlbums/search3/getAlbumTracks, each a thin
fetch wrapper around a pure, independently-tested parse*Response
function. Every request funnels through one buildApiUrl(), the seam a
future CORS relay would swap without touching anything else.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `SubsonicConnectModal`

**Files:**
- Create: `src/components/SubsonicConnectModal.jsx`
- Create: `src/components/SubsonicConnectModal.css`

No automated tests for this task — matches this project's existing convention (only pure logic in `src/api`/`src/player` is unit-tested; React components are verified manually in-browser, as `VinylRecordStage` and every other component already are). Task 7 covers manual verification.

- [ ] **Step 1: Create `SubsonicConnectModal.css`**

```css
.subsonic-connect-scrim {
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

.subsonic-connect-modal {
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

.subsonic-connect-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.subsonic-connect-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #9a9a9a;
  font-size: 13px;
}

.subsonic-connect-input {
  background: #101112;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px 14px;
  color: #e5e5e5;
  font-size: 16px;
}

.subsonic-connect-input:focus-visible {
  outline: 2px solid #e5e5e5;
  outline-offset: 1px;
}

.subsonic-connect-submit {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  padding: 12px 18px;
  color: #e5e5e5;
  font-size: 16px;
  cursor: pointer;
}

.subsonic-connect-submit:hover {
  background: rgba(255, 255, 255, 0.14);
}

.subsonic-connect-submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.subsonic-connect-status {
  margin: 12px 0 0;
  font-size: 13px;
  color: #9a9a9a;
}

.subsonic-connect-status--error {
  color: #e28a8a;
}
```

- [ ] **Step 2: Create `SubsonicConnectModal.jsx`**

```jsx
import { useState } from "react";
import { createConnection, saveConnection } from "../api/subsonicConnection";
import { ping } from "../api/subsonic";
import "./SubsonicConnectModal.css";

/*
  SubsonicConnectModal
  ---------------------
  One-time setup form for a Subsonic server connection. Validates via
  ping() before saving — a bad URL/credentials never gets persisted.

  Props:
    - onClose: function — invoked when the scrim is clicked.
    - onConnected: function(connection) — invoked once ping() succeeds
        and the connection has been saved to localStorage.
*/
export function SubsonicConnectModal({ onClose, onConnected }) {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | connecting | error
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!serverUrl.trim() || !username.trim() || !password) return;

    setStatus("connecting");
    setErrorMessage("");
    const connection = createConnection(serverUrl.trim(), username.trim(), password);

    try {
      await ping(connection);
      saveConnection(connection);
      onConnected(connection);
    } catch (error) {
      setStatus("error");
      if (error instanceof TypeError) {
        setErrorMessage(
          "Couldn't reach that server. If it's self-hosted, make sure it allows requests from this site (CORS)."
        );
      } else if (error instanceof SyntaxError) {
        setErrorMessage("Couldn't find a Subsonic server at that address.");
      } else {
        setErrorMessage(error.message);
      }
    }
  };

  return (
    <div className="subsonic-connect-scrim" onClick={onClose}>
      <div
        className="subsonic-connect-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Connect to a Subsonic server"
        onClick={(event) => event.stopPropagation()}
      >
        <form className="subsonic-connect-form" onSubmit={handleSubmit}>
          <label className="subsonic-connect-label">
            Server URL
            <input
              type="url"
              className="subsonic-connect-input"
              placeholder="https://music.example.com"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              autoFocus
            />
          </label>
          <label className="subsonic-connect-label">
            Username
            <input
              type="text"
              className="subsonic-connect-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="subsonic-connect-label">
            Password
            <input
              type="password"
              className="subsonic-connect-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="subsonic-connect-submit"
            disabled={status === "connecting"}
          >
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
        </form>

        {status === "error" && (
          <p className="subsonic-connect-status subsonic-connect-status--error">
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
git add src/components/SubsonicConnectModal.jsx src/components/SubsonicConnectModal.css
git commit -m "$(cat <<'EOF'
Add SubsonicConnectModal

Server URL/username/password form, validated via ping() before saving.
Distinguishes network/CORS failures, wrong credentials, and invalid
URLs into three separate error messages. Not wired into App yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `SubsonicBrowseModal`

**Files:**
- Create: `src/components/SubsonicBrowseModal.jsx`
- Create: `src/components/SubsonicBrowseModal.css`

No automated tests for this task, same rationale as Task 4.

- [ ] **Step 1: Create `SubsonicBrowseModal.css`**

```css
.subsonic-browse-scrim {
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

.subsonic-browse-modal {
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

.subsonic-browse-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.subsonic-browse-tab {
  background: none;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  color: #9a9a9a;
  font-size: 14px;
  cursor: pointer;
}

.subsonic-browse-tab--active {
  background: rgba(255, 255, 255, 0.08);
  color: #e5e5e5;
}

.subsonic-browse-change-server {
  margin-left: auto;
  background: none;
  border: none;
  color: #9a9a9a;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.subsonic-browse-search-form {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.subsonic-browse-search-input {
  flex: 1;
  min-width: 0;
  background: #101112;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px 14px;
  color: #e5e5e5;
  font-size: 16px;
}

.subsonic-browse-search-input:focus-visible {
  outline: 2px solid #e5e5e5;
  outline-offset: 1px;
}

.subsonic-browse-search-submit {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  padding: 12px 18px;
  color: #e5e5e5;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.subsonic-browse-search-submit:hover {
  background: rgba(255, 255, 255, 0.14);
}

.subsonic-browse-status {
  margin: 0 0 12px;
  font-size: 13px;
  color: #9a9a9a;
}

.subsonic-browse-status--error {
  color: #e28a8a;
}

.subsonic-browse-back {
  align-self: flex-start;
  background: none;
  border: none;
  color: #9a9a9a;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 8px;
  padding: 4px 0;
}

.subsonic-browse-list,
.subsonic-browse-results {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.subsonic-browse-list-item {
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

.subsonic-browse-list-item:hover,
.subsonic-browse-list-item:focus-visible {
  background: rgba(255, 255, 255, 0.06);
}

.subsonic-browse-result {
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

.subsonic-browse-result:hover,
.subsonic-browse-result:focus-visible {
  background: rgba(255, 255, 255, 0.06);
}

.subsonic-browse-result__title {
  color: #e5e5e5;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subsonic-browse-result__artist {
  color: #9a9a9a;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Create `SubsonicBrowseModal.jsx`**

```jsx
import { useEffect, useState } from "react";
import { getArtists, getArtistAlbums, search3, getAlbumTracks } from "../api/subsonic";
import { clearConnection } from "../api/subsonicConnection";
import "./SubsonicBrowseModal.css";

/*
  SubsonicBrowseModal
  ---------------------
  Two tabs: Browse (artist list -> that artist's albums) and Search
  (text query -> matching albums). Either path ends the same way —
  loading an album's tracks and handing them to onAlbumSelected, exactly
  like the Deezer flow's terminal step.

  Props:
    - connection: object — from subsonicConnection's createConnection/
        loadConnection.
    - onClose: function — invoked when the scrim is clicked.
    - onAlbumSelected: function(tracks) — same callback Deezer/local
        files already use to hand off to the player.
    - onChangeServer: function — invoked after this component clears the
        saved connection, so the parent can show the connect form again.
*/
export function SubsonicBrowseModal({ connection, onClose, onAlbumSelected, onChangeServer }) {
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
      const results = await search3(connection, query.trim());
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
    <div className="subsonic-browse-scrim" onClick={onClose}>
      <div
        className="subsonic-browse-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Browse your Subsonic library"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="subsonic-browse-tabs">
          <button
            type="button"
            className={`subsonic-browse-tab${tab === "browse" ? " subsonic-browse-tab--active" : ""}`}
            onClick={() => setTab("browse")}
          >
            Browse
          </button>
          <button
            type="button"
            className={`subsonic-browse-tab${tab === "search" ? " subsonic-browse-tab--active" : ""}`}
            onClick={() => setTab("search")}
          >
            Search
          </button>
          <button
            type="button"
            className="subsonic-browse-change-server"
            onClick={handleChangeServer}
          >
            Change Server
          </button>
        </div>

        {tab === "search" && (
          <form className="subsonic-browse-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="subsonic-browse-search-input"
              placeholder="Search your library…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
            <button type="submit" className="subsonic-browse-search-submit">
              Search
            </button>
          </form>
        )}

        {status === "loading" && <p className="subsonic-browse-status">Loading…</p>}
        {status === "loading-album" && (
          <p className="subsonic-browse-status">Loading album…</p>
        )}
        {status === "error" && (
          <p className="subsonic-browse-status subsonic-browse-status--error">
            {errorMessage}
          </p>
        )}

        {tab === "browse" && selectedArtist && (
          <button type="button" className="subsonic-browse-back" onClick={handleBackToArtists}>
            ← {selectedArtist.name}
          </button>
        )}

        {tab === "browse" && !selectedArtist && artists && (
          <ul className="subsonic-browse-list">
            {artists.map((artist) => (
              <li key={artist.id}>
                <button
                  type="button"
                  className="subsonic-browse-list-item"
                  onClick={() => handleSelectArtist(artist)}
                >
                  {artist.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "browse" && selectedArtist && albums && (
          <ul className="subsonic-browse-results">
            {albums.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  className="subsonic-browse-result"
                  onClick={() => handleSelectAlbum(album.id)}
                >
                  <span className="subsonic-browse-result__title">{album.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "search" && searchResults && (
          <ul className="subsonic-browse-results">
            {searchResults.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  className="subsonic-browse-result"
                  onClick={() => handleSelectAlbum(album.id)}
                >
                  <span className="subsonic-browse-result__title">{album.title}</span>
                  <span className="subsonic-browse-result__artist">{album.artist}</span>
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
git add src/components/SubsonicBrowseModal.jsx src/components/SubsonicBrowseModal.css
git commit -m "$(cat <<'EOF'
Add SubsonicBrowseModal

Browse (artist -> albums) and Search tabs, both terminating in the same
onAlbumSelected(tracks) handoff Deezer already uses. Change Server clears
the saved connection and hands control back to the parent. Not wired
into App yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Wire Subsonic into `SourceMenu` and `App.jsx`

**Files:**
- Modify: `src/components/SourceMenu.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the third option to `SourceMenu`**

Replace the full contents of `src/components/SourceMenu.jsx` with:

```jsx
import "./SourceMenu.css";

/*
  SourceMenu
  ----------
  The first thing you see when clicking the record or the now-playing
  display: a choice of where to load music from. "Deezer Demo" opens
  the existing album search. "My Files" opens a native folder picker
  (browser-native, not our own UI) — audio files found in the folder
  become the new track list, playable the same way as a Deezer album.
  "Subsonic Library" connects to (or, if already connected, browses) a
  user's own self-hosted Subsonic-API server.
*/
export function SourceMenu({ onClose, onSelectFiles, onSelectDeezer, onSelectSubsonic }) {
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
          <span className="source-menu__option-title">Deezer Demo</span>
        </button>
        <button type="button" className="source-menu__option" onClick={onSelectSubsonic}>
          <span className="source-menu__option-title">Subsonic Library</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add imports to `App.jsx`**

Change:

```js
import { SourceMenu } from "./components/SourceMenu";
import { AlbumSearchModal } from "./components/AlbumSearchModal";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import { readTrackMetadata } from "./api/localMetadata";
import "./App.css";
```

to:

```js
import { SourceMenu } from "./components/SourceMenu";
import { AlbumSearchModal } from "./components/AlbumSearchModal";
import { SubsonicConnectModal } from "./components/SubsonicConnectModal";
import { SubsonicBrowseModal } from "./components/SubsonicBrowseModal";
import { usePlayerState } from "./hooks/usePlayerState";
import { mockTracks } from "./data/mockTracks";
import { readTrackMetadata } from "./api/localMetadata";
import { loadConnection } from "./api/subsonicConnection";
import "./App.css";
```

- [ ] **Step 3: Add `subsonicConnection` state and update the `activeModal` comment**

Change:

```js
  const [activeModal, setActiveModal] = useState(null); // null | "source" | "deezer"
  const audioRef = useRef(null);
```

to:

```js
  // null | "source" | "deezer" | "subsonic-connect" | "subsonic-browse"
  const [activeModal, setActiveModal] = useState(null);
  const [subsonicConnection, setSubsonicConnection] = useState(null);
  const audioRef = useRef(null);
```

- [ ] **Step 4: Add the Subsonic handlers**

Change:

```js
  const openSourceMenu = () => setActiveModal("source");

  const handleSelectDeezer = () => setActiveModal("deezer");
```

to:

```js
  const openSourceMenu = () => setActiveModal("source");

  const handleSelectDeezer = () => setActiveModal("deezer");

  const handleSelectSubsonic = () => {
    const existing = loadConnection();
    if (existing) {
      setSubsonicConnection(existing);
      setActiveModal("subsonic-browse");
    } else {
      setActiveModal("subsonic-connect");
    }
  };

  const handleSubsonicConnected = (connection) => {
    setSubsonicConnection(connection);
    setActiveModal("subsonic-browse");
  };

  const handleChangeServer = () => {
    setSubsonicConnection(null);
    setActiveModal("subsonic-connect");
  };
```

- [ ] **Step 5: Render the new option and modals**

Change:

```jsx
      {activeModal === "source" && (
        <SourceMenu
          onClose={() => setActiveModal(null)}
          onSelectDeezer={handleSelectDeezer}
          onSelectFiles={handleSelectFiles}
        />
      )}
      {activeModal === "deezer" && (
        <AlbumSearchModal
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
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
        />
      )}
      {activeModal === "deezer" && (
        <AlbumSearchModal
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
        />
      )}
      {activeModal === "subsonic-connect" && (
        <SubsonicConnectModal
          onClose={() => setActiveModal(null)}
          onConnected={handleSubsonicConnected}
        />
      )}
      {activeModal === "subsonic-browse" && subsonicConnection && (
        <SubsonicBrowseModal
          connection={subsonicConnection}
          onClose={() => setActiveModal(null)}
          onAlbumSelected={handleAlbumSelected}
          onChangeServer={handleChangeServer}
        />
      )}
```

- [ ] **Step 6: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS on both.

- [ ] **Step 7: Commit**

```bash
git add src/components/SourceMenu.jsx src/App.jsx
git commit -m "$(cat <<'EOF'
Wire Subsonic into SourceMenu and the player

"Subsonic Library" opens the connect form on first use, or jumps
straight to browsing if a connection is already saved. Reuses
handleAlbumSelected unchanged — Subsonic tracks feed into the same
loadAlbum(tracks) call Deezer and local files already use.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm the unit test suite and lint are clean end-to-end**

Run: `npm test && npm run lint`
Expected: PASS on both — this exercises `md5`, `subsonicConnection`, and `subsonic.js`'s pure functions one more time as a full-suite sanity check before moving to manual UI verification.

- [ ] **Step 2: Start the dev server preview**

Use the `preview_start` tool with `{"name": "record-player-dev"}`.

- [ ] **Step 3: Verify the SourceMenu option and connect form render**

Click the record (or the now-playing display) to open `SourceMenu`. Confirm "Subsonic Library" appears as a third option alongside "My Files" and "Deezer Demo". Click it — since no connection is saved yet, confirm `SubsonicConnectModal` opens with Server URL / Username / Password fields and a "Connect" button.

- [ ] **Step 4: Verify connection error handling**

Submit the form with a URL that doesn't resolve to anything reachable (e.g. `https://localhost:9`) and any username/password. Confirm an error message appears and the form stays open. Then try a syntactically-valid but non-Subsonic URL (e.g. this app's own dev server URL) and confirm a distinct "couldn't find a Subsonic server" style message appears (the JSON parse will fail against an HTML response).

- [ ] **Step 5: Verify a real end-to-end connection, if a reachable server is available**

If a Navidrome demo instance or the user's own server is reachable from this environment: connect with real credentials, confirm it lands on `SubsonicBrowseModal` with the Browse tab showing an artist list, confirm clicking an artist shows their albums, confirm clicking an album loads its tracks into the player (vinyl art updates, now-playing display updates, Play works). Then test the Search tab similarly. If no server is reachable from this environment, note that clearly instead of skipping the step silently — this gap should be visible, not hidden, and real-server verification should happen against the user's own server afterward.

- [ ] **Step 6: Verify "Change Server"**

From `SubsonicBrowseModal`, click "Change Server". Confirm it returns to `SubsonicConnectModal`, and confirm (via `localStorage.getItem('subsonicConnection')` in the browser console, or the `javascript_tool`) that the saved connection was actually cleared.

- [ ] **Step 7: Verify the saved-connection shortcut**

After connecting once, close the modal, reopen `SourceMenu`, and click "Subsonic Library" again. Confirm it goes straight to `SubsonicBrowseModal` (skipping the connect form), since a connection is now saved.

- [ ] **Step 8: Check the console for errors**

Use `read_console_messages` with `onlyErrors: true` across all the steps above. Expected: no errors beyond the deliberately-triggered connection failures from Step 4.

- [ ] **Step 9: Report results to the user**

Summarize what was verified, explicitly flag whether Step 5's real-server test ran or was skipped for lack of a reachable server, and note anything that didn't match the spec before considering the feature done.
