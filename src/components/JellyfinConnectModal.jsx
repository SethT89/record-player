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
