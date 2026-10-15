import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import i18n from "..";

const BRAND_NAMES = new Set([
  "Deutsche Bank",
  "Kompass",
  "K◉mpass",
  "Aa",
  "Deutsche Bank. Kompass",
]);

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory())
      return ["__tests__", "mocks"].includes(entry.name)
        ? []
        : sourceFiles(filename);
    return /\.tsx?$/.test(entry.name) ? [filename] : [];
  });
}

it("keeps visible text and accessibility labels translated in old and new UI", () => {
  const failures: string[] = [];
  for (const filename of sourceFiles(path.resolve(__dirname, "../.."))) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function checkLiteral(text: string) {
      if (/\p{L}/u.test(text) && !BRAND_NAMES.has(text.trim()))
        failures.push(`${filename}: ${text.trim()}`);
    }
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) checkLiteral(node.text);
      if (
        ts.isJsxAttribute(node) &&
        [
          "title",
          "accessibilityLabel",
          "accessibilityHint",
          "placeholder",
        ].includes(node.name.getText(source)) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        checkLiteral(node.initializer.text);
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "t" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const key = node.arguments[0].text;
        for (const language of ["en", "es", "sw"])
          if (
            !i18n.exists(key, { lng: language }) &&
            !i18n.exists(`${key}_other`, { lng: language })
          )
            failures.push(`${filename}: missing ${language}:${key}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(failures).toEqual([]);
});
