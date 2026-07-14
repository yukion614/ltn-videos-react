import type { Metadata } from "next";
import ShortsFeed from "../ShortsFeed";
import { buildVideoMetadata, getVideo } from "@/app/_lib/videoDetail";

// 帶 slug 入口：/shorts/{slug} 直接跳到該則影片，再往下滑會切換到下一則並更新網址。

// force-static：讓動態路由進入 ISR 路由快取（少了它會被判為純 Dynamic、每次重渲染）。
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 VIDEO_REVALIDATE 一致。
export const revalidate = 3600;

// 短影音與一般影片共用同一支詳情 API（/video/{slug}），故 og 也共用 buildVideoMetadata。
// 取不到影片時不 notFound：ShortsFeed 仍能從第一則開始播，meta 就沿用 layout 的站台預設，
// 避免因單一 slug 解析失敗就讓整頁 404。
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getVideo(id);
  if (!data?.video) return {};
  return buildVideoMetadata(data);
}

export default async function ShortsByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShortsFeed initialId={id} />;
}
