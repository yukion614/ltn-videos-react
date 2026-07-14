import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildVideoMetadata,
  getVideo,
  getVideoPageData,
} from "@/app/_lib/videoDetail";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";

// force-static：讓動態路由進入 ISR 路由快取（少了它會被判為純 Dynamic、每次重渲染）。
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 VIDEO_REVALIDATE 一致。
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

export default async function TopicVideoPage({
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
      videoBasePath="/topic/video"
      initialItems={pageData.initialItems}
      initialNextPage={pageData.initialNextPage}
      videoSlug={id}
    />
  );
}
