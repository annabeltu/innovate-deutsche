import { readFileSync } from "fs";
import { resolve } from "path";
import { inflateSync } from "zlib";

it.each(["kiko-happy-transparent.png", "kiko-thoughtful-transparent.png"])(
  "preserves real alpha transparency in %s",
  (filename) => {
    const png = readFileSync(
      resolve(__dirname, "../../../assets/challenges", filename),
    );
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(6);
    const chunks: Buffer[] = [];
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      if (png.subarray(offset + 4, offset + 8).toString() === "IDAT")
        chunks.push(png.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    // The first pixel has zero left/up neighbors for every PNG row filter.
    expect(inflateSync(Buffer.concat(chunks))[4]).toBe(0);
  },
);
