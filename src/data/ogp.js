/* ===========================================================
   OGPチェッカー — ページの読みもの（入門ガイド・用語集・FAQ）
   サンプル結果は ogp-samples.js、フレームワーク別コードは lib/ogp-code.js
   =========================================================== */

const OGP_DATA = (function () {
  // ページの内容（解説・用語集・FAQ・機能）を変えたら更新する。画面の「最終更新」と JSON-LD の dateModified に使う
  const UPDATED = "2026-10-08";

  // ---- 「試しにチェックしてみる」 ------------------------------------
  const EXAMPLE_CHIPS = [
    { label: "insemble（運営会社のサイト）", url: "https://www.insemble.co.jp" },
  ];

  // ---- 入門ガイド（ページでは only で選んだものだけ出す）---------
  // ref：根拠になる一次情報へのリンク
  const GUIDE = [
    { h: "OGPとは？", p: "OGP（Open Graph Protocol）は、ページのタイトル・画像・説明文をSNSやチャットツールに伝えるための共通ルールです。HTMLの <head>（ページの設定を書く部分）に専用のタグを書いておくと、URLをシェアしたときに、画像付きのカードで表示されます。", ref: { label: "Open Graph Protocol の公式サイト（英語）", href: "https://ogp.me/" } },
    { h: "なぜ設定する価値があるのか", p: "同じ記事でも、画像付きのカードと文字だけのリンクでは、クリックされる割合が大きく変わります。OGPは一度設定すれば、X・Facebook・LINE・Slack・Discordなど多くのサービスで同じ設定が使われるので、手間のわりに効果の大きい設定です。" },
    { h: "まず設定したい4つのタグ", list: ["og:title — シェアされたときに出るタイトル", "og:description — 説明文。120文字以内が目安です", "og:image — 画像。1200×630pxで、https:// から始まるURLで書きます", "twitter:card — Xでのカードの形。summary_large_image にすると画像が大きく出ます"] },
    { h: "画像でつまずかないコツ", p: "画像は、https:// から始まるURL（絶対URL）で書きます。サイズは1200×630px、容量は1MBくらいまでが目安です。画像に文字を入れるときは、SNSで小さく表示されても読める大きさにしておくと安心です。" },
  ];

  // ---- 用語集 ----------------------------------------------------
  const GLOSSARY = [
    { term: "og:title", cat: "基本", short: "シェアされたときに出るタイトル", body: "SNSでURLがシェアされたときに、カードの見出しとして表示されるタイトルです。ページの <title> とは別に、シェア向けの文言を指定できます。", example: '<meta property="og:title" content="記事のタイトル">' },
    { term: "og:description", cat: "基本", short: "カードに出る説明文", body: "シェアされたカードに表示される、短い説明文です。検索結果に出る説明文（meta description）と同じように、読みたくなる要約を書きます。120文字以内に収めると、途中で切れにくくなります。", example: '<meta property="og:description" content="ページの要約文">' },
    { term: "og:image", cat: "基本", short: "カードに出る画像", body: "カードに表示される画像のURLです。カードの中でいちばん目立ち、クリックされるかどうかを大きく左右します。https:// から始まるURL（絶対URL）で書き、サイズは1200×630pxをおすすめします。", example: '<meta property="og:image" content="https://example.com/ogp.png">' },
    { term: "og:image:width / height", cat: "画像", short: "画像の幅と高さ（px）", body: "画像の幅と高さを伝えるタグです。SNSが画像を読み込む前に大きさが分かるので、初めてシェアされたときの表示崩れを防げます。", example: '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' },
    { term: "og:url", cat: "基本", short: "ページの正式なURL", body: "そのページを代表する、正式なURLです。末尾に ?ref=… などが付いた同じページのURLを、1つにまとめる役割もあります。", example: '<meta property="og:url" content="https://example.com/article">' },
    { term: "og:site_name", cat: "基本", short: "サイト全体の名前", body: "ページごとのタイトルとは別の、サイト全体の名前です。ブログ名やサービス名を入れます。", example: '<meta property="og:site_name" content="サイト名">' },
    { term: "og:type", cat: "基本", short: "ページの種類", body: "ページの種類を表します。トップページは website、記事は article がよく使われます。", example: '<meta property="og:type" content="article">' },
    { term: "twitter:card", cat: "X（Twitter）", short: "Xでのカードの形", body: "X（旧Twitter）で表示されるカードの種類です。summary_large_image にすると大きな画像付きのカード、summary にすると小さな正方形の画像付きのカードになります。", example: '<meta name="twitter:card" content="summary_large_image">' },
    { term: "twitter:title", cat: "X（Twitter）", short: "X用のタイトル", body: "X向けに、og:title とは別に指定するタイトルです。設定していないときは og:title が使われます。", example: '<meta name="twitter:title" content="X用タイトル">' },
    { term: "twitter:image", cat: "X（Twitter）", short: "X用の画像", body: "X向けに、og:image とは別に指定する画像です。設定していないときは og:image が使われます。", example: '<meta name="twitter:image" content="https://example.com/x-ogp.png">' },
    { term: "canonical", cat: "SEO", short: "正式なURLを検索エンジンに伝える", body: "同じ内容のページが複数のURLで開けるときに、どれが正式なURLかを検索エンジンに伝えるタグです。検索での評価が、複数のURLに分かれてしまうのを防げます。", example: '<link rel="canonical" href="https://example.com/article">' },
    { term: "fb:app_id", cat: "Facebook", short: "Facebookのアプリ連携用のID", body: "Facebookのインサイト（アクセス分析）やアプリ連携で使うIDです。一般的なブログやサイトなら、なくても大丈夫です。", example: '<meta property="fb:app_id" content="1234567890">' },
  ];

  // ---- FAQ -------------------------------------------------------
  const FAQ = [
    { cat: "基本", q: "OGPを確認する方法は？", a: "このOGPチェッカーにURLを貼り付けると、og:title・og:image・og:description などの設定と、X・Facebook・LINE・Slack・Discord・Teams での見え方をまとめて確認できます。ブラウザの「ページのソースを表示」で meta タグを直接見ることもできますが、SNSでの見え方まで確かめるなら、ツールを使うほうが手軽です。" },
    { cat: "基本", q: "OGPとは何ですか？", a: "OGP（Open Graph Protocol）は、Facebookが作った、ページの情報をSNSに伝えるためのルールです。og:title・og:image・og:description などのタグを設定しておくと、SNSやチャットツールでURLをシェアしたときに、タイトル・画像・説明文が正しく表示されます。" },
    { cat: "画像", q: "OGP画像の推奨サイズは？", a: "おすすめは 1200×630px（横長）です。小さくても600×315px以上にしてください。形式はPNGかJPEGで、容量は8MB未満にします。og:image:width と og:image:height（画像の幅と高さ）も書いておくと、各SNSが画像の大きさを正しく読み取れます。" },
    { cat: "X（Twitter）", q: "twitter:card を設定しないとどうなりますか？", a: "X（旧Twitter）でURLをシェアしたときに、画像のない簡単なカードで表示されます。summary_large_image を設定すると、横長の大きな画像付きのカードになり、クリックされやすくなります。" },
    { cat: "基本", q: "og:title と title 要素の違いは何ですか？", a: "<title> はブラウザのタブやGoogleの検索結果に出るタイトルで、og:title はSNSでシェアされたときに出るタイトルです。両方を設定しておくと、場面ごとに合ったタイトルを出し分けられます。" },
    { cat: "SEO", q: "canonical URL とは何ですか？", a: "同じ内容のページが複数のURLで開けるときに、どれが正式なURLかをGoogleなどの検索エンジンに伝えるタグです。<link rel=\"canonical\" href=\"...\"> の形で書きます。検索での評価（SEO）が複数のURLに分かれず、1つのURLにまとまります。" },
    { cat: "基本", q: "公開前のテスト環境や、社内だけのページもチェックできますか？", a: "チェックできるのは、インターネットから誰でも開けるページです。ログインやBasic認証（IDとパスワードを求める画面）が必要なページ、社内ネットワークやご自身のパソコンの中（localhost など）のページは読み取れません。公開前に確かめたいときは、一時的に外から見られる状態にしてからチェックしてください。" },
    { cat: "トラブル", q: "OGPを設定したのに反映されません。なぜですか？", a: "多くのSNSは、一度読み取ったOGPの情報をしばらくキャッシュ（一時保存）するため、設定を直してもすぐには表示が変わりません。Facebookは「シェアデバッガー」で読み直しを頼めます。Xには自分で更新する公式の方法がないため、時間をおくか、URLの末尾に ?v=2 などを付けて、別のURLとして読み込ませてください。" },
    { cat: "トラブル", q: "LINEでの表示を確認するには？", a: "LINEは og:image・og:title・og:description を読み取って表示します。トーク画面にURLを貼ると、すぐにプレビューが出ます。設定を直したのに前の表示のままのときは、時間をおくか、URLの末尾に ?v=2 などを付けて送り直してください。" },
    { cat: "画像", q: "og:image は相対パスでも大丈夫ですか？", a: "いいえ。og:image は、https:// から始まるURL（絶対URL）で書いてください。/images/ogp.png のような相対パス（https:// を省いた書き方）だと、多くのSNSが画像を読み込めず、カードに画像が出ません。" },
    { cat: "画像", q: "SNSごとに画像サイズは違いますか？", a: "1200×630px（横と縦の比が1.91:1）の画像を1枚用意すれば、ほとんどのSNSで使えます。X の summary カードだけは正方形（1:1）で表示されるため、大事な文字や絵を真ん中に寄せておくと、正方形になっても切れずに済みます。" },
    { cat: "基本", q: "og:type は何を指定すればいいですか？", a: "トップページやサービスサイトは website、ブログ記事やニュースは article が一般的です。article の場合は、公開日を伝える article:published_time などのタグも追加できます。" },
    { cat: "実装", q: "WordPressでOGPを設定するには？", a: "「Yoast SEO」や「All in One SEO」などのプラグイン（追加機能）を入れると、記事ごとにOGPのタイトル・画像・説明文を管理画面から設定できます。テーマの header.php に直接書く方法もあります。" },
    { cat: "X（Twitter）", q: "Xでカードが表示されないのはなぜですか？", a: "よくある原因は、twitter:card や og:image が設定されていない、画像のURLが相対パスになっている、画像のファイルサイズが大きすぎる、robots.txt（検索エンジンなどへの指示を書くファイル）でXの読み取りを止めている、などです。以前あった Card Validator はプレビュー機能が終わっているため、いまはXの投稿画面にURLを貼って確かめます。" },
    { cat: "SEO", q: "og:description と meta description は別ですか？", a: "はい、別のタグです。meta description は検索結果の説明文（スニペット）に、og:description はSNSでシェアされたときのカードに使われます。同じ内容でもかまいませんが、それぞれの場面に合わせて書き分けると、より読まれやすくなります。" },
  ];

  return { UPDATED, EXAMPLE_CHIPS, GUIDE, GLOSSARY, FAQ };
})();

export default OGP_DATA;
