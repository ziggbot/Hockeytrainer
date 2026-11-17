import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// React treats whatever an effect returns as its cleanup. An arrow with an
// expression body returns that expression: `useEffect(() => window.scrollTo(0, 0))`
// returns a Promise in current Chrome and blanked the whole app on the next
// navigation. Effects must use a block body.

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("effects", () => {
  it("never use an expression body (the value would become the cleanup)", () => {
    const root = new URL(".", import.meta.url).pathname;
    const offenders = sources(root).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /use(Layout)?Effect\(\s*\(\)\s*=>\s*[^{\s]/.test(line))
        .map(({ i }) => `${file.slice(root.length)}:${i + 1}`)
    );
    expect(offenders).toEqual([]);
  });
});
