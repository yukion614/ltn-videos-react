import type { ReactNode } from "react";

// output: export 下，[category] 是動態路由，必須用 generateStaticParams
// 列出要預先產生的分類頁。但 page.tsx 是 "use client" 無法匯出此函式，
// 因此放在同層的 server layout 來提供 category 參數。
const categorySlugs = [
  "politics-faceoff",
  "liberty-talks",
  "liberty-breaking",
  "news-360",
  "gov-matters",
  "strait-brief",
  "ent-rearview",
  "celeb-talks",
];

export function generateStaticParams() {
  return categorySlugs.map((category) => ({ category }));
}

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return children;
}
