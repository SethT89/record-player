import { useReducer } from "react";
import {
  createInitialPlayerState,
  playerReducer,
} from "../player/playerReducer";

export function usePlayerState(tracks) {
  const [state, dispatch] = useReducer(
    playerReducer,
    tracks,
    createInitialPlayerState
  );

  return {
    status: state.status,
    track: state.tracks[state.currentTrackIndex],
    albumVersion: state.albumVersion,
    play: () => dispatch({ type: "PLAY" }),
    pause: () => dispatch({ type: "PAUSE" }),
    stop: () => dispatch({ type: "STOP" }),
    skipNext: () => dispatch({ type: "SKIP_NEXT" }),
    skipPrev: () => dispatch({ type: "SKIP_PREV" }),
    trackEnded: () => dispatch({ type: "TRACK_ENDED" }),
    loadAlbum: (tracks) => dispatch({ type: "LOAD_ALBUM", tracks }),
  };
}
