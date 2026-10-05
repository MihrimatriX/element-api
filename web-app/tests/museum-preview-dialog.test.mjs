// Source contracts of the /periodic preview dialog and tile navigation: the dialog stays wide,
// scrolls inside itself instead of clipping or clamping text, returns focus to the tile, and
// opening a record never reloads the page.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const dialog = read("src/components/periodic/ElementPreviewDialog.tsx");
const navigation = read("src/components/periodic/useTileNavigation.ts");
const explorer = read("src/components/PeriodicExplorer.tsx");
const modalPanel = read("src/components/ui/classes.ts").match(/modalPanelClass =\s*"([^"]+)"/)?.[1];

describe("element preview dialog", () => {
  it("is a wide modal with a named close button", () => {
    assert.match(dialog, /<DialogContent[\s\S]*?closeLabel="Önizlemeyi kapat"/);
    assert.match(dialog, /sm:max-w-3xl/);
    assert.match(dialog, /<DialogTitle/);
  });

  it("scrolls inside the viewport instead of locking a height or clamping the summary", () => {
    assert.ok(modalPanel, "ui/classes.ts exports modalPanelClass");
    assert.match(modalPanel, /max-h-\[calc\(100dvh-2rem\)\]/);
    assert.match(modalPanel, /overflow-y-auto/);
    assert.doesNotMatch(dialog, /line-clamp|\bh-\[|max-h-/);
  });

  it("returns focus to the tile that opened it", () => {
    assert.match(dialog, /onCloseAutoFocus=\{\(event\) => \{\s*event\.preventDefault\(\);\s*onReturnFocus\(\);/);
    assert.match(explorer, /onReturnFocus=\{\(\) => focusTile\(selected\)\}/);
  });
});

describe("periodic explorer navigation", () => {
  it("opens records through the router, never with a full page load", () => {
    for (const source of [navigation, explorer]) {
      assert.match(source, /useNavigate\(\)/);
      assert.doesNotMatch(source, /window\.location/);
    }
    assert.match(navigation, /event\.key === "Enter"[\s\S]*?navigate\(`\/element\/\$\{symbol\.toLowerCase\(\)\}`\)/);
  });

  it("keeps data-symbol tiles, the page SEO and the single page heading", () => {
    assert.match(read("src/components/periodic/ExplorerTile.tsx"), /<ElementTile/);
    assert.match(read("src/components/ui/element-tile.tsx"), /"data-symbol": symbol/);
    assert.match(explorer, /<Seo[\s\S]*?title="Periyodik tablo · ElementAPI"[\s\S]*?path="\/periodic"/);
    assert.match(explorer, /<PageHeader/);
  });
});
