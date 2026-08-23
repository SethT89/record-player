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

  The initial artist list load is a bit different from the other actions
  below: it's effect-driven (triggered by the Browse tab becoming active)
  rather than event-driven, so its "loading" state is derived at render
  time from artists/artistsError being unset, rather than set explicitly
  inside the effect — an effect that synchronously sets a "loading" flag
  the instant it starts is usually better expressed this way.

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
  const [artistsError, setArtistsError] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [albums, setAlbums] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | loading-album | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (tab !== "browse" || artists !== null || artistsError !== null) return;
    let cancelled = false;
    getArtists(connection)
      .then((result) => {
        if (!cancelled) setArtists(result);
      })
      .catch((error) => {
        if (!cancelled) setArtistsError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, artists, artistsError, connection]);

  const isLoadingArtists = tab === "browse" && artists === null && artistsError === null;

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

        {(isLoadingArtists || status === "loading") && (
          <p className="subsonic-browse-status">Loading…</p>
        )}
        {status === "loading-album" && (
          <p className="subsonic-browse-status">Loading album…</p>
        )}
        {artistsError && (
          <p className="subsonic-browse-status subsonic-browse-status--error">{artistsError}</p>
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
