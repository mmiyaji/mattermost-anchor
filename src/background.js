// Registers the content script only for the Mattermost origin the user has granted.
importScripts("lib/anchor.js");
const { parseServerUrl } = globalThis.MattermostAnchor;

const SCRIPT_ID = "mattermost-anchor";

async function doSync() {
  const s = await chrome.storage.local.get({ serverUrl: "", enabled: true, categoryId: "" });
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });

  const server = parseServerUrl(s.serverUrl);
  if (!s.enabled || !s.categoryId || !server) return;
  if (!(await chrome.permissions.contains({ origins: [server.pattern] }))) return;

  await chrome.scripting.registerContentScripts([
    {
      id: SCRIPT_ID,
      matches: [server.pattern],
      js: ["lib/anchor.js", "content.js"],
      runAt: "document_start",
      persistAcrossSessions: true,
    },
  ]);
}

// Serialise so overlapping events cannot double-register the script.
let queue = Promise.resolve();
function sync() {
  queue = queue.then(doSync).catch((e) => console.error("[anchor] sync failed", e));
  return queue;
}

chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.permissions.onAdded.addListener(sync);
chrome.permissions.onRemoved.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ("serverUrl" in changes || "enabled" in changes || "categoryId" in changes)) sync();
});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
