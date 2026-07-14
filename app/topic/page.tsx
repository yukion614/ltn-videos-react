import { redirect } from "next/navigation";
import { getTopicFirstWatchUrl, watchUrlToSlug } from "../_lib/videoDetail";

// 「話題」不顯示清單頁，直接導向第一支影片的詳細頁。
//
// 改成 server 端轉址（原本是 client 的 router.replace）：
//  - 真正的轉址，社群爬蟲／搜尋引擎跟得上；client 端轉址它們看不到，只會拿到一頁空白
//  - 結果進 ISR 快取，不必每個訪客都打那兩支 API
//  - Navbar 也不用再為了算「話題」選單的 href 而在「每一頁」預先抓這份資料
//    （那是全站每次頁面載入都白打兩支 API，即使訪客根本不會點「話題」）
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 _lib/api.ts 的 LIST_REVALIDATE 一致。
export const revalidate = 120;

export default async function TopicPage() {
  const watchUrl = await getTopicFirstWatchUrl();
  const slug = watchUrlToSlug(watchUrl ?? undefined);

  if (slug) {
    redirect(`/topic/video/${slug}`);
  }

  // 話題清單抓不到（API 異常／目前沒有話題影片）：維持原行為，不轉址也不報錯
  return null;
}
