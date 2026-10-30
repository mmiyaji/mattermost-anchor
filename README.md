# Mattermost Anchor

Chrome extension that pins **one sidebar category above Unreads** in Mattermost Web. Sister project of [Mattermost Deck](https://github.com/mmiyaji/mattermost-deck).

日本語: [README.ja.md](README.ja.md)

## Why

With "Group unread channels separately" enabled, Mattermost shows a dedicated **Unreads** group pinned to the very top of the sidebar. Neither the settings nor the API let you put your own category above it: Unreads is not a real category (category types are only `channels`, `custom`, `direct_messages`, `favorites`), it is a pseudo-group rendered by the display mode, and the design docs state it always sits above every other category.

Anchor overrides that with **CSS only**.

## How it works

The sidebar DOM (verified on Mattermost 9.5.4):

```
div.scrollbar--view
├── div                              ← Unreads (no data-rbd-draggable-id)
└── div#sidebar-droppable-categories
    ├── div.SidebarChannelGroup      ← Channels
    └── div.SidebarChannelGroup      ← Direct Messages
```

Everything is in normal flow (no virtualised list), so flexbox `order` is enough:

- `.scrollbar--view` becomes a column flex container.
- `#sidebar-droppable-categories` gets `display: contents`, so Unreads and the categories become siblings in one flex container.
- The chosen category gets `order: 1`, Unreads `order: 2`, every other category `order: 3`.

The CSS is injected as a real `<style>` element, not inline styles: `.scrollbar--view`'s `style` attribute is managed by react-custom-scrollbars and gets reset on re-render, whereas a stylesheet survives. No DOM nodes are moved, so there is no MutationObserver and nothing to fight React over.

Only **one** category can be pinned. A "show all categories above Unreads" mode is intentionally not provided: with many channels it pushes unreads off screen.

## Install (unpacked)

1. `chrome://extensions` → enable *Developer mode* → *Load unpacked* → select the `src/` folder.
2. The options page opens from the toolbar icon. Enter your Mattermost URL and click *Grant access & load categories* (log in to Mattermost in the same browser first).
3. Pick a category, *Save*, reload the Mattermost tab.

The extension only runs on the origin you grant (`optional_host_permissions`); nothing is sent anywhere. Category lists are fetched from your own server with read-only `GET /api/v4/...` requests using your existing session.

## Development

```bash
npm test             # unit tests for the CSS builder (node:test, no dependencies)
npm run icons        # regenerate src/icons/*.png
```

No bundler or runtime dependencies. Source lives in `src/` as plain JS.

## Known limitations

- **Version dependent.** Verified on Mattermost 9.5.4 only. Newer versions (e.g. 11.x) may change the sidebar DOM, especially around `.scrollbar--view`. All rules are scoped with `:has()` on the expected structure, so if it doesn't match, nothing happens (fail soft).
- **Drag & drop of categories is unverified.** `display: contents` removes the droppable's box, which may affect react-beautiful-dnd when reordering categories. Disable the extension if dragging misbehaves.
- The category is matched by `data-rbd-draggable-id*="<category id>"`; this mapping between the API id and the DOM attribute has only been checked against the 9.5.4 DOM.
- The category list loading relies on cookie auth from the extension page. If it fails, enter the category ID manually.
- Categories are per team; select the category for the team you use most (IDs are unique, so it only affects that team's sidebar).

## License

MIT
