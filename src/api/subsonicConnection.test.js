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
