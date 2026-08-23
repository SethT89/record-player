import { describe, it, expect } from "vitest";
import {
  buildApiUrl,
  parseArtistsResponse,
  parseArtistAlbumsResponse,
  parseSearch3Response,
  parseAlbumTracksResponse,
  getCoverArtUrl,
  getStreamUrl,
} from "./subsonic";

const connection = {
  serverUrl: "https://music.example.com",
  username: "alice",
  salt: "abc123",
  token: "deadbeef",
};

describe("buildApiUrl", () => {
  it("includes auth params and the standard client identifiers", () => {
    const url = buildApiUrl(connection, "ping.view");
    expect(url).toContain("https://music.example.com/rest/ping.view?");
    expect(url).toContain("u=alice");
    expect(url).toContain("t=deadbeef");
    expect(url).toContain("s=abc123");
    expect(url).toContain("v=1.16.1");
    expect(url).toContain("c=RecordPlayer");
    expect(url).toContain("f=json");
  });

  it("strips a trailing slash from serverUrl instead of producing a double slash", () => {
    const trailing = { ...connection, serverUrl: "https://music.example.com/" };
    const url = buildApiUrl(trailing, "ping.view");
    expect(url).toContain("https://music.example.com/rest/ping.view?");
    expect(url).not.toContain("com//rest");
  });

  it("merges in extra params", () => {
    const url = buildApiUrl(connection, "getArtist.view", { id: "42" });
    expect(url).toContain("id=42");
  });
});

describe("parseArtistsResponse", () => {
  it("flattens the alphabetical index into a plain artist list", () => {
    const body = {
      artists: {
        index: [
          { name: "A", artist: [{ id: "1", name: "ABBA" }] },
          { name: "B", artist: [{ id: "2", name: "Beatles" }, { id: "3", name: "Blur" }] },
        ],
      },
    };
    expect(parseArtistsResponse(body)).toEqual([
      { id: "1", name: "ABBA" },
      { id: "2", name: "Beatles" },
      { id: "3", name: "Blur" },
    ]);
  });

  it("returns an empty array when there are no artists", () => {
    expect(parseArtistsResponse({})).toEqual([]);
  });
});

describe("parseArtistAlbumsResponse", () => {
  it("maps an artist's albums", () => {
    const body = {
      artist: { id: "1", name: "ABBA", album: [{ id: "10", name: "Arrival", coverArt: "al-10" }] },
    };
    expect(parseArtistAlbumsResponse(body)).toEqual([
      { id: "10", title: "Arrival", coverArt: "al-10" },
    ]);
  });

  it("returns an empty array when the artist has no albums", () => {
    expect(parseArtistAlbumsResponse({ artist: { id: "1", name: "ABBA" } })).toEqual([]);
  });
});

describe("parseSearch3Response", () => {
  it("maps matching albums", () => {
    const body = {
      searchResult3: {
        album: [{ id: "20", name: "Please Please Me", artist: "The Beatles", coverArt: "al-20" }],
      },
    };
    expect(parseSearch3Response(body)).toEqual([
      { id: "20", title: "Please Please Me", artist: "The Beatles", coverArt: "al-20" },
    ]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(parseSearch3Response({ searchResult3: {} })).toEqual([]);
  });
});

describe("getCoverArtUrl / getStreamUrl", () => {
  it("builds a getCoverArt URL for a given id", () => {
    const url = getCoverArtUrl(connection, "cover-1");
    expect(url).toContain("getCoverArt.view");
    expect(url).toContain("id=cover-1");
  });

  it("returns undefined when there's no cover art id", () => {
    expect(getCoverArtUrl(connection, undefined)).toBeUndefined();
  });

  it("builds a stream URL for a given song id", () => {
    const url = getStreamUrl(connection, "song-1");
    expect(url).toContain("stream.view");
    expect(url).toContain("id=song-1");
  });
});

describe("parseAlbumTracksResponse", () => {
  it("maps an album's songs into the app's standard track shape", () => {
    const body = {
      album: {
        id: "10",
        name: "Arrival",
        coverArt: "al-10",
        song: [
          { id: "100", title: "When I Kissed the Teacher", artist: "ABBA", coverArt: "song-100" },
          { id: "101", title: "Dancing Queen", artist: "ABBA" },
        ],
      },
    };
    const result = parseAlbumTracksResponse(body, connection);

    expect(result.title).toBe("Arrival");
    expect(result.coverArt).toBe(getCoverArtUrl(connection, "al-10"));
    expect(result.tracks).toEqual([
      {
        title: "When I Kissed the Teacher",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "100"),
        coverArt: getCoverArtUrl(connection, "song-100"),
      },
      {
        title: "Dancing Queen",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "101"),
        coverArt: getCoverArtUrl(connection, "al-10"),
      },
    ]);
  });
});
