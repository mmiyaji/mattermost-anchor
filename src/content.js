// Injects the sort stylesheet as a real <style> element.
// Inline styles don't survive: react-custom-scrollbars rewrites .scrollbar--view's style attribute.
(function () {
  "use strict";
  const { STYLE_ID, buildCss } = globalThis.MattermostAnchor;

  function apply(settings) {
    const css = settings.enabled ? buildCss(settings.categoryId) : "";
    let el = document.getElementById(STYLE_ID);
    if (!css) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }

  const DEFAULTS = { enabled: true, categoryId: "" };
  chrome.storage.local.get(DEFAULTS).then(apply);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !("enabled" in changes || "categoryId" in changes)) return;
    chrome.storage.local.get(DEFAULTS).then(apply);
  });
})();
