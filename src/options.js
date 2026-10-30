"use strict";
const { parseServerUrl, buildCss } = globalThis.MattermostAnchor;

const $ = (id) => document.getElementById(id);
const els = {
  serverUrl: $("serverUrl"),
  categories: $("categories"),
  manualId: $("manualId"),
  enabled: $("enabled"),
  status: $("status"),
};

/** Selected category: { id, name } */
let selected = { id: "", name: "" };

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle("error", isError);
}

async function api(base, path) {
  // X-Requested-With is required when Mattermost authenticates via the session cookie.
  const res = await fetch(`${base}/api/v4${path}`, {
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

function renderCategories(groups) {
  els.categories.replaceChildren();
  for (const { team, categories } of groups) {
    const h = document.createElement("h3");
    h.textContent = team;
    els.categories.append(h);
    for (const c of categories) {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "category";
      radio.checked = c.id === selected.id;
      radio.addEventListener("change", () => {
        selected = { id: c.id, name: c.display_name };
        els.manualId.value = "";
      });
      label.append(radio, `${c.display_name} (${c.type})`);
      els.categories.append(label);
    }
  }
}

async function loadCategories() {
  const server = parseServerUrl(els.serverUrl.value);
  if (!server) return setStatus("Enter a valid http(s) URL.", true);
  // Must be the first await so the click's user gesture is still valid.
  const granted = await chrome.permissions.request({ origins: [server.pattern] });
  if (!granted) return setStatus("Permission was not granted.", true);

  setStatus("Loading…");
  try {
    const teams = await api(server.base, "/users/me/teams");
    const groups = [];
    for (const t of teams) {
      const data = await api(server.base, `/users/me/teams/${t.id}/channels/categories`);
      groups.push({ team: t.display_name, categories: data.categories });
    }
    renderCategories(groups);
    setStatus(`Loaded ${groups.length} team(s).`);
  } catch (e) {
    setStatus(`Could not load categories (${e.message}). Are you logged in? You can enter an ID manually.`, true);
  }
}

async function save() {
  const server = parseServerUrl(els.serverUrl.value);
  if (!server) return setStatus("Enter a valid http(s) URL.", true);
  const manual = els.manualId.value.trim();
  const id = manual || selected.id;
  if (id && !buildCss(id)) return setStatus("Category ID may only contain letters, digits, - and _.", true);

  if (!(await chrome.permissions.request({ origins: [server.pattern] }))) {
    return setStatus("Permission was not granted.", true);
  }
  await chrome.storage.local.set({
    serverUrl: server.base,
    categoryId: id,
    categoryName: manual ? "" : selected.name,
    enabled: els.enabled.checked,
  });
  setStatus(id ? "Saved. Reload your Mattermost tab." : "Saved (no category selected — nothing is pinned).");
}

(async function init() {
  const s = await chrome.storage.local.get({ serverUrl: "", categoryId: "", categoryName: "", enabled: true });
  els.serverUrl.value = s.serverUrl;
  els.enabled.checked = s.enabled;
  selected = { id: s.categoryId, name: s.categoryName };
  if (s.categoryId) {
    els.manualId.value = s.categoryName ? "" : s.categoryId;
    if (s.categoryName) setStatus(`Currently pinned: ${s.categoryName}`);
  }
  $("load").addEventListener("click", loadCategories);
  $("save").addEventListener("click", save);
})();
