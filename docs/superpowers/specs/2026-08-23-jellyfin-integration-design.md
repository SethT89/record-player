# Jellyfin integration — design

## Context

The player currently loads albums from three sources — Deezer search
(`src/api/deezer.js` + `AlbumSearchModal`), local files (`src/App.jsx`'s
folder picker), and a user's own Subsonic-API server (`src/api/subsonic.js`
+ `SubsonicConnectModal`/`SubsonicBrowseModal`) — all funneling into the
same `loadAlbum(tracks)` call, with tracks shaped as `{ title, album,
artist, previewUrl, coverArt }`. This spec adds a fourth source: a user's
own self-hosted [Jellyfin](https://jellyfin.org/) media server, letting
them connect once and browse or search their personal music library the
same way.

This is a static, backend-less app (deployed to GitHub Pages). No backend
or user-account system is being introduced, same scoping as the Subsonic
pass. Reaching the user's own server happens via direct browser `fetch()`
calls, which requires their server to have CORS enabled for our origin.
**Verified (2026-08-23):** `access-control-allow-origin` on the public
Jellyfin demo server (`demo.jellyfin.org`) returns `*`, and
`/System/Info/Public` responds correctly — confirming the same
direct-browser-call approach used for Subsonic is viable, at least for
that server's configuration. Actual audio playback is never CORS-gated
regardless (`<audio>` elements can play cross-origin streams without CORS
headers), so this constraint only affects the browse/search API calls,
not playback itself.

Live end-to-end verification during implementation targets
`demo.jellyfin.org`, per user preference over standing up a private
server — a step up from the Subsonic pass, which had no live server
available at the time.

## Files

```
src/api/jellyfinConnection.js                 (new)
src/api/jellyfin.js                           (new)
src/components/JellyfinConnectModal.jsx/.css  (new)
src/components/JellyfinBrowseModal.jsx/.css   (new)
src/components/SourceMenu.jsx                 (modified)
src/App.jsx                                   (modified)
```

### `src/api/jellyfinConnection.js`

Owns credential persistence, mirroring `subsonicConnection.js`'s shape.
Unlike Subsonic, there's no local salt/token derivation — the connection
*is* the result of a successful login against the server. Exports:

- `generateDeviceId()` — `crypto.randomUUID()`. Called once when starting
  a new connection attempt; persisted alongside the connection so the
  device identifies itself consistently across requests (Jellyfin surfaces
  connected devices/sessions in its own admin UI — keeping this stable is
  a courtesy, not a correctness requirement).
- `saveConnection(connection)` / `loadConnection()` / `clearConnection()`
  — read/write/remove a `{ serverUrl, userId, accessToken, deviceId }`
  object as JSON under the `localStorage` key `"jellyfinConnection"`.
  `loadConnection()` returns `null` if nothing is saved. Same
  per-browser-isolation rationale as Subsonic's version — no backend, so
  `localStorage` is sufficient and requires no new infrastructure.

### `src/api/jellyfin.js`

The API client, structured the same way as `subsonic.js`: every
URL-building request funnels through one `buildApiUrl(connection, path,
params = {})` helper (appends `api_key=<accessToken>` as a query param,
which Jellyfin accepts as an alternative to the `X-Emby-Token` header —
this keeps the same URL uniformly usable for both `fetch()` JSON calls and
direct `<img>`/`<audio>` src attributes, exactly like Subsonic's
`buildApiUrl`). This is the one seam a future CORS relay would swap
without touching anything else.

A `jellyfinFetch(connection, path, params)` wraps `buildApiUrl` + `fetch`
+ response validation, throwing on non-2xx responses so the UI layer can
distinguish network failures from server-reported errors.

Exported functions:

- `authenticate(serverUrl, username, password, deviceId)` — `POST
  {serverUrl}/Users/AuthenticateByName` with `{ Username, Pw }` as the
  JSON body and an `X-Emby-Authorization` header identifying the client
  (`Client="RecordPlayer"`, `Device="Browser"`, the given `deviceId`,
  `Version="1.0.0"`). Resolves to `{ userId, accessToken }` on success
  (a 200 with `{ User: { Id }, AccessToken }` in the body); throws on
  401 or any other failure. This is the one call that doesn't go through
  `buildApiUrl`, since there's no token yet to attach.
- `getArtists(connection)` — `GET /Artists?userId=` → flattens
  `Items[]` into `{ id, name }[]`.
- `getArtistAlbums(connection, artistId)` — `GET
  /Items?userId=&IncludeItemTypes=MusicAlbum&Recursive=true&ArtistIds=`
  → `{ id, title, coverArt }[]` from `Items[]`.
- `searchAlbums(connection, query)` — `GET
  /Items?userId=&searchTerm=&IncludeItemTypes=MusicAlbum&Recursive=true`
  → `{ id, title, artist, coverArt }[]` (defaulting to `[]` if `Items` is
  absent).
- `getAlbumTracks(connection, albumId)` — `GET
  /Items?userId=&ParentId=` → maps the album's audio items into the
  app's standard track shape: `{ title, album, artist, previewUrl:
  getStreamUrl(connection, item.Id), coverArt: getCoverArtUrl(connection,
  item.Id) }`.
- `getCoverArtUrl(connection, itemId)` / `getStreamUrl(connection,
  itemId)` — build (not fetch) authenticated URLs to
  `/Items/{id}/Images/Primary` and `/Audio/{id}/stream?static=true` via
  `buildApiUrl`. `static=true` requests the original file with no
  transcoding, matching Subsonic's "use server defaults" scope. Like
  Subsonic's equivalents, these are never fetched from JS, so they're
  unaffected by the CORS constraint that applies to the JSON endpoints.

**Response shape confidence:** the endpoint shapes above follow Jellyfin's
documented API. Before locking the `parse*Response` functions in place,
implementation will confirm actual response JSON against
`demo.jellyfin.org` rather than assuming the docs match exactly — the same
discipline already applied to confirming CORS behavior.

## Components

```
App
└── SourceMenu (modified: 4th option "Jellyfin Library")
    ├── JellyfinConnectModal (new)  — shown when no saved connection
    └── JellyfinBrowseModal (new)   — shown once connected
```

### `SourceMenu` (modified)

Adds a fourth option, "Jellyfin Library", alongside "My Files", "Demo
Songs", and "Subsonic Library". Its click handler (in `App.jsx`) checks
`loadConnection()` (from `jellyfinConnection.js`): if a saved connection
exists, it opens `JellyfinBrowseModal` directly; otherwise it opens
`JellyfinConnectModal` first.

### `JellyfinConnectModal` (new)

A form: Server URL, Username, Password, "Connect" button. On submit:
generates a `deviceId`, calls `authenticate(...)`. On success, saves the
resulting connection and hands off to `JellyfinBrowseModal`. On failure,
shows one of three distinct messages (see Error handling) and stays on
the form. Structurally identical to `SubsonicConnectModal`.

### `JellyfinBrowseModal` (new)

Two tabs, defaulting to **Browse**:

- **Browse**: artist list (`getArtists`) → tap an artist → their albums
  (`getArtistAlbums`) → tap an album → `getAlbumTracks` →
  `onAlbumSelected(tracks)`.
- **Search**: a text box → `searchAlbums` → matching albums → tap one →
  same `getAlbumTracks` → `onAlbumSelected` handoff.

Also has a small "Change Server" control that calls `clearConnection()`
and returns to `JellyfinConnectModal`. Structurally identical to
`SubsonicBrowseModal`.

## App.jsx changes

`activeModal` gains two new values: `"jellyfin-connect"` and
`"jellyfin-browse"`. New handlers: `handleSelectJellyfin` (the
saved-connection branch described above) and `handleJellyfinConnected`
(transitions from the connect modal to the browse modal). No changes to
`usePlayerState`, the reducer, `VinylRecordStage`, or anything else in the
playback path — Jellyfin tracks arrive in the exact same shape the other
three sources already do, so `loadAlbum(tracks)` is reused completely
unchanged.

## Error handling

`JellyfinConnectModal` distinguishes three failure cases, same split as
Subsonic:

1. **Network/CORS failure** (fetch throws before getting a response) —
   "Couldn't reach that server. If it's self-hosted, make sure it allows
   requests from this site (CORS)."
2. **Auth failure** (401 from `AuthenticateByName`) — "Wrong username or
   password." (Fixed message rather than surfacing raw server text —
   Jellyfin's 401 body is less consistently descriptive than Subsonic's
   `error.message`.)
3. **Unreachable/invalid URL** (non-JSON response, DNS failure) —
   "Couldn't find a Jellyfin server at that address."

## Explicitly out of scope

- Any backend, proxy, or user-account system — direct browser-to-server
  calls only, same as Subsonic.
- Transcoding options on the stream endpoint beyond `static=true` (direct
  play, no bitrate/format negotiation).
- Playlists, favorites, play counts, "recently added," or any other
  Jellyfin feature beyond browsing/searching albums and loading their
  tracks.
- Automatic reconnection/token refresh — if auth ever fails after being
  previously connected, the user re-connects manually via "Change
  Server."

## Testing

`jellyfinConnection.js`'s persistence and `jellyfin.js`'s `buildApiUrl` /
`parse*Response` functions are pure, unit-tested the same way Subsonic's
equivalents are (fixture JSON in, assertions on the parsed shape or
constructed URL out). No MD5 test vectors needed here — Jellyfin's auth
doesn't require a hand-rolled hash, so this is a smaller test surface than
Subsonic's `md5.test.js`.

For live end-to-end verification, `demo.jellyfin.org` is reachable from
this environment and CORS-enabled (verified above), so — unlike the
Subsonic pass — the full connect → browse → search → play flow gets
exercised against a real server as part of implementation, not deferred
to after.
