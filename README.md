# insemble tools（Astro + Tailwind）

`https://tools.insemble.jp/` に置く無料Webツール集です。
今回入っているのは次の2ページです。

| URL | ページ | 中身 |
|---|---|---|
| `/` | ツールハブ | URL入力 → ツールへ、いま使えるツール、ツール索引、FAQ、運営会社 |
| `/ogp/` | OGPチェッカー | 上＝道具ゾーン（入力→点数→直すところ→プレビュー→コード）／下＝読みもの |

ブログ・利用規約・カテゴリページは**まだ入れていません**。リンクも外してあります（公開後に追加）。

---

## はじめかた

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に書き出し
npm run preview
```

- Node 22.12 以上（`.nvmrc` は 24。nvm なら `nvm use`）
- `.env*` は git に入れていません。最初に `cp .env.example .env.development` で作ってください。
- 開発中は `.env.development` の `PUBLIC_OGP_MOCK=true` で、OGPチェッカーが**サンプルの結果**を返します（PHP不要）。本番は未設定（＝false）で、本物の `/api/ogp.php` を使います。
- PHPも手元で試す場合：`php -S localhost:8000 -t public` を起動し、`PUBLIC_OGP_MOCK=false` にします。`/api` は `astro.config.mjs` の proxy で 8000 番へ流れます。

## Xserver への公開

1. サーバーパネルでサブドメイン `tools.insemble.jp` を追加し、無料SSLを有効にする
2. `npm run build`
3. `dist/` の**中身**をサブドメインの公開フォルダへアップロード
   - `dist/api/ogp.php`（OGPの取得）と `dist/.htaccess` も一緒に上がります
4. PHP のバージョンは **8.0 以上**（cURL・DOM・mbstring は Xserver 標準で有効）
5. 公開後に確認
   - `https://tools.insemble.jp/ogp/` で自社サイトのURLをチェックできる
   - `https://tools.insemble.jp/ogp/#url=https://www.insemble.co.jp` を開くと、自動でチェックされる
   - `/sitemap-index.xml` が出ている

### 画像（入っています）
- `public/og-image.png`（1200×630。全ページ共通。ページごとに変えるときは Base の `ogImage` で指定）
- `favicon.svg` ／ `favicon-32.png` ／ `favicon-48.png`（Google検索結果用）／ `apple-touch-icon.png`（180）／ `icon-192.png` ／ `icon-512.png` ／ `site.webmanifest`
- 元データはデザインプロジェクトの「OGP画像.html」。文言を変えたら書き出し直してください。

### 公開前に用意するもの
- `src/data/hub.js` の `CHANGELOG`（公開日など）を実際の内容に。更新情報は `SHOW_UPDATES = false` で非表示中

---

## フォルダ構成

```
public/
  api/ogp.php          OGPの取得（PHP）。採点はしない
  .htaccess            https統一・末尾スラッシュ・キャッシュ
  favicon.svg / robots.txt
src/
  layouts/Base.astro   <head>（title/description/OGP/canonical/JSON-LD/フォント）
  pages/index.astro    ツールハブ
  pages/ogp/index.astro OGPチェッカー
  pages/404.astro
  components/
    Header / Footer / Corp / SectionHead / Icon / Faq .astro   共通の部品
    ogp/Glossary.astro   用語集（本文は最初から HTML に出す）
  scripts/
    site.js            ヘッダーの背景・ページ内リンクの位置合わせ
    copy.js            コピーボタン（Astro 側とブラウザ側の両方で使う）
    faq.js             よくある質問の開閉・カテゴリ
    hub.js             ハブのURL検索・お気に入り／最近使った・一覧の絞り込み
    ogp/page.js        OGPチェッカーの入力・最近のURL・用語集
    ogp/results.js     結果パネル（直すところ／プレビュー／タグ一覧／コード）・シェア
  data/
    hub.js             ★ツールのカタログ（CATS / TOOLS / FAQ / TRUST / CHANGELOG）
    ogp.js             入門ガイド・用語集・FAQ・最終更新日（UPDATED）
    ogp-samples.js     開発用のサンプル結果（モックのときだけ読み込む）
    org.js             運営会社（JSON-LD の Organization）
  lib/
    ogp.js             API呼び出し＋採点ロジック（analyze）
    ogp-code.js        プレビューするサービス・フレームワーク別コード
    icons.js           アイコン（Astro と JS で共通）
  styles/
    global.css         Tailwind 読み込み＋デザイントークン（@theme）
    hub.css / ogp.css  各ページのCSS（デザインから移植）
```

### ページの作り
React などのUIライブラリは使っていません。画面は `.astro` でHTMLとして書き出し（検索エンジンにも本文が見える）、動きは `src/scripts/` の素の JS です。
- JS は `<script>` で読み込むので、Astro が1つにまとめて `type="module"`（defer 扱い）で出します。
- 結果パネルなど、あとから中身が変わる部分は HTML を文字列で組み立てて差し込みます。**チェックしたページから来た値は必ず `esc()` を通す**こと。

### CSS の方針
- `global.css` … Tailwind と**デザイントークン**。`bg-paper` `text-primary-ink` `font-display` `rounded-lg` `p-g-md` などが使えます。
- `hub.css` / `ogp.css` … デザインのCSSをそのまま移植したもの。**@layer に入れていないので、Tailwind のユーティリティより強い**です。同じ要素にユーティリティを当てても効かないときは、ページCSS側のルールを消すか書き換えてください。
- 新しく作るもの（ツールページなど）は Tailwind のユーティリティで書き、整理のタイミングで少しずつページCSSを置き換えていく想定です。

---

## OGPチェッカーの流れ

```
入力 → scripts/ogp/page.js submit()
     → lib/ogp.js checkUrl(url)
         → POST /api/ogp.php（本文に url）… <head> を取得して meta / title / canonical を返す
         → analyze()                 … 点数・タグ一覧・直すところ（修正コード付き）を作る
     → scripts/ogp/results.js renderResults() で表示
```

- **ogp.php の安全対策**：http/https のみ・ポートは 80/443 のみ、プライベートIP・予約IPへの接続を拒否（PHP 8.2 以上は `FILTER_FLAG_GLOBAL_RANGE`、DNSの結果を固定して接続）、リダイレクトは1回ごとに検証（最大5回）、`</head>` か 2MB で読み込みを打ち切り、返すメタタグは og:* / twitter:* / description の60件まで、1IPあたり1分20回まで（IPv6 は /64 単位）。
- 入力URLと結果は**保存しません**。レート制限用に、IPから秘密の鍵で作ったハッシュ（元のIPには戻せない）と回数だけを、公開フォルダの外の `.ogp-rl/` に置き、2分たったものは次のアクセスで消します（作れない環境では一時フォルダ）。
- **フレームワーク別コード**（`lib/ogp-code.js`）は、取得した値を JS の文字列なら `q()`、HTML・JSX の属性なら `a()` を通して埋め込む。利用者がそのまま貼るコードなので、テンプレートを足すときも必ず通す。
- **セキュリティヘッダー**は `public/.htaccess`。CSP はいまは `Report-Only`（様子見）。違反が出ないのを確かめたら `Content-Security-Policy` に変える。HSTS も 1日から始めているので、問題がなければ1年に延ばす。
- 点数のルールは `analyze()` にまとまっています。重み（減点）を変えるならここ。
- 最近チェックしたURLは `localStorage`（`ogp.recent`）にだけ保存。
- `#url=` 付きで開くと自動でチェックします（ハブの入力欄・シェア用リンクもこの形）。`#` から後ろはサーバーに送られないので、アクセスログにURLが残りません。API も POST で受けます。前に配った `?url=` のリンクも開けます。
- ID・パスワード入りのURL（`https://id:pass@…`）は、履歴やシェア用リンクに残らないよう、送る前に止めます。

## ツールを追加するとき
1. `src/data/hub.js` の `TOOLS` に1件追加（`status: "live"`、URLで使うなら `url: true`）
2. `src/pages/<slug>/index.astro` を作る（OGPチェッカーのページを雛形に）
3. ハブの一覧・検索・URL提案・フッターは `TOOLS` から自動で出ます
4. 公開中が3つ以上になると、ハブの「人気ランキング／新着」タブが自動で出ます（`RANK_MIN`）
5. URLで使えるツールが2つ以上になると、ハブでURLを入れたときに「どれでチェックする？」の一覧が出ます

## あとでやること
- microCMS 連携（ブログ・お知らせ）
- ブログ・利用規約ページの追加と、フッター・ヘッダーへのリンク復活
- カテゴリページ（`/category/meta/` など）
- 見出しフォントのサブセット化（使う文字だけのフォントを自前配信して `<link rel="preload">`）
