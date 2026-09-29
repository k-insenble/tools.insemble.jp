/* ===========================================================
   運営会社（JSON-LD の Organization）
   各ページで同じ @id を指し、publisher はこの @id を参照する。
   ページに表示している情報（社名・所在地）だけを入れる。
   =========================================================== */
const ORG_ID = "https://www.insemble.co.jp/#organization";

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "insemble",
  alternateName: "インセンブル",
  url: "https://www.insemble.co.jp/",
  address: { "@type": "PostalAddress", addressRegion: "北海道", addressLocality: "札幌市", addressCountry: "JP" },
};

const PUBLISHER = { "@id": ORG_ID };

export { ORG, PUBLISHER };
