// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  generateDeviceId,
  saveConnection,
  loadConnection,
  clearConnection,
} from "./jellyfinConnection";

describe("generateDeviceId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateDeviceId()).toBe("string");
    expect(generateDeviceId().length).toBeGreaterThan(0);
  });

  it("generates a different id on each call", () => {
    expect(generateDeviceId()).not.toBe(generateDeviceId());
  });
});

describe("saveConnection / loadConnection / clearConnection", () => {
  const connection = {
    serverUrl: "https://jellyfin.example.com",
    userId: "user-1",
    accessToken: "token-1",
    deviceId: "device-1",
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a connection through localStorage", () => {
    saveConnection(connection);
    expect(loadConnection()).toEqual(connection);
  });

  it("returns null when nothing is saved", () => {
    expect(loadConnection()).toBeNull();
  });

  it("clearConnection removes the saved connection", () => {
    saveConnection(connection);
    clearConnection();
    expect(loadConnection()).toBeNull();
  });
});
