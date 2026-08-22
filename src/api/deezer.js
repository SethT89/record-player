/*
  Deezer's API doesn't send CORS headers, so a plain fetch() from the
  browser is blocked. Deezer's own documented workaround for client-side
  apps is JSONP (?output=jsonp&callback=...), which loads the response
  via a <script> tag instead of XHR/fetch, sidestepping CORS entirely.
*/
let jsonpCounter = 0;

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `deezerJsonp${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement("script");

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      if (data?.error) {
        reject(new Error(data.error.message || "Deezer API error"));
      } else {
        resolve(data);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to reach Deezer"));
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}output=jsonp&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

export async function searchAlbums(query) {
  const data = await fetchJsonp(
    `https://api.deezer.com/search/album?q=${encodeURIComponent(query)}`
  );
  return (data.data || []).map((album) => ({
    id: album.id,
    title: album.title,
    artist: album.artist?.name ?? "",
    coverArt: album.cover_medium,
  }));
}

export async function getAlbumTracks(albumId) {
  const data = await fetchJsonp(`https://api.deezer.com/album/${albumId}`);
  const coverArt = data.cover_medium;
  const albumTitle = data.title;
  const tracks = (data.tracks?.data || [])
    .filter((track) => track.preview)
    .map((track) => ({
      title: track.title,
      album: albumTitle,
      artist: track.artist?.name ?? data.artist?.name ?? "",
      previewUrl: track.preview,
      coverArt,
    }));
  return { title: albumTitle, coverArt, tracks };
}
