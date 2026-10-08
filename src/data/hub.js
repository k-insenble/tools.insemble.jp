/* ===========================================================
   ツールハブ — カタログデータ
   status: "live"(公開中) | "soon"(準備中)
   url: true = URLを入力して使う（URL提案の対象／サーバー経由で取得）
   それ以外は端末内（ブラウザ内）で処理する
   kw: 一覧の絞り込み・ハブの検索で拾うことば（画面には出さない）
   hot: ハブの「いま使えるツール」の並び順（小さいほど先。3つずつで1段）
   rel: ツールページの「関連ツール」で先に出す slug（一緒に使う場面が多い順。残りは同じカテゴリ → ほか）
   kind: 名前だけでは何の道具か分からないツールに、フッターなどで名前の横に添える一言（例：あと何日？（締切カウントダウン＋ToDo））
   =========================================================== */
const HUB = (function () {
  const CATS = [
    { id: "web", label: "Web制作・SEO", note: "検索とシェアの土台を点検する" },
    { id: "file", label: "ファイル・変換", note: "PDFや画像を、使える形に取り出す" },
    { id: "decide", label: "決める・分ける", note: "席・順番・チーム分けを、1クリックで" },
    { id: "office", label: "Excel・業務", note: "入力したものを、そのまま仕事の書類に" },
    { id: "other", label: "その他", note: "文章の整形や、開発まわりの小さな変換" },
  ];

  /** @type {{ slug: string, name: string, desc: string, cat: string, icon: string, status: "live" | "soon", url?: boolean, hot?: number, uses?: number, added?: string, isNew?: boolean, kw?: string, rel?: string[], kind?: string }[]} */
  const TOOLS = [
    { slug: "ogp", name: "OGPチェッカー", desc: "URLを貼ると、SNSでの見え方を採点してプレビュー。足りないタグは、直したコードをそのまま出せる。", cat: "web", icon: "share", status: "live", url: true, hot: 7, uses: 12480, added: "2026-06-12", kw: "sns シェア x twitter facebook line メタタグ seo ogp画像 ogp確認 公開前 リニューアル", rel: ["pdf-extract"] },
    { slug: "noindex", name: "NoIndexチェッカー", desc: "URLを入れると、検索結果に出る設定かを確かめる。noindexの付け忘れや付けすぎを防げる。", cat: "web", icon: "shield", status: "soon", url: true, uses: 3160, added: "2026-09-18" },
    { slug: "meta-tags", name: "メタタグ一括取得", desc: "URLを入れると、title・description・OGP・canonicalをまとめて一覧にする。", cat: "web", icon: "tags", status: "soon", url: true },
    { slug: "canonical", name: "canonicalチェッカー", desc: "URLを入れると、正規URL（canonical）の指定を確かめる。同じ内容のページの重複に気づける。", cat: "web", icon: "link2", status: "soon", url: true },
    { slug: "redirect", name: "リダイレクトチェッカー", desc: "URLを入れると、転送を何回経て最後のページに着くかを表示。各段階の応答コードも分かる。", cat: "web", icon: "route", status: "soon", url: true },
    { slug: "robots", name: "robots.txtチェッカー", desc: "URLを入れると、robots.txtの許可・拒否を読み取る。意図とずれた設定がないか分かる。", cat: "web", icon: "robot", status: "soon", url: true },
    { slug: "structured-data", name: "構造化データ検証", desc: "URLを入れると、構造化データの書き方を確かめる。検索結果で目立つ表示の対象になるかも分かる。", cat: "web", icon: "braces", status: "soon", url: true },
    { slug: "heading", name: "見出し構造チェッカー", desc: "URLを入れると、h1〜h6の見出しを木の形で表示。順番の飛びや重複がその場で分かる。", cat: "web", icon: "list", status: "soon", url: true },
    { slug: "og-image", name: "OG画像プレビュー", desc: "画像を入れると、各SNSでどう切り取られるかを一度に確かめられる。文字が切れるのを防げる。", cat: "web", icon: "crop", status: "soon" },
    { slug: "share-link", name: "シェアリンク生成", desc: "URLと文言を入れると、X・LINE・Facebookでシェアするためのリンクを組み立てる。", cat: "web", icon: "send", status: "soon" },
    { slug: "qr", name: "QRコード生成", desc: "URLを入れると、QRコードを作る。大きさ・余白・色を変えて、画像として書き出せる。", cat: "web", icon: "qr", status: "soon" },

    { slug: "pdf-extract", name: "PDFばらし屋", kind: "文字・画像の取り出し", desc: "PDFを入れると、文字・画像・ページ画像をまとめて取り出せる。全部入りのZIPも1クリックで保存。", cat: "file", icon: "pdf", status: "live", hot: 5, added: "2026-09-30", isNew: true, kw: "pdf テキスト 抽出 画像 変換 png jpeg zip 文字起こし カタログ パンフレット 素材", rel: ["schedule-excel", "ogp"] },
    { slug: "resize", name: "画像リサイズ", desc: "画像を入れると、指定した大きさにまとめて変える。縦横の比率を保ったまま、複数枚を一度に。", cat: "file", icon: "image", status: "soon" },
    { slug: "compress", name: "画像圧縮", desc: "画像を入れると、見た目を保ったままファイルを軽くする。ページの表示を速くしたいときに。", cat: "file", icon: "zip", status: "soon" },
    { slug: "webp", name: "WebP変換", desc: "PNG・JPEGを入れると、WebPに変換する。WebPからPNG・JPEGに戻すこともできる。", cat: "file", icon: "swap", status: "soon" },
    { slug: "favicon", name: "favicon生成", desc: "画像を1枚入れると、各サイズのfaviconとマニフェストをまとめて書き出す。", cat: "file", icon: "star", status: "soon" },
    { slug: "base64", name: "Base64変換", desc: "文字やファイルを入れると、Base64に変換する。Base64から元に戻すこともできる。", cat: "file", icon: "code", status: "soon" },

    { slug: "seat", name: "席順メーカー", desc: "参加者の名前を入れると、卓ごとの座席表ができる。画像で保存したり、文字でコピーしたりして配れる。", cat: "decide", icon: "seat", status: "live", hot: 2, added: "2026-09-30", isNew: true, kw: "席替え 席決め 飲み会 宴会 懇親会 忘年会 新年会 歓迎会 送別会 座席表 テーブル 幹事", rel: ["group", "roulette"] },
    { slug: "roulette", name: "イベント用ルーレット", desc: "名前を入れて回すと、1人をランダムに選ぶ。当たった人は自動で外れるので、順番決めや抽選に使える。", cat: "decide", icon: "wheel", status: "live", hot: 3, added: "2026-09-30", isNew: true, kw: "抽選 くじ 順番 当番 発表者 司会 景品 ランダム ビンゴ 忘年会 役員決め", rel: ["seat", "group"] },
    { slug: "group", name: "グループ分けメーカー", desc: "名前を入れると、人数をそろえてグループに分ける。リーダーの固定や、一緒にしない組み合わせも指定できる。", cat: "decide", icon: "users", status: "live", hot: 4, added: "2026-09-30", isNew: true, kw: "チーム分け 班分け 研修 ワークショップ 学校 ランダム 組み分け グループディスカッション gd 面接官 ファシリテーター リーダー 男女 グループワーク 新人研修", rel: ["seat", "roulette"] },

    { slug: "schedule-excel", name: "スケジュール→Excelメーカー", desc: "予定を入れると、そのまま配れるExcelの予定表ができる。進行表や担当別の形でも書き出せる。", cat: "office", icon: "sheet", status: "live", hot: 6, added: "2026-09-30", isNew: true, kw: "エクセル xlsx csv 予定表 進行表 タイムテーブル 工程表 スケジュール表 日程表 研修 撮影 イベント", rel: ["pdf-extract"] },

    { slug: "deadline", name: "あと何日？", kind: "締切カウントダウン＋ToDo", desc: "締切を入れると、残り時間を数え続ける。近づくと色で知らせ、画面の隅にも置いておける。", cat: "office", icon: "timer", status: "live", hot: 1, added: "2026-10-08", isNew: true, kw: "締切 期限 カウントダウン 残り日数 残り時間 タイマー todo やること リマインダー 付箋 notion excel アプリ pwa デスクトップ 常駐 ホーム画面", rel: ["schedule-excel"] },

    { slug: "count", name: "文字数カウント", desc: "文章を入れると、文字数を数える。titleやdescriptionが目安に収まっているかも分かる。", cat: "other", icon: "hash", status: "soon" },
    { slug: "zen-han", name: "全角・半角変換", desc: "文章を入れると、英数字・カナ・記号の全角と半角をまとめてそろえる。原稿の表記ゆれ直しに。", cat: "other", icon: "type", status: "soon" },
    { slug: "whitespace", name: "改行・空白の整形", desc: "文章を入れると、余分な改行や続いた空白を取り除く。コピーしてきた原稿を整えたいときに。", cat: "other", icon: "eraser", status: "soon" },
    { slug: "regex", name: "正規表現テスター", desc: "正規表現と文章を入れると、当てはまるところを色で示す。置き換えた結果もその場で見られる。", cat: "other", icon: "regex", status: "soon" },
    { slug: "diff", name: "テキスト差分", desc: "2つの文章を入れると、並べて比べる。変わったところだけを色で示すので、修正の確認に。", cat: "other", icon: "diff", status: "soon" },
    { slug: "json", name: "JSON整形・検証", desc: "JSONを入れると、読みやすく整える。書き方の誤りがあれば、その場所を示す。", cat: "other", icon: "braces", status: "soon" },
    { slug: "urlencode", name: "URLエンコード", desc: "文字やURLを入れると、パーセントエンコードとの間で変換する。日本語URLの確認に。", cat: "other", icon: "link2", status: "soon" },
    { slug: "hash", name: "ハッシュ生成", desc: "文字を入れると、MD5・SHA-1・SHA-256などのハッシュ値をすぐに作る。", cat: "other", icon: "key", status: "soon" },
    { slug: "uuid", name: "UUID生成", desc: "個数と書式を選ぶと、v4のUUIDをまとめて作る。テスト用のIDを一度にそろえたいときに。", cat: "other", icon: "dice", status: "soon" },
    { slug: "color", name: "カラーコード変換", desc: "色のコードを入れると、HEX・RGB・HSL・oklchに変換する。背景とのコントラスト比も分かる。", cat: "other", icon: "palette", status: "soon" },
    { slug: "cron", name: "cron式チェッカー", desc: "cron式を入れると、意味を日本語で説明する。次に動く日時も一覧で分かる。", cat: "other", icon: "clock", status: "soon" },
  ];

  const LEARN = [
    { kind: "用語集", title: "OGPタグ辞典", desc: "og:title から twitter:card まで、意味と書き方を1語ずつ。", href: "/ogp/#glossary" },
    { kind: "ガイド", title: "はじめてのOGP設定", desc: "最低限おさえる4つのタグと、画像でつまずかないコツ。", soon: true },
    { kind: "ガイド", title: "noindexの正しい使いどころ", desc: "検索に出したくないページの扱い方と、よくある失敗。", soon: true },
  ];

  const TRUST = [
    { t: "すべて無料・登録不要", d: "会員登録もインストールも要りません。PC・スマホ・タブレットのブラウザで、開いてすぐに使えます。" },
    { t: "入れた内容を、運営者は保存しません", d: "名前やPDFを扱うツールは、お使いのブラウザの中だけで処理し、外部に送りません。URLを調べるツールも、入れたURLと結果を保存しません。" },
    { t: "使い方とよくある質問つき", d: "どのツールのページにも、下に使い方と、つまずきやすいところへの答えを載せています。" },
  ];

  /* 更新情報（公開・改善・修正を日付つきで） */
  const CHANGELOG = [
    { date: "2026/10/08", kind: "新規", text: "あと何日？を公開しました", tool: "deadline" },
    { date: "2026/09/30", kind: "新規", text: "PDFばらし屋・席順メーカー・イベント用ルーレット・グループ分けメーカー・スケジュール→Excelメーカーを公開しました" },
    { date: "2026/09/10", kind: "改善", text: "OGPチェッカーで、LINE・Teams での見え方も確かめられるようにしました", tool: "ogp" },
    { date: "2026/09/02", kind: "改善", text: "OGPチェッカーで、Next.js・Astro 向けのコードも出せるようにしました", tool: "ogp" },
    { date: "2026/08/25", kind: "修正", text: "長いURLを入れるとプレビューが崩れる不具合を直しました", tool: "ogp" },
    { date: "2026/06/12", kind: "新規", text: "OGPチェッカーを公開しました", tool: "ogp" },
  ];

  /* ハブのよくある質問（FAQPage 構造化データの対象） */
  const FAQ = [
    { q: "本当に無料ですか？", a: "はい。すべてのツールを、登録なしで無料で使えます。ふつうに使う範囲では、回数の制限もありません。" },
    { q: "入力したURLや文章、ファイルは保存されますか？", a: "運営者のサーバーには保存しません。PDFばらし屋や席順メーカーなど「端末内で処理」と書いてあるツールは、入れた名前やファイルを外部に送りません。OGPチェッカーのようにURLを調べるツールは、ページの情報を読み取るためにサーバーを経由しますが、入れたURLと結果は保存しません。あと何日？とスケジュール→Excelメーカーに入れた内容や、OGPチェッカーの「最近チェックしたURL」は、続きから使えるように、お使いのブラウザの中にだけ保存します。運営者には届きません。くわしくは、ページ下の「利用規約・プライバシーポリシー」をご覧ください。" },
    { q: "スマホでも使えますか？", a: "はい。スマートフォンやタブレットのブラウザでも、PCと同じように使えます。あと何日？は、ホーム画面に置いてアプリのように開くこともできます。" },
    { q: "仕事で使っても大丈夫ですか？", a: "はい、仕事でもお使いいただけます。結果はできるだけ正確になるようにつくっていますが、保証はしていません。社外に出す前や公開する前には、ご自身で最終確認をしてください。" },
    { q: "リンクや紹介は自由ですか？", a: "はい。どのページにも、連絡なしでリンクしていただけます。ブログや社内資料での紹介もご自由にどうぞ。" },
    { q: "欲しいツールがないときは？", a: "公開を準備しているツールは、ツール一覧の下の「これから公開するツール」で見られます。そこにもないときは、ページ下の「制作のご相談」から、運営会社のお問い合わせフォームでご要望をお送りください。" },
    { q: "自社用にカスタマイズしたツールはつくれますか？", a: "はい。運営会社のinsembleが、Web制作や業務に合わせた専用ツールの開発をお受けしています。ページ下の「制作のご相談」からお問い合わせください。" },
  ];

  /* 公開後、更新が出てきたら true に戻す（ハブの更新情報・ツールページの更新履歴） */
  const SHOW_UPDATES = false;

  /* 名前だけが並ぶところ（フッターなど）で使う表示名。kind があれば括弧で添える */
  const label = (t) => (t.kind ? `${t.name}（${t.kind}）` : t.name);

  return { CATS, TOOLS, LEARN, TRUST, CHANGELOG, FAQ, SHOW_UPDATES, label };
})();

export default HUB;
