# Mattermost Anchor

Mattermost Web のサイドバーで、**自分のカテゴリを 1 つだけ Unreads の上に固定する** Chrome 拡張です。[Mattermost Deck](https://github.com/mmiyaji/mattermost-deck) の姉妹プロジェクトです。

English: [README.md](README.md)

## 解決する課題

サイドバーの「Group unread channels separately」を有効にすると、未読が専用の **Unreads** にまとまり最上部に固定されます。この Unreads より上に自分のカテゴリを置くことは、設定でも API でもできません。Unreads はカテゴリの実体ではなく（カテゴリの type は `channels` / `custom` / `direct_messages` / `favorites` のみ）、表示モードが描画する疑似グループで、設計上も常に他のカテゴリの上に表示されます。

Anchor はこれを **CSS だけ**で覆します。

## 仕組み

サイドバーの DOM（Mattermost 9.5.4 で確認）:

```
div.scrollbar--view
├── div                              ← Unreads（data-rbd-draggable-id なし）
└── div#sidebar-droppable-categories
    ├── div.SidebarChannelGroup      ← CHANNELS
    └── div.SidebarChannelGroup      ← DIRECT MESSAGES
```

いずれも通常フロー（仮想スクロールではない）なので、flexbox の `order` だけで並べ替えられます。

- `.scrollbar--view` を縦方向の flex コンテナにする
- `#sidebar-droppable-categories` を `display: contents` にして、Unreads と各カテゴリを同じ階層に揃える
- 選んだカテゴリを `order: 1`、Unreads を `order: 2`、それ以外のカテゴリを `order: 3` にする

CSS はインラインスタイルではなく **`<style>` 要素**として注入します。`.scrollbar--view` の style 属性は react-custom-scrollbars が管理しており再描画で戻されますが、スタイルシートは残ります。DOM を動かさないので MutationObserver は不要で、React と押し合いになりません。

固定できるのは **1 カテゴリだけ**です。「全カテゴリを Unreads の上に出す」設定は意図的に作っていません（チャンネルが多いと未読が画面外に追いやられるため）。

## インストール（パッケージ化されていない拡張機能）

1. `chrome://extensions` → デベロッパーモード → 「パッケージ化されていない拡張機能を読み込む」→ `src/` フォルダを選択
2. ツールバーのアイコンから設定画面を開き、Mattermost の URL を入力して「Grant access & load categories」を押す（先に同じブラウザで Mattermost にログインしておく）
3. カテゴリを選んで Save、Mattermost のタブをリロード

拡張は許可したオリジンでのみ動作し（`optional_host_permissions`）、外部への送信は行いません。カテゴリ一覧は既存のセッションで自分のサーバーへ読み取り専用の `GET /api/v4/...` を送って取得します。

## 開発

```bash
npm test             # CSS 生成の単体テスト（node:test、依存なし）
npm run icons        # src/icons/*.png を再生成
```

バンドラも実行時依存もありません。`src/` の素の JS がそのまま拡張です。

## 既知の制限

- **バージョン依存。** 動作を確認したのは Mattermost 9.5.4 のみです。新しいバージョン（11.x など）では、特に `.scrollbar--view` 周辺の DOM が変わっている可能性があります。全ルールを想定構造への `:has()` で絞っているため、一致しなければ何も起きません（fail soft）。
- **カテゴリのドラッグ＆ドロップへの影響は未検証。** `display: contents` で droppable の箱が消えるため、react-beautiful-dnd による並べ替えに影響する可能性があります。おかしければ拡張を無効にしてください。
- カテゴリは `data-rbd-draggable-id*="<カテゴリID>"` で特定します。API の ID と DOM 属性の対応は 9.5.4 の DOM でしか確認していません。
- カテゴリ一覧の取得は拡張ページからの Cookie 認証に依存します。失敗した場合はカテゴリ ID を手入力してください。
- カテゴリはチームごとです。主に使うチームのカテゴリを選んでください（ID は一意なので、そのチームのサイドバーにだけ効きます）。

## ライセンス

MIT
