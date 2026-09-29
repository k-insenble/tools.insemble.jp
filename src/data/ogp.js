/* ===========================================================
   OGPチェッカー — ページの読みもの（入門ガイド・用語集・FAQ）
   サンプル結果は ogp-samples.js、フレームワーク別コードは lib/ogp-code.js
   =========================================================== */

const OGP_DATA = (function () {
  // ページの内容（解説・用語集・FAQ・機能）を変えたら更新する。画面の「最終更新」と JSON-LD の dateModified に使う
  const UPDATED = "2026-09-29";

  // ---- 「試しにチェックしてみる」 ------------------------------------
  const EXAMPLE_CHIPS = [
    { label: "insemble（運営会社のサイト）", url: "https://www.insemble.co.jp" },
  ];

  // ---- 入門ガイド（ページでは only で選んだものだけ出す）---------
  // ref：根拠になる一次情報へのリンク
  const GUIDE = [
    { h: "OGPとは？", p: "OGP（Open Graph Protocol）は、Webページの内容をSNSやチャットツールに正しく伝えるための「メタデータの共通ルール」です。HTMLの <head> に専用のタグを書いておくと、URLをシェアしたときにタイトル・画像・説明文がきれいなカードで表示されます。", ref: { label: "Open Graph Protocol 公式仕様", href: "https://ogp.me/" } },
    { h: "なぜ設定する価値があるのか", p: "同じ記事でも、画像付きのカードと文字だけのリンクではクリック率が大きく変わります。OGPは一度設定すれば、X・Facebook・LINE・Slack・Discordなど多くのサービスで使い回せる、費用対効果の高い施策です。" },
    { h: "最低限おさえるべき4つのタグ", list: ["og:title — シェア時のタイトル", "og:description — 説明文（120文字以内が安全）", "og:image — 1200×630pxの画像（絶対URL）", "twitter:card — summary_large_image を指定"] },
    { h: "画像でつまずかないコツ", p: "画像は必ず https:// から始まる絶対URLで指定します。サイズは1200×630px、容量は軽め（〜1MB目安）に。文字を入れる場合は、SNSで縮小表示されても読める大きさにしておくと安心です。" },
  ];

  // ---- 用語集 ----------------------------------------------------
  const GLOSSARY = [
    { term: "og:title", cat: "基本", short: "シェア時に表示されるタイトル", body: "SNSでURLがシェアされたときにカードの見出しとして表示されるタイトル。ページの <title> とは別に、シェアに最適化した文言を指定できます。", example: '<meta property="og:title" content="記事のタイトル">' },
    { term: "og:description", cat: "基本", short: "カードに表示される説明文", body: "シェアカードの本文として表示される短い説明。検索結果のディスクリプションと同様、クリックを促す要約を書きます。120文字以内が安全です。", example: '<meta property="og:description" content="ページの要約文">' },
    { term: "og:image", cat: "基本", short: "シェアカードのサムネイル画像", body: "カードに表示される画像のURL。最も目立つ要素で、クリック率に直結します。絶対URLで指定し、1200×630pxを推奨します。", example: '<meta property="og:image" content="https://example.com/ogp.png">' },
    { term: "og:image:width / height", cat: "画像", short: "画像の幅と高さ(px)", body: "画像の寸法を明示するタグ。SNS側でのレイアウト確定が速くなり、初回シェア時の表示崩れを防げます。", example: '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' },
    { term: "og:url", cat: "基本", short: "ページの正規URL", body: "そのコンテンツを代表する正規のURL。クエリパラメータ付きの重複URLを一つにまとめる役割もあります。", example: '<meta property="og:url" content="https://example.com/article">' },
    { term: "og:site_name", cat: "基本", short: "サイト全体の名前", body: "個々のページタイトルとは別の、サイト名。「ブログ名」「サービス名」を入れます。", example: '<meta property="og:site_name" content="サイト名">' },
    { term: "og:type", cat: "基本", short: "コンテンツの種類", body: "ページの種類を表します。トップページは website、記事は article がよく使われます。", example: '<meta property="og:type" content="article">' },
    { term: "twitter:card", cat: "X(Twitter)", short: "Xのカード形式", body: "X(旧Twitter)でのカードの種類。summary_large_image で大きな画像カード、summary で小さな正方形カードになります。", example: '<meta name="twitter:card" content="summary_large_image">' },
    { term: "twitter:title", cat: "X(Twitter)", short: "X用のタイトル", body: "X向けに個別指定するタイトル。未設定の場合は og:title が使われます。", example: '<meta name="twitter:title" content="X用タイトル">' },
    { term: "twitter:image", cat: "X(Twitter)", short: "X用の画像", body: "X向けに個別指定する画像。未設定の場合は og:image が使われます。", example: '<meta name="twitter:image" content="https://example.com/x-ogp.png">' },
    { term: "canonical", cat: "SEO", short: "正規URLを検索エンジンに伝える", body: "同じ内容が複数URLで存在する場合に、検索エンジンへ「正規のURL」を伝えるタグ。重複コンテンツの評価分散を防ぎます。", example: '<link rel="canonical" href="https://example.com/article">' },
    { term: "fb:app_id", cat: "Facebook", short: "Facebookアプリ連携ID", body: "Facebook インサイトやアプリ連携で使うID。一般的なブログでは必須ではありません。", example: '<meta property="fb:app_id" content="1234567890">' },
  ];

  // ---- FAQ -------------------------------------------------------
  const FAQ = [
    { cat: "基本", q: "OGPを確認する方法は？", a: "このOGPチェッカーにURLを貼り付けるだけで、og:title・og:image・og:description などの設定状況と、X・Facebook・LINE・Slack・Discord・Teams での見え方をまとめて確認できます。ブラウザの「ページのソースを表示」から meta タグを直接見ることもできますが、SNSでの見え方まではわからないため、ツールで確かめるのが手軽です。" },
    { cat: "基本", q: "OGPとは何ですか？", a: "OGP（Open Graph Protocol）は、Facebookが策定したWebページのメタデータ仕様です。og:title・og:image・og:description などのタグを設定することで、SNSやチャットツールでURLをシェアしたときにタイトル・画像・説明文が正しく表示されます。" },
    { cat: "画像", q: "OGP画像の推奨サイズは？", a: "推奨サイズは 1200×630ピクセル（横長）です。最低でも600×315px以上が必要です。ファイル形式はPNGまたはJPEGを使用し、容量は8MB未満にしてください。og:image:width と og:image:height も合わせて設定すると、各SNSが画像を正しく認識します。" },
    { cat: "X(Twitter)", q: "twitter:card を設定しないとどうなりますか？", a: "X（旧Twitter）でURLをシェアしたときに、画像のないシンプルなカードで表示されます。summary_large_image を設定すると大きな横長の画像カードになり、クリック率の向上が期待できます。" },
    { cat: "基本", q: "og:title と title 要素の違いは何ですか？", a: "<title> はブラウザのタブやGoogle検索結果に使われ、og:title はSNSでシェアされたときに表示されるタイトルです。両方を設定しておくと、それぞれの場面で最適なタイトルを指定できます。" },
    { cat: "SEO", q: "canonical URL とは何ですか？", a: "同じコンテンツが複数のURLで表示される場合に「正規のURL」をGoogleに伝えるタグです。<link rel=\"canonical\" href=\"...\"> で指定します。重複コンテンツのリスクを防ぎ、SEO評価を一つのURLに集約できます。" },
    { cat: "トラブル", q: "OGPを設定したのに反映されません。なぜですか？", a: "多くのSNSはOGP情報をキャッシュ（一時保存）しているため、設定を変えてもすぐには反映されないことがあります。Facebookは「シェアデバッガー」で再取得をリクエストできます。Xには手動で更新する公式の方法がないので、時間をおくか、URLの末尾にクエリ（?v=2 など）を付けて別のURLとして読み込ませます。" },
    { cat: "トラブル", q: "LINEでの表示を確認するには？", a: "LINEは og:image・og:title・og:description を参照します。トーク画面にURLを貼ると即時にプレビューが表示されますが、キャッシュが残る場合は時間をおくか、URL末尾にクエリ（?v=2 など）を付けて再取得します。" },
    { cat: "画像", q: "og:image は相対パスでも大丈夫ですか？", a: "いいえ。og:image は必ず https:// から始まる絶対URLで指定してください。相対パスでは多くのSNSが画像を取得できず、シェアカードに画像が表示されません。" },
    { cat: "画像", q: "SNSごとに画像サイズは違いますか？", a: "基本は 1200×630px（1.91:1）で各SNSに対応できます。X の summary カードのみ正方形（1:1）で表示されるため、正方形でも見栄えする構図にしておくと安心です。" },
    { cat: "基本", q: "og:type は何を指定すればいいですか？", a: "トップページやサービスサイトは website、ブログ記事やニュースは article が一般的です。article の場合は article:published_time など追加タグも設定できます。" },
    { cat: "実装", q: "WordPressでOGPを設定するには？", a: "「Yoast SEO」や「All in One SEO」などのプラグインを使うと、記事ごとにOGPタイトル・画像・説明文を管理画面から設定できます。テーマのheader.phpに直接記述する方法もあります。" },
    { cat: "X(Twitter)", q: "Xでカードが表示されないのはなぜですか？", a: "twitter:card や og:image が未設定、画像URLが相対パス、画像が大きすぎる、robots.txtでクローラーをブロックしている、などが主な原因です。以前の Card Validator はプレビュー機能が終了しているため、いまはXの投稿画面にURLを貼って表示を確かめます。" },
    { cat: "SEO", q: "og:description と meta description は別ですか？", a: "はい、別のタグです。meta description は検索結果の説明文（スニペット）に、og:description はSNSでシェアされたときのカードに使われます。同じ内容でもかまいませんが、それぞれの場面に合わせた文章にしておくと効果的です。" },
  ];

  return { UPDATED, EXAMPLE_CHIPS, GUIDE, GLOSSARY, FAQ };
})();

export default OGP_DATA;
