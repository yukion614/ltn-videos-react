import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildVideoMetadata,
  getPlaylistPage,
  getProgramVideoIds,
  getVideo,
  getVideoIds,
} from "@/app/_lib/videoDetail";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";

// 靜態匯出：列出要預先產生的影片 id（category 由上層 layout 提供）。
// 節目影片多半不在 /list（最新）裡，必須額外把各節目清單的影片 slug 也納入，
// 否則這些頁面在 output:"export" 下不會產生，靜態站一點就 404。
// build 後才新增的影片不在此清單內，改由 /video-fallback 外殼即時渲染。
export async function generateStaticParams() {
  const [latestIds, programIds] = await Promise.all([
    getVideoIds(),
    getProgramVideoIds(),
  ]);
  const ids = [...new Set([...latestIds, ...programIds])];
  return ids.map((id) => ({ id }));
}

//  設定meta
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
  const data = await getVideo(id);
  if (!data?.video) notFound();

  // 「你還會想看」改用所屬播放清單（playlist-items/{key}/{page}）。
  // server 先抓第 1 頁當初始資料（排除目前這支），後續分頁交給 client 元件。
  const playlistKey = data.playlist?.key ?? "";
  const firstPage = await getPlaylistPage(playlistKey);
  const initialItems = firstPage.items.filter(
    (item) => item.id !== data.video.id,
  );

  return (
    <VideoDetail
      data={data}
      videoBasePath={`/programs/${category}/video`}
      initialItems={initialItems}
      initialNextPage={firstPage.nextPage}
      videoSlug={id}
    />
  );
}
