import { parseBlob, selectCover } from "music-metadata";

/*
  Reads ID3/MP4/FLAC/etc. tags directly out of a local audio File in the
  browser (no server round-trip). Falls back to filename-derived values
  if the file has no tags or fails to parse — a corrupt/unusual file
  shouldn't break loading the rest of the folder.
*/
export async function readTrackMetadata(file) {
  const fallbackTitle = file.name.replace(/\.[^/.]+$/, "");

  try {
    const { common } = await parseBlob(file);
    const cover = selectCover(common.picture);
    const coverArtUrl = cover
      ? URL.createObjectURL(new Blob([cover.data], { type: cover.format }))
      : null;

    return {
      title: common.title || fallbackTitle,
      album: common.album || "My Files",
      artist: common.artist || "Unknown Artist",
      coverArtUrl,
    };
  } catch {
    return {
      title: fallbackTitle,
      album: "My Files",
      artist: "Unknown Artist",
      coverArtUrl: null,
    };
  }
}
