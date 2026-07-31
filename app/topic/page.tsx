import type { Metadata } from "next";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";
import TopicUrlSync from "./TopicUrlSync";
import {
  buildVideoMetadata,
  getTopicFirstWatchUrl,
  getVideoPageData,
  watchUrlToSlug,
} from "@/app/_lib/videoDetail";

// 「話題」不顯示清單頁，直接呈現第一支影片的內容。
//
// 曾經是「server 端 redirect 到 /topic/video/{slug}」，已改掉——那個做法會把
// 「第一支影片是誰」這個每天在變的答案，烤進 HTTP 回應的 Location 標頭裡：
//  - redirect() 的結果進了 ISR 路由快取後不會隨 revalidate 更新，
//    轉址目標等於凍在 build 當下（實測正式站曾停在九天前的影片）
//  - 轉址回應沒有 Cache-Control，CDN 會照預設 TTL 把它存下來重播，
//    請求根本到不了伺服器，這裡的 fetch 一次都不會執行
// 改成原地渲染後回的是一般 200 頁面，走和 /programs/[category] 相同的 ISR 路徑
// （同樣 force-static + revalidate 120），新影片就會照 revalidate 週期浮上來。
//
// 網址列由 TopicUrlSync 在 client 端以 replaceState 補成 /topic/video/{slug}
//（同 ShortsFeed 的做法），分享出去的連結仍是該影片的固定網址；canonical 也由
// buildVideoMetadata 指向同一個網址，不會產生重複內容問題。
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 _lib/api.ts 的 LIST_REVALIDATE 一致。
// 用列表的秒數（非影片詳情的 3600）：這頁的重點是「誰排第一」，那是列表層級的資訊。
export const revalidate = 120;

/**
 * 話題第一支影片的完整頁面資料。
 * generateMetadata 與頁面本體都要用，兩邊各呼叫一次；底下的 fetch 皆走
 * Next 的 request memoization / data cache，不會真的多打一輪 API。
 */
async function getTopicLeadVideo() {
  const watchUrl = await getTopicFirstWatchUrl();
  const slug = watchUrlToSlug(watchUrl ?? undefined);
  if (!slug) return null;

  const pageData = await getVideoPageData(slug);
  if (!pageData) return null;

  return { slug, ...pageData };
}

export async function generateMetadata(): Promise<Metadata> {
  const lead = await getTopicLeadVideo();
  // 抓不到就沿用 app/layout.tsx 的站台預設 metadata
  return lead ? buildVideoMetadata(lead.data) : {};
}

export default async function TopicPage() {
  const lead = await getTopicLeadVideo();

  // 話題清單抓不到（API 異常／目前沒有話題影片）：維持原行為，不報錯。
  // 不用 notFound()：那會把 404 寫進 ISR 快取，一次 API 抽風就讓整頁 404 撐到下次 revalidate。
  if (!lead) return null;

  return (
    <>
      <TopicUrlSync slug={lead.slug} />
      <VideoDetail
        data={lead.data}
        videoBasePath="/topic/video"
        relatedFallback={lead.relatedFallback}
        videoSlug={lead.slug}
      />
    </>
  );
}
