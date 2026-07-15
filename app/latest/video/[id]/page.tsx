import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildVideoMetadata,
  getVideo,
  getVideoPageData,
} from "@/app/_lib/videoDetail";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";

// 「最新」頁的影片連結指向 /latest/video/{slug}。過去只有伺服器 fallback 規則
// 指向外殼頁、沒有真正的路由；改 SSR 後補上，麵包屑走 buildVideoCrumbs 的
// isLatest 分支（首頁 › 最新）。
//
// ISR：影片第一次被請求時於伺服器渲染，存入路由快取，之後 revalidate 秒內直接吃快取
// （x-nextjs-cache: MISS → HIT）。build 時不預生成、也不打 API，新影片不必重 build。
//
// ※ force-static 不能省：動態路由若沒有 generateStaticParams（或它回傳空陣列），
//   Next 會判為純 Dynamic、每個請求重渲染且回 no-store，完全不進 ISR 快取。
//   force-static 讓路由登記進 prerender-manifest 的 dynamicRoutes，才有 ISR。
export const dynamic = "force-static";

// ※ 必須寫成字面值：route segment config 是靜態分析的，匯入的常數會被判為
//   "Invalid config value exports"。數值需與 _lib/videoDetail.ts 的 VIDEO_REVALIDATE 一致。
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getVideo(id);
  if (!data?.video) notFound();
  return buildVideoMetadata(data);
}

export default async function LatestVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageData = await getVideoPageData(id);
  if (!pageData) notFound();

  return (
    <VideoDetail
      data={pageData.data}
      videoBasePath="/latest/video"
      relatedFallback={pageData.relatedFallback}
      videoSlug={id}
    />
  );
}
