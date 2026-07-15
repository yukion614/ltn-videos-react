import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildVideoMetadata,
  getVideo,
  getVideoPageData,
} from "@/app/_lib/videoDetail";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";

// ISR：影片第一次被請求時於伺服器渲染並存入路由快取，之後 revalidate 秒內吃快取。
// build 時不預生成、也不打 API，新影片不必重 build。
//
// ※ force-static 不能省：動態路由沒有它（或 generateStaticParams 回空陣列）會被判為
//   純 Dynamic——每個請求重渲染、回 no-store，完全不進 ISR 快取。
export const dynamic = "force-static";

// ※ 必須寫成字面值：route segment config 是靜態分析的，匯入的常數會被判為
//   "Invalid config value exports"。需與 _lib/videoDetail.ts 的 VIDEO_REVALIDATE 一致。
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getVideo(id);
  if (!data?.video) notFound();
  return buildVideoMetadata(data);
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  const pageData = await getVideoPageData(id);
  if (!pageData) notFound();

  return (
    <VideoDetail
      data={pageData.data}
      videoBasePath={`/programs/${category}/video`}
      relatedFallback={pageData.relatedFallback}
      videoSlug={id}
    />
  );
}
