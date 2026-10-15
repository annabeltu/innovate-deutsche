import fs from "node:fs";
import path from "node:path";

const SOURCE_ROOT = path.resolve(__dirname, "../..");
// Width, height, size and inset utilities are not applied to Image on web.
const SIZE_UTILITY = /(^|\s)(w|h|size|inset)-|(^|\s)(absolute)(\s|$)/;

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory())
      return entry.name === "__tests__" ? [] : sourceFiles(filename);
    return entry.name.endsWith(".tsx") ? [filename] : [];
  });
}

it("never sizes an Image with className, which web ignores", () => {
  const offenders: string[] = [];
  for (const filename of sourceFiles(SOURCE_ROOT)) {
    const source = fs.readFileSync(filename, "utf8");
    for (const match of source.matchAll(/<Image\b([\s\S]*?)\/>/g)) {
      const className = /className="([^"]*)"/.exec(match[1])?.[1];
      if (className && SIZE_UTILITY.test(className))
        offenders.push(
          `${path.relative(SOURCE_ROOT, filename)}: className="${className}"`,
        );
    }
  }
  expect(offenders).toEqual([]);
});
