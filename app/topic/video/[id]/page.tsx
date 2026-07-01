import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildVideoMetadata,
  getPlaylistPage,
  getTopicVideoIds,
  getVideo,
} from "@/app/_lib/videoDetail";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";

// 靜態匯出：列出要預先產生的影片 id。
// 本路由的連結（導覽列「話題」、頁內相關影片）都指向話題清單的影片，
// 因此用 getTopicVideoIds()（/playlist-list/topic）而非 /list 的最新影片。
// build 後才新增的影片不在此清單內，改由 /video-fallback 外殼即時渲染。
export async function generateStaticParams() {
  const ids = await getTopicVideoIds();
  return ids.map((id) => ({ id }));
}

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

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getVideo(id);
  if (!data?.video) notFound();

  // 「你還會想看」改用所屬播放清單（playlist-items/{key}/{page}）分頁。
  // server 先抓第 1 頁（排除目前這支），後續分頁與看更多/無限滾動交給 client 元件。
  const playlistKey = data.playlist?.key ?? "";
  const firstPage = await getPlaylistPage(playlistKey);
  const initialItems = firstPage.items.filter(
    (item) => item.id !== data.video.id,
  );

  return (
    <VideoDetail
      data={data}
      videoBasePath="/topic/video"
      initialItems={initialItems}
      initialNextPage={firstPage.nextPage}
      videoSlug={id}
    />
  );
}
