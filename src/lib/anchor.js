// Shared by the content script, the service worker and the options page.
// Classic script (not an ES module) so it can be listed in registerContentScripts.
(function (root) {
  "use strict";

  const STYLE_ID = "mattermost-anchor-style";
  const CATEGORY_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

  /**
   * Build the stylesheet that moves one category above Unreads.
   * Everything is scoped with :has(), so if Mattermost changes the sidebar DOM
   * and the selectors stop matching, no rule applies (fail soft).
   * Returns "" when categoryId is missing or not a plain id.
   * @param {string} categoryId Mattermost channel category id
   * @returns {string}
   */
  function buildCss(categoryId) {
    if (typeof categoryId !== "string" || !CATEGORY_ID_RE.test(categoryId)) return "";
    const view = "#SidebarContainer .scrollbar--view:has(> #sidebar-droppable-categories)";
    const cats = `${view} > #sidebar-droppable-categories`;
    return [
      `${view}{display:flex!important;flex-direction:column!important}`,
      // Flatten the droppable so Unreads and every category share one flex container.
      `${cats}{display:contents!important}`,
      `${cats} > .SidebarChannelGroup{order:3!important}`,
      // Unreads is the only sibling of the droppable (no data-rbd-draggable-id).
      `${view} > :not(#sidebar-droppable-categories){order:2!important}`,
      `${cats} > .SidebarChannelGroup[data-rbd-draggable-id*="${categoryId}"]{order:1!important}`,
    ].join("\n");
  }

  /**
   * Normalise a user-typed Mattermost URL.
   * @param {string} input
   * @returns {{base: string, origin: string, pattern: string} | null}
   *   base: URL without trailing slash (API root prefix), pattern: host permission / match pattern
   */
  function parseServerUrl(input) {
    let url;
    try {
      url = new URL(String(input || "").trim());
    } catch {
      return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const base = url.origin + url.pathname.replace(/\/+$/, "");
    return { base, origin: url.origin, pattern: url.origin + "/*" };
  }

  root.MattermostAnchor = { STYLE_ID, buildCss, parseServerUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = root.MattermostAnchor;
})(typeof globalThis !== "undefined" ? globalThis : this);
