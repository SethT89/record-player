import { describe, it, expect } from "vitest";
import { createInitialPlayerState, playerReducer } from "./playerReducer";

const tracks = [
  { title: "Track A", album: "Album A", artist: "Artist A" },
  { title: "Track B", album: "Album B", artist: "Artist B" },
  { title: "Track C", album: "Album C", artist: "Artist C" },
];

describe("createInitialPlayerState", () => {
  it("starts stopped at the first track", () => {
    const state = createInitialPlayerState(tracks);
    expect(state.status).toBe("stopped");
    expect(state.currentTrackIndex).toBe(0);
  });
});

describe("playerReducer", () => {
  it("PLAY sets status to playing", () => {
    const state = createInitialPlayerState(tracks);
    const next = playerReducer(state, { type: "PLAY" });
    expect(next.status).toBe("playing");
  });

  it("PAUSE sets status to paused", () => {
    const state = { ...createInitialPlayerState(tracks), status: "playing" };
    const next = playerReducer(state, { type: "PAUSE" });
    expect(next.status).toBe("paused");
  });

  it("STOP sets status to stopped from playing", () => {
    const state = { ...createInitialPlayerState(tracks), status: "playing" };
    const next = playerReducer(state, { type: "STOP" });
    expect(next.status).toBe("stopped");
  });

  it("STOP sets status to stopped from paused", () => {
    const state = { ...createInitialPlayerState(tracks), status: "paused" };
    const next = playerReducer(state, { type: "STOP" });
    expect(next.status).toBe("stopped");
  });

  it("SKIP_NEXT advances the track index", () => {
    const state = createInitialPlayerState(tracks);
    const next = playerReducer(state, { type: "SKIP_NEXT" });
    expect(next.currentTrackIndex).toBe(1);
  });

  it("SKIP_NEXT wraps from the last track back to the first", () => {
    const state = { ...createInitialPlayerState(tracks), currentTrackIndex: 2 };
    const next = playerReducer(state, { type: "SKIP_NEXT" });
    expect(next.currentTrackIndex).toBe(0);
  });

  it("SKIP_PREV wraps from the first track back to the last", () => {
    const state = createInitialPlayerState(tracks);
    const next = playerReducer(state, { type: "SKIP_PREV" });
    expect(next.currentTrackIndex).toBe(2);
  });

  it("SKIP_NEXT forces status to paused even while playing", () => {
    const state = { ...createInitialPlayerState(tracks), status: "playing" };
    const next = playerReducer(state, { type: "SKIP_NEXT" });
    expect(next.status).toBe("paused");
  });

  it("SKIP_PREV forces status to paused even while playing", () => {
    const state = {
      ...createInitialPlayerState(tracks),
      status: "playing",
      currentTrackIndex: 1,
    };
    const next = playerReducer(state, { type: "SKIP_PREV" });
    expect(next.status).toBe("paused");
  });
});
