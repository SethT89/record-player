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
