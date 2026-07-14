import type { Metadata } from "next";
import { getPrograms } from "@/app/_lib/programMeta";
import { getCategoryPageData } from "@/app/_lib/videoDetail";
import CategoryClient from "./CategoryClient";

// 節目分類頁改為 server 渲染：節目名稱、影片清單第一頁都在伺服器備妥，
// HTML 送出時就是完整內容（含 <h1> 與影片清單），社群爬蟲與搜尋引擎都讀得到。
// 互動（無限滾動、手機版播放器固定）交給 CategoryClient。
//
// ISR：分類頁是列表，新影片要儘快浮上來，故 revalidate 比影片詳情頁短。
// force-static 讓動態路由進入 ISR 路由快取（少了它會被判為純 Dynamic、每次重渲染）。
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 _lib/api.ts 的 LIST_REVALIDATE 一致。
export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const program = (await getPrograms()).find((p) => p.key === category);

  // 分類頁沒有 per-page SEO API，用節目名稱組出標題與 OG
  if (!program) {
    return {
      title: "找不到此節目 - 自由影音",
      description: "這個節目可能不存在、已下架，或網址輸入有誤。",
    };
  }

  const title = `${program.name} - 自由影音`;
  const description = `${program.name}｜自由影音節目最新影片一覽`;
  const canonicalUrl = `/programs/${category}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const [programs, pageData] = await Promise.all([
    getPrograms(),
    getCategoryPageData(category),
  ]);

  // 查無此節目、且清單也抓不到任何影片 → 顯示「找不到此節目」。
  // 只有其中一項成立時仍照常渲染：後端剛上架的新節目可能還沒進節目清單，
  // 但 playlist 已有內容，此時應該正常顯示而不是報錯。
  const isMissingProgram =
    !programs.some((p) => p.key === category) && pageData.items.length === 0;

  return (
    <CategoryClient
      // 切換節目時整個重新掛載，狀態（清單、sticky 量測）隨之重置
      key={category}
      slug={category}
      programs={programs}
      initialItems={pageData.items}
      initialNextPage={pageData.nextPage}
      leadHls={pageData.leadHls}
      leadSprite={pageData.leadSprite}
      isMissingProgram={isMissingProgram}
    />
  );
}
