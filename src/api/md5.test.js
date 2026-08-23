import { describe, it, expect } from "vitest";
import { md5 } from "./md5";

describe("md5", () => {
  it("matches known RFC 1321 test vectors", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5("a")).toBe("0cc175b9c0f1b6a831c399e269772661");
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(md5("message digest")).toBe("f96b697d7cb7938d525a2f31aaf161d0");
    expect(md5("abcdefghijklmnopqrstuvwxyz")).toBe(
      "c3fcd3d76192e4007dfb496cca67e13b"
    );
    expect(md5("The quick brown fox jumps over the lazy dog")).toBe(
      "9e107d9d372bb6826bd81d3542a419d6"
    );
  });

  it("handles input long enough to span multiple 512-bit blocks", () => {
    expect(
      md5("12345678901234567890123456789012345678901234567890123456789012345678901234567890")
    ).toBe("57edf4a22be3c955ac49da2e2107b67a");
  });

  it("always returns a 32-character lowercase hex string", () => {
    expect(md5("hunter2")).toMatch(/^[0-9a-f]{32}$/);
  });
});
