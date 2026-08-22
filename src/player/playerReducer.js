export function createInitialPlayerState(tracks) {
  return {
    status: "stopped",
    currentTrackIndex: 0,
    tracks,
  };
}

export function playerReducer(state, action) {
  switch (action.type) {
    case "PLAY":
      return { ...state, status: "playing" };
    case "PAUSE":
      return { ...state, status: "paused" };
    case "STOP":
      return { ...state, status: "stopped" };
    case "SKIP_NEXT":
      return {
        ...state,
        status: "paused",
        currentTrackIndex: (state.currentTrackIndex + 1) % state.tracks.length,
      };
    case "SKIP_PREV":
      return {
        ...state,
        status: "paused",
        currentTrackIndex:
          (state.currentTrackIndex - 1 + state.tracks.length) %
          state.tracks.length,
      };
    default:
      return state;
  }
}
