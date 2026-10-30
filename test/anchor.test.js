const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCss, parseServerUrl } = require("../src/lib/anchor.js");

test("buildCss pins the given category to order 1", () => {
  const css = buildCss("abc123");
  assert.match(css, /\[data-rbd-draggable-id\*="abc123"\]\{order:1!important\}/);
  assert.match(css, /#sidebar-droppable-categories\{display:contents!important\}/);
  assert.match(css, /order:2!important/);
});

test("buildCss scopes every rule with :has so it fails soft", () => {
  for (const rule of buildCss("abc").split("\n")) {
    assert.ok(rule.includes(":has(> #sidebar-droppable-categories)"), rule);
  }
});

test("buildCss rejects empty or unsafe ids", () => {
  for (const bad of ["", undefined, null, 'a"]{x', "a b", "a".repeat(129)]) {
    assert.equal(buildCss(bad), "");
  }
});

test("parseServerUrl normalises", () => {
  assert.deepEqual(parseServerUrl("https://mm.example.com/"), {
    base: "https://mm.example.com",
    origin: "https://mm.example.com",
    pattern: "https://mm.example.com/*",
  });
  assert.equal(parseServerUrl("http://localhost:8065/mm/").base, "http://localhost:8065/mm");
  assert.equal(parseServerUrl("ftp://x"), null);
  assert.equal(parseServerUrl("nope"), null);
});
