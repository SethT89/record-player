import { useState } from "react";
import { searchAlbums, getAlbumTracks } from "../api/deezer";
import "./AlbumSearchModal.css";

export function AlbumSearchModal({ onClose, onAlbumSelected }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | searching | loading-album | error
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus("searching");
    setErrorMessage("");
    try {
      const albums = await searchAlbums(query.trim());
      setResults(albums);
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
      const album = await getAlbumTracks(albumId);
      if (album.tracks.length === 0) {
        throw new Error("That album has no playable previews.");
      }
      onAlbumSelected(album.tracks);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="album-search-scrim" onClick={onClose}>
      <div
        className="album-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search Deezer for an album"
        onClick={(event) => event.stopPropagation()}
      >
        <form className="album-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="album-search-input"
            placeholder="Search an artist or album…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <button type="submit" className="album-search-submit">
            Search
          </button>
        </form>

        {status === "searching" && (
          <p className="album-search-status">Searching…</p>
        )}
        {status === "loading-album" && (
          <p className="album-search-status">Loading album…</p>
        )}
        {status === "error" && (
          <p className="album-search-status album-search-status--error">
            {errorMessage}
          </p>
        )}

        <ul className="album-search-results">
          {results.map((album) => (
            <li key={album.id}>
              <button
                type="button"
                className="album-search-result"
                onClick={() => handleSelectAlbum(album.id)}
              >
                <img src={album.coverArt} alt="" className="album-search-result__art" />
                <span className="album-search-result__text">
                  <span className="album-search-result__title">{album.title}</span>
                  <span className="album-search-result__artist">{album.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
