/* ===========================================================
   ツールハブ — カタログデータ
   status: "live"(公開中) | "soon"(準備中)
   url: true = URLを入力して使う（URL提案の対象／サーバー経由で取得）
   それ以外は端末内（ブラウザ内）で処理する想定
   =========================================================== */
const HUB = (function () {
  const CATS = [
    { id: "meta", label: "メタタグ・SEO", note: "検索とシェアの土台を点検する" },
    { id: "sns", label: "SNS・シェア", note: "拡散時の見え方を整える" },
    { id: "text", label: "テキスト・変換", note: "原稿づくりの細かい手間をなくす" },
    { id: "image", label: "画像", note: "軽くして、整えて、書き出す" },
    { id: "dev", label: "開発者向け", note: "日常の小さな変換・生成" },
  ];

  /** @type {{ slug: string, name: string, desc: string, cat: string, icon: string, status: "live" | "soon", url?: boolean, hot?: number, uses?: number, added?: string, isNew?: boolean }[]} */
  const TOOLS = [
    { slug: "ogp", name: "OGPチェッカー", desc: "URLを貼るだけでSNSでの見え方を採点・プレビュー。改善コードまで生成。", cat: "meta", icon: "share", status: "live", url: true, hot: 1, uses: 12480, added: "2026-06-12" },
    { slug: "noindex", name: "NoIndexチェッカー", desc: "検索結果に出る設定かを確認。noindexの付け忘れ・付けすぎを防ぐ。", cat: "meta", icon: "shield", status: "soon", url: true, hot: 2, uses: 3160, added: "2026-09-18" },
    { slug: "meta-tags", name: "メタタグ一括取得", desc: "title・description・OGP・canonicalをまとめて取得して一覧表示。", cat: "meta", icon: "tags", status: "soon", url: true },
    { slug: "canonical", name: "canonicalチェッカー", desc: "正規URLの指定を確認し、重複コンテンツのリスクを洗い出す。", cat: "meta", icon: "link2", status: "soon", url: true },
    { slug: "redirect", name: "リダイレクトチェッカー", desc: "最終到達先までの経路とステータスコードを可視化。", cat: "meta", icon: "route", status: "soon", url: true },
    { slug: "robots", name: "robots.txtチェッカー", desc: "クローラーの許可・拒否設定を読み取って、意図とのズレを確認。", cat: "meta", icon: "robot", status: "soon", url: true },
    { slug: "structured-data", name: "構造化データ検証", desc: "JSON-LDの記述を検証。リッチリザルトの対象になるかを確認。", cat: "meta", icon: "braces", status: "soon", url: true },
    { slug: "heading", name: "見出し構造チェッカー", desc: "h1〜h6の階層をツリー表示。飛び・重複をその場で発見。", cat: "meta", icon: "list", status: "soon", url: true },

    { slug: "og-image", name: "OG画像プレビュー", desc: "画像を入れて各SNSでのトリミングを一括確認。文字切れを防ぐ。", cat: "sns", icon: "crop", status: "soon" },
    { slug: "share-link", name: "シェアリンク生成", desc: "X・LINE・Facebookのシェア用URLを、文言込みで組み立てる。", cat: "sns", icon: "send", status: "soon" },
    { slug: "qr", name: "QRコード生成", desc: "URLからQRを生成。サイズ・余白・色を調整して書き出し。", cat: "sns", icon: "qr", status: "soon" },

    { slug: "count", name: "文字数カウント", desc: "タイトル・ディスクリプションの文字数を推奨範囲つきで判定。", cat: "text", icon: "hash", status: "soon" },
    { slug: "zen-han", name: "全角・半角変換", desc: "英数字・カナ・記号を一括変換。原稿の表記ゆれを揃える。", cat: "text", icon: "type", status: "soon" },
    { slug: "whitespace", name: "改行・空白の整形", desc: "余分な改行や連続スペースを除去して、貼り付け原稿を整える。", cat: "text", icon: "eraser", status: "soon" },
    { slug: "regex", name: "正規表現テスター", desc: "マッチ結果をハイライト表示。置換のプレビューもその場で。", cat: "text", icon: "regex", status: "soon" },
    { slug: "diff", name: "テキスト差分", desc: "2つの文章を並べて比較。変更箇所だけを色で抜き出す。", cat: "text", icon: "diff", status: "soon" },

    { slug: "resize", name: "画像リサイズ", desc: "指定サイズへ一括変換。比率を保ったまま複数枚まとめて。", cat: "image", icon: "image", status: "soon" },
    { slug: "compress", name: "画像圧縮", desc: "見た目を保ったままファイルサイズを削減。表示速度の改善に。", cat: "image", icon: "zip", status: "soon" },
    { slug: "webp", name: "WebP変換", desc: "PNG・JPEGをWebPへ。逆方向の変換にも対応。", cat: "image", icon: "swap", status: "soon" },
    { slug: "favicon", name: "favicon生成", desc: "1枚の画像から各サイズのfaviconとマニフェストを書き出し。", cat: "image", icon: "star", status: "soon" },

    { slug: "json", name: "JSON整形・検証", desc: "崩れたJSONを整形し、構文エラーの位置を指摘。", cat: "dev", icon: "braces", status: "soon" },
    { slug: "urlencode", name: "URLエンコード", desc: "パーセントエンコードの相互変換。日本語URLの確認に。", cat: "dev", icon: "link2", status: "soon" },
    { slug: "base64", name: "Base64変換", desc: "文字列・ファイルのエンコードとデコードを双方向で。", cat: "dev", icon: "code", status: "soon" },
    { slug: "hash", name: "ハッシュ生成", desc: "MD5・SHA-1・SHA-256などのダイジェストを即時生成。", cat: "dev", icon: "key", status: "soon" },
    { slug: "uuid", name: "UUID生成", desc: "v4のUUIDをまとめて発行。個数と書式を指定できる。", cat: "dev", icon: "dice", status: "soon" },
    { slug: "color", name: "カラーコード変換", desc: "HEX・RGB・HSL・oklchを相互変換。コントラスト比も表示。", cat: "dev", icon: "palette", status: "soon" },
    { slug: "cron", name: "cron式チェッカー", desc: "cron式を日本語で解説し、次回実行時刻を一覧化。", cat: "dev", icon: "clock", status: "soon" },
  ];

  const LEARN = [
    { kind: "用語集", title: "OGPタグ辞典", desc: "og:title から twitter:card まで、意味と書き方を1語ずつ。", href: "/ogp/#glossary" },
    { kind: "ガイド", title: "はじめてのOGP設定", desc: "最低限おさえる4つのタグと、画像でつまずかないコツ。", soon: true },
    { kind: "ガイド", title: "noindexの正しい使いどころ", desc: "検索に出したくないページの扱いと、よくある事故。", soon: true },
  ];

  const TRUST = [
    { t: "すべて無料・登録不要", d: "会員登録もインストールも不要。PC・スマホ・タブレットのブラウザで、開いてすぐ使えます。" },
    { t: "入力データは保存しません", d: "処理のしかたを各ツールに表示しています。端末内で完結するものは外部に送信しません。" },
    { t: "使い方と用語解説つき", d: "ツールの下に、そのまま直せる解説とコード例を用意しています。" },
  ];

  /* 更新情報（公開・改善・修正を日付つきで） */
  const CHANGELOG = [
    { date: "2026/09/10", kind: "改善", text: "OGPチェッカーで LINE・Teams のプレビューに対応", tool: "ogp" },
    { date: "2026/09/02", kind: "改善", text: "OGPチェッカーのコード出力に Next.js・Astro を追加", tool: "ogp" },
    { date: "2026/08/25", kind: "修正", text: "長いURLを入れるとプレビューが崩れる不具合を修正", tool: "ogp" },
    { date: "2026/06/12", kind: "新規", text: "OGPチェッカーを公開しました", tool: "ogp" },
  ];

  /* ハブのよくある質問（FAQPage 構造化データの対象） */
  const FAQ = [
    { q: "本当に無料ですか？", a: "はい。すべてのツールを登録なし・無料で使えます。通常の範囲の利用で回数の制限はありません。" },
    { q: "入力したURLや文章は保存されますか？", a: "保存しません。各ツールに処理のしかたを表示しています。「端末内で処理」のツールは、入力内容を外部に送信しません。「URLを取得」のツールは、ページの情報を読み取るためにサーバーを経由しますが、結果は保存しません。" },
    { q: "スマホでも使えますか？", a: "はい。PC・スマートフォン・タブレットのブラウザでそのまま使えます。アプリのインストールは不要です。" },
    { q: "仕事で使っても大丈夫ですか？", a: "はい、業務でもお使いいただけます。結果は正確さに努めていますが保証はできないため、公開前の最終確認はご自身でお願いします。" },
    { q: "リンクや紹介は自由ですか？", a: "リンクフリーです。ブログや社内資料での紹介も、連絡なしで自由にどうぞ。" },
    { q: "欲しいツールがないときは？", a: "ツールは順次ふやしています。ご要望は、運営会社のお問い合わせからお寄せください。" },
    { q: "自社用にカスタマイズしたツールは作れますか？", a: "運営会社で、Web制作や業務に合わせた専用ツールの開発を承っています。ページ下の「制作のご相談」からお問い合わせください。" },
  ];

  /* 公開後、更新が出てきたら true に戻す（ハブの更新情報・ツールページの更新履歴） */
  const SHOW_UPDATES = false;

  return { CATS, TOOLS, LEARN, TRUST, CHANGELOG, FAQ, SHOW_UPDATES };
})();

export default HUB;
