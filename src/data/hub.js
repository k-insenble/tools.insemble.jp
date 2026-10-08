/* ===========================================================
   ツールハブ — カタログデータ
   status: "live"(公開中) | "soon"(準備中)
   url: true = URLを入力して使う（URL提案の対象／サーバー経由で取得）
   それ以外は端末内（ブラウザ内）で処理する
   kw: 一覧の絞り込み・ハブの検索で拾うことば（画面には出さない）
   hot: ハブの「いま使えるツール」の並び順（小さいほど先。3つずつで1段）
   rel: ツールページの「関連ツール」で先に出す slug（一緒に使う場面が多い順。残りは同じカテゴリ → ほか）
   =========================================================== */
const HUB = (function () {
  const CATS = [
    { id: "web", label: "Web制作・SEO", note: "検索とシェアの土台を点検する" },
    { id: "file", label: "ファイル・変換", note: "PDFや画像を、使える形に取り出す" },
    { id: "decide", label: "決める・分ける", note: "席・順番・チーム分けを1クリックで" },
    { id: "office", label: "Excel・業務", note: "入力したものを、そのまま仕事の書類に" },
    { id: "other", label: "その他", note: "文章の整形や、開発まわりの小さな変換" },
  ];

  /** @type {{ slug: string, name: string, desc: string, cat: string, icon: string, status: "live" | "soon", url?: boolean, hot?: number, uses?: number, added?: string, isNew?: boolean, kw?: string, rel?: string[] }[]} */
  const TOOLS = [
    { slug: "ogp", name: "OGPチェッカー", desc: "URLを貼るだけでSNSでの見え方を採点・プレビュー。改善コードまで生成。", cat: "web", icon: "share", status: "live", url: true, hot: 7, uses: 12480, added: "2026-06-12", kw: "sns シェア x twitter facebook line メタタグ seo ogp画像 ogp確認 公開前 リニューアル", rel: ["pdf-extract"] },
    { slug: "noindex", name: "NoIndexチェッカー", desc: "検索結果に出る設定かを確認。noindexの付け忘れ・付けすぎを防ぐ。", cat: "web", icon: "shield", status: "soon", url: true, uses: 3160, added: "2026-09-18" },
    { slug: "meta-tags", name: "メタタグ一括取得", desc: "title・description・OGP・canonicalをまとめて取得して一覧表示。", cat: "web", icon: "tags", status: "soon", url: true },
    { slug: "canonical", name: "canonicalチェッカー", desc: "正規URLの指定を確認し、重複コンテンツのリスクを洗い出す。", cat: "web", icon: "link2", status: "soon", url: true },
    { slug: "redirect", name: "リダイレクトチェッカー", desc: "最終到達先までの経路とステータスコードを可視化。", cat: "web", icon: "route", status: "soon", url: true },
    { slug: "robots", name: "robots.txtチェッカー", desc: "クローラーの許可・拒否設定を読み取って、意図とのズレを確認。", cat: "web", icon: "robot", status: "soon", url: true },
    { slug: "structured-data", name: "構造化データ検証", desc: "JSON-LDの記述を検証。リッチリザルトの対象になるかを確認。", cat: "web", icon: "braces", status: "soon", url: true },
    { slug: "heading", name: "見出し構造チェッカー", desc: "h1〜h6の階層をツリー表示。飛び・重複をその場で発見。", cat: "web", icon: "list", status: "soon", url: true },
    { slug: "og-image", name: "OG画像プレビュー", desc: "画像を入れて各SNSでのトリミングを一括確認。文字切れを防ぐ。", cat: "web", icon: "crop", status: "soon" },
    { slug: "share-link", name: "シェアリンク生成", desc: "X・LINE・Facebookのシェア用URLを、文言込みで組み立てる。", cat: "web", icon: "send", status: "soon" },
    { slug: "qr", name: "QRコード生成", desc: "URLからQRを生成。サイズ・余白・色を調整して書き出し。", cat: "web", icon: "qr", status: "soon" },

    { slug: "pdf-extract", name: "PDFばらし屋", desc: "PDFから文字・画像・ページ画像をまとめて取り出す。全部入りのZIPも1クリック。", cat: "file", icon: "pdf", status: "live", hot: 5, added: "2026-09-30", isNew: true, kw: "pdf テキスト 抽出 画像 変換 png jpeg zip 文字起こし カタログ パンフレット 素材", rel: ["schedule-excel", "ogp"] },
    { slug: "resize", name: "画像リサイズ", desc: "指定サイズへ一括変換。比率を保ったまま複数枚まとめて。", cat: "file", icon: "image", status: "soon" },
    { slug: "compress", name: "画像圧縮", desc: "見た目を保ったままファイルサイズを削減。表示速度の改善に。", cat: "file", icon: "zip", status: "soon" },
    { slug: "webp", name: "WebP変換", desc: "PNG・JPEGをWebPへ。逆方向の変換にも対応。", cat: "file", icon: "swap", status: "soon" },
    { slug: "favicon", name: "favicon生成", desc: "1枚の画像から各サイズのfaviconとマニフェストを書き出し。", cat: "file", icon: "star", status: "soon" },
    { slug: "base64", name: "Base64変換", desc: "文字列・ファイルのエンコードとデコードを双方向で。", cat: "file", icon: "code", status: "soon" },

    { slug: "seat", name: "席順メーカー", desc: "参加者を入れるだけで、卓ごとの座席表ができる。画像保存・コピーもそのまま。", cat: "decide", icon: "seat", status: "live", hot: 2, added: "2026-09-30", isNew: true, kw: "席替え 席決め 飲み会 宴会 懇親会 忘年会 新年会 歓迎会 送別会 座席表 テーブル 幹事", rel: ["group", "roulette"] },
    { slug: "roulette", name: "イベント用ルーレット", desc: "名前を入れて回すだけ。当たった人は外して、順番決めや抽選をテンポよく。", cat: "decide", icon: "wheel", status: "live", hot: 3, added: "2026-09-30", isNew: true, kw: "抽選 くじ 順番 当番 発表者 司会 景品 ランダム ビンゴ 忘年会 役員決め", rel: ["seat", "group"] },
    { slug: "group", name: "グループ分けメーカー", desc: "人数を決めて押すだけで、均等なチームに。リーダーの固定や、一緒にしない組み合わせも指定できる。", cat: "decide", icon: "users", status: "live", hot: 4, added: "2026-09-30", isNew: true, kw: "チーム分け 班分け 研修 ワークショップ 学校 ランダム 組み分け グループディスカッション gd 面接官 ファシリテーター リーダー 男女 グループワーク 新人研修", rel: ["seat", "roulette"] },

    { slug: "schedule-excel", name: "スケジュール→Excelメーカー", desc: "予定をWebで入れるだけで、そのまま配れるExcelに。進行表・担当別の形も。", cat: "office", icon: "sheet", status: "live", hot: 6, added: "2026-09-30", isNew: true, kw: "エクセル xlsx csv 予定表 進行表 タイムテーブル 工程表 スケジュール表 日程表 研修 撮影 イベント", rel: ["pdf-extract"] },

    { slug: "deadline", name: "あと何日？", desc: "締切を入れるだけで、残り時間が日→時間→分へ自動で変わる付箋。今日やることのチェックも。", cat: "office", icon: "timer", status: "live", hot: 1, added: "2026-10-08", isNew: true, kw: "締切 期限 カウントダウン 残り日数 残り時間 タイマー todo やること リマインダー 付箋 notion excel アプリ pwa", rel: ["schedule-excel"] },

    { slug: "count", name: "文字数カウント", desc: "タイトル・ディスクリプションの文字数を推奨範囲つきで判定。", cat: "other", icon: "hash", status: "soon" },
    { slug: "zen-han", name: "全角・半角変換", desc: "英数字・カナ・記号を一括変換。原稿の表記ゆれを揃える。", cat: "other", icon: "type", status: "soon" },
    { slug: "whitespace", name: "改行・空白の整形", desc: "余分な改行や連続スペースを除去して、貼り付け原稿を整える。", cat: "other", icon: "eraser", status: "soon" },
    { slug: "regex", name: "正規表現テスター", desc: "マッチ結果をハイライト表示。置換のプレビューもその場で。", cat: "other", icon: "regex", status: "soon" },
    { slug: "diff", name: "テキスト差分", desc: "2つの文章を並べて比較。変更箇所だけを色で抜き出す。", cat: "other", icon: "diff", status: "soon" },
    { slug: "json", name: "JSON整形・検証", desc: "崩れたJSONを整形し、構文エラーの位置を指摘。", cat: "other", icon: "braces", status: "soon" },
    { slug: "urlencode", name: "URLエンコード", desc: "パーセントエンコードの相互変換。日本語URLの確認に。", cat: "other", icon: "link2", status: "soon" },
    { slug: "hash", name: "ハッシュ生成", desc: "MD5・SHA-1・SHA-256などのダイジェストを即時生成。", cat: "other", icon: "key", status: "soon" },
    { slug: "uuid", name: "UUID生成", desc: "v4のUUIDをまとめて発行。個数と書式を指定できる。", cat: "other", icon: "dice", status: "soon" },
    { slug: "color", name: "カラーコード変換", desc: "HEX・RGB・HSL・oklchを相互変換。コントラスト比も表示。", cat: "other", icon: "palette", status: "soon" },
    { slug: "cron", name: "cron式チェッカー", desc: "cron式を日本語で解説し、次回実行時刻を一覧化。", cat: "other", icon: "clock", status: "soon" },
  ];

  const LEARN = [
    { kind: "用語集", title: "OGPタグ辞典", desc: "og:title から twitter:card まで、意味と書き方を1語ずつ。", href: "/ogp/#glossary" },
    { kind: "ガイド", title: "はじめてのOGP設定", desc: "最低限おさえる4つのタグと、画像でつまずかないコツ。", soon: true },
    { kind: "ガイド", title: "noindexの正しい使いどころ", desc: "検索に出したくないページの扱いと、よくある事故。", soon: true },
  ];

  const TRUST = [
    { t: "すべて無料・登録不要", d: "会員登録もインストールも不要。PC・スマホ・タブレットのブラウザで、開いてすぐ使えます。" },
    { t: "入力データは保存しません", d: "処理のしかたを各ツールに表示しています。PDFや名前のように端末内で完結するものは、外部に送信しません。" },
    { t: "使い方とよくある質問つき", d: "ツールの下に、使い方とつまずきやすいところの答えを置いています。" },
  ];

  /* 更新情報（公開・改善・修正を日付つきで） */
  const CHANGELOG = [
    { date: "2026/09/30", kind: "新規", text: "PDFばらし屋・席順メーカー・イベント用ルーレット・グループ分けメーカー・スケジュール→Excelメーカーを公開しました" },
    { date: "2026/09/10", kind: "改善", text: "OGPチェッカーで LINE・Teams のプレビューに対応", tool: "ogp" },
    { date: "2026/09/02", kind: "改善", text: "OGPチェッカーのコード出力に Next.js・Astro を追加", tool: "ogp" },
    { date: "2026/08/25", kind: "修正", text: "長いURLを入れるとプレビューが崩れる不具合を修正", tool: "ogp" },
    { date: "2026/06/12", kind: "新規", text: "OGPチェッカーを公開しました", tool: "ogp" },
  ];

  /* ハブのよくある質問（FAQPage 構造化データの対象） */
  const FAQ = [
    { q: "本当に無料ですか？", a: "はい。すべてのツールを登録なし・無料で使えます。通常の範囲の利用で回数の制限はありません。" },
    { q: "入力したURLや文章、ファイルは保存されますか？", a: "保存しません。各ツールに処理のしかたを表示しています。「端末内で処理」のツール（PDFばらし屋・席順メーカーなど）は、入れた名前やファイルを外部に送信しません。「URLを取得」のツールは、ページの情報を読み取るためにサーバーを経由しますが、結果は保存しません。" },
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
