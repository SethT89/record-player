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
