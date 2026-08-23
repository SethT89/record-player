import { describe, it, expect } from "vitest";
import {
  buildApiUrl,
  parseArtistsResponse,
  parseAlbumsResponse,
  parseAlbumTracksResponse,
  getCoverArtUrl,
  getStreamUrl,
} from "./jellyfin";

const connection = {
  serverUrl: "https://jellyfin.example.com",
  userId: "user-1",
  accessToken: "token-1",
  deviceId: "device-1",
};

describe("buildApiUrl", () => {
  it("includes the api_key auth param", () => {
    const url = buildApiUrl(connection, "/Artists");
    expect(url).toContain("https://jellyfin.example.com/Artists?");
    expect(url).toContain("api_key=token-1");
  });

  it("strips a trailing slash from serverUrl instead of producing a double slash", () => {
    const trailing = { ...connection, serverUrl: "https://jellyfin.example.com/" };
    const url = buildApiUrl(trailing, "/Artists");
    expect(url).toContain("https://jellyfin.example.com/Artists?");
    expect(url).not.toContain("com//Artists");
  });

  it("merges in extra params", () => {
    const url = buildApiUrl(connection, "/Items", { ParentId: "abc" });
    expect(url).toContain("ParentId=abc");
  });
});

describe("parseArtistsResponse", () => {
  it("maps Items into a plain artist list", () => {
    const body = {
      Items: [
        { Id: "1", Name: "ABBA" },
        { Id: "2", Name: "Beatles" },
      ],
    };
    expect(parseArtistsResponse(body)).toEqual([
      { id: "1", name: "ABBA" },
      { id: "2", name: "Beatles" },
    ]);
  });

  it("returns an empty array when there are no artists", () => {
    expect(parseArtistsResponse({})).toEqual([]);
  });
});

describe("parseAlbumsResponse", () => {
  it("maps Items into a plain album list, keyed off each item's own id for cover art", () => {
    const body = {
      Items: [{ Id: "10", Name: "Arrival", AlbumArtist: "ABBA" }],
    };
    expect(parseAlbumsResponse(body, connection)).toEqual([
      {
        id: "10",
        title: "Arrival",
        artist: "ABBA",
        coverArt: getCoverArtUrl(connection, "10"),
      },
    ]);
  });

  it("returns an empty array when there are no albums", () => {
    expect(parseAlbumsResponse({}, connection)).toEqual([]);
  });
});

describe("getCoverArtUrl / getStreamUrl", () => {
  it("builds a cover art URL for a given item id", () => {
    const url = getCoverArtUrl(connection, "item-1");
    expect(url).toContain("/Items/item-1/Images/Primary");
    expect(url).toContain("api_key=token-1");
  });

  it("returns undefined when there's no item id", () => {
    expect(getCoverArtUrl(connection, undefined)).toBeUndefined();
  });

  it("builds a stream URL for a given item id, requesting the original file", () => {
    const url = getStreamUrl(connection, "item-1");
    expect(url).toContain("/Audio/item-1/stream");
    expect(url).toContain("static=true");
    expect(url).toContain("api_key=token-1");
  });
});

describe("parseAlbumTracksResponse", () => {
  it("maps an album's Items into the app's standard track shape", () => {
    const body = {
      Items: [
        {
          Id: "100",
          Name: "When I Kissed the Teacher",
          Album: "Arrival",
          AlbumId: "10",
          AlbumArtist: "ABBA",
        },
        {
          Id: "101",
          Name: "Dancing Queen",
          Album: "Arrival",
          AlbumId: "10",
          AlbumArtist: "ABBA",
        },
      ],
    };
    const result = parseAlbumTracksResponse(body, connection);

    expect(result.title).toBe("Arrival");
    expect(result.coverArt).toBe(getCoverArtUrl(connection, "10"));
    expect(result.tracks).toEqual([
      {
        title: "When I Kissed the Teacher",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "100"),
        coverArt: getCoverArtUrl(connection, "100"),
      },
      {
        title: "Dancing Queen",
        album: "Arrival",
        artist: "ABBA",
        previewUrl: getStreamUrl(connection, "101"),
        coverArt: getCoverArtUrl(connection, "101"),
      },
    ]);
  });

  it("returns an empty tracks array and no title/coverArt when the album has no tracks", () => {
    expect(parseAlbumTracksResponse({}, connection)).toEqual({
      title: undefined,
      coverArt: undefined,
      tracks: [],
    });
  });
});
