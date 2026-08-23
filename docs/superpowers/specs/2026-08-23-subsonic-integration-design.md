# Subsonic integration — design

## Context

The player currently loads albums from two sources — Deezer search
(`src/api/deezer.js` + `AlbumSearchModal`) and local files
(`src/App.jsx`'s folder picker) — both funneling into the same
`loadAlbum(tracks)` call, with tracks shaped as `{ title, album, artist,
previewUrl, coverArt }`. This spec adds a third source: a user's own
self-hosted [Subsonic-API](http://www.subsonic.org/pages/api.jsp)
compatible music server (Navidrome, Airsonic, Gonic, etc.), letting them
connect once and browse or search their personal library the same way.

This is a static, backend-less app (deployed to GitHub Pages). No backend
or user-account system is being introduced — this spec deliberately
scopes down to that, per discussion: "saved separately from everyone
else" only ever meant per-browser isolation, which plain `localStorage`
already provides for free. Reaching the user's own server happens via
direct browser `fetch()` calls, which requires their server to have CORS
enabled for our origin. If that turns out to be a common blocker, a thin
stateless CORS-relay (e.g. a Cloudflare Worker) is a small, isolated
follow-up — not part of this pass. Actual audio playback is never
CORS-gated regardless (`<audio>` elements can play cross-origin streams
without CORS headers), so this constraint only affects the browse/search
API calls, not playback itself.

## Files

```
src/api/md5.js                                (new)
src/api/subsonicConnection.js                 (new)
src/api/subsonic.js                           (new)
src/components/SubsonicConnectModal.jsx/.css  (new)
src/components/SubsonicBrowseModal.jsx/.css   (new)
src/components/SourceMenu.jsx                 (modified)
src/App.jsx                                   (modified)
```

### `src/api/md5.js`

A self-contained MD5 implementation (`md5(input: string): string`,
returning a lowercase hex digest) — no new dependency. Needed because
Subsonic's token auth scheme requires `md5(password + salt)`, and
browsers' native `SubtleCrypto` doesn't implement MD5 (only the SHA
family).

### `src/api/subsonicConnection.js`

Owns credential persistence. Exports:

- `createConnection(serverUrl, username, password)` — generates a random
  salt (16 bytes from `crypto.getRandomValues`, hex-encoded to a 32-char
  string), computes `token = md5(password + salt)`, and returns `{
  serverUrl, username, salt, token }`. **The raw password is never
  returned or stored** — only salt+token, which is what every subsequent
  API call authenticates with.
- `saveConnection(connection)` / `loadConnection()` / `clearConnection()`
  — read/write/remove the connection object as JSON under the
  `localStorage` key `"subsonicConnection"`. `loadConnection()` returns
  `null` if nothing is saved.

### `src/api/subsonic.js`

The API client. Every function below funnels its request through a
single `buildApiUrl(connection, endpoint, params = {})` helper — this is
the one seam that would need to change if a CORS relay is ever added
later (route through the relay instead of `connection.serverUrl`
directly); nothing else in the app would need to know.

`buildApiUrl` shape: `` `${serverUrl}/rest/${endpoint}?u=${username}&t=${token}&s=${salt}&v=1.16.1&c=RecordPlayer&f=json&${otherParams}` ``.

A `subsonicFetch(connection, endpoint, params)` wraps `buildApiUrl` +
`fetch` + response validation: Subsonic wraps every response (even on
HTTP 200) in `{ "subsonic-response": { status: "ok" | "failed", error?:
{ code, message } } }`. `subsonicFetch` throws with the server's own
`error.message` when `status === "failed"`, and lets network-level fetch
failures (CORS blocks, unreachable host) propagate as-is so the UI layer
can distinguish the two cases.

Exported functions:

- `ping(connection)` — calls `ping.view`; resolves on success, throws
  otherwise. Used to validate a connection before saving it.
- `getArtists(connection)` — calls `getArtists.view`, flattens the
  server's alphabetical-index grouping (`artists.index[].artist[]`) into
  a plain `{ id, name }[]`.
- `getArtistAlbums(connection, artistId)` — calls `getArtist.view?id=`,
  returns that artist's `{ id, title, coverArt }[]` from the response's
  `artist.album[]`.
- `search3(connection, query)` — calls `search3.view?query=`, returns
  `searchResult3.album[]` (defaulting to `[]` if the key is absent) as
  `{ id, title, artist, coverArt }[]`.
- `getAlbumTracks(connection, albumId)` — calls `getAlbum.view?id=`,
  maps `album.song[]` into the app's standard track shape: `{ title,
  album, artist, previewUrl: getStreamUrl(connection, song.id), coverArt:
  getCoverArtUrl(connection, song.coverArt) }`.
- `getCoverArtUrl(connection, coverArtId)` / `getStreamUrl(connection,
  songId)` — build (not fetch) authenticated URLs to `getCoverArt.view`
  and `stream.view` via `buildApiUrl`, for direct use as `<img src>` /
  the track's `previewUrl`. These are never fetched from JS, so they're
  unaffected by the CORS constraint that applies to the JSON endpoints.

## Components

```
App
└── SourceMenu (modified: 3rd option "Subsonic Library")
    ├── SubsonicConnectModal (new)  — shown when no saved connection
    └── SubsonicBrowseModal (new)   — shown once connected
```

### `SourceMenu` (modified)

Adds a third option, "Subsonic Library", alongside "My Files" and
"Deezer Demo". Its click handler (in `App.jsx`) checks
`loadConnection()`: if a saved connection exists, it opens
`SubsonicBrowseModal` directly; otherwise it opens `SubsonicConnectModal`
first.

### `SubsonicConnectModal` (new)

A form: Server URL, Username, Password, "Connect" button. On submit:
`createConnection(...)`, then `ping()` to validate. On success, saves the
connection and hands off to `SubsonicBrowseModal`. On failure, shows one
of three distinct messages (see Error handling) and stays on the form.

### `SubsonicBrowseModal` (new)

Two tabs, defaulting to **Browse**:

- **Browse**: artist list (`getArtists`) → tap an artist → their albums
  (`getArtistAlbums`) → tap an album → `getAlbumTracks` →
  `onAlbumSelected(tracks)`, same as the Deezer flow's terminal step.
- **Search**: a text box (reusing `AlbumSearchModal`'s input pattern) →
  `search3` → matching albums → tap one → same `getAlbumTracks` →
  `onAlbumSelected` handoff.

Also has a small "Change Server" control that calls `clearConnection()`
and returns to `SubsonicConnectModal` — covers both "I made a mistake"
and "my password changed on the server and auth now fails."

## App.jsx changes

`activeModal` gains two new values: `"subsonic-connect"` and
`"subsonic-browse"`. New handlers: `handleSelectSubsonic` (the
saved-connection branch described above) and `handleSubsonicConnected`
(transitions from the connect modal to the browse modal). No changes to
`usePlayerState`, the reducer, `VinylRecordStage`, or anything else in
the playback path — Subsonic tracks arrive in the exact same shape
Deezer and local-file tracks already do, so `loadAlbum(tracks)` is reused
completely unchanged.

## Error handling

`SubsonicConnectModal` distinguishes three failure cases:

1. **Network/CORS failure** (fetch throws before getting a response) —
   "Couldn't reach that server. If it's self-hosted, make sure it allows
   requests from this site (CORS)."
2. **Auth failure** (`subsonic-response.status === "failed"` with an auth
   error code) — shows the server's own error message (e.g. "Wrong
   username or password").
3. **Unreachable/invalid URL** (non-JSON response, DNS failure) — "Couldn't
   find a Subsonic server at that address."

## Explicitly out of scope

- Any backend, proxy, or user-account system — direct browser-to-server
  calls only, per the scoping discussion above.
- Transcoding options on the `stream` endpoint (bitrate/format params) —
  uses server defaults.
- Playlists, favorites, play counts, or any other Subsonic feature beyond
  browsing/searching albums and loading their tracks.
- Automatic reconnection/token refresh — if auth ever fails after being
  previously connected, the user re-connects manually via "Change
  Server."

## Testing

`md5.js` and `buildApiUrl`'s parameter handling are pure functions,
unit-tested the same way `playerReducer` already is (known MD5 test
vectors; assertions on the constructed URL's structure and encoding).

For live end-to-end verification, there's no Subsonic server available
in this working environment. Verification will use a public Navidrome
demo instance if one is reachable at implementation time; if not,
`SubsonicConnectModal`/`SubsonicBrowseModal`'s loading/error/success UI
states will be verified against mocked `fetch` responses instead of a
live server. This is a known limitation of this pass, not a gap to
silently work around — real-server verification against the user's own
server is expected to happen after implementation, not during it.
