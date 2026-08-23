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
