import type { ReactNode } from "react";
import { programKeys } from "../../_lib/programMeta";

// output: export 下，[category] 是動態路由，必須用 generateStaticParams
// 列出要預先產生的分類頁。但 page.tsx 是 "use client" 無法匯出此函式，
// 因此放在同層的 server layout 來提供 category 參數。
// slug 來源集中在 _lib/programMeta，新增節目只需改那份。
export function generateStaticParams() {
  return programKeys.map((category) => ({ category }));
}

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return children;
}
