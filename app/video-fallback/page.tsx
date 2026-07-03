"use client";

import { useEffect, useState } from "react";
import NotFoundPanel from "@/app/_components/NotFoundPanel/NotFoundPanel";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";
import type { PlaylistVideoItem } from "@/app/_interfaces/playlist";
import {
  buildVideoDocMeta,
  getPlaylistPage,
  getVideo,
} from "@/app/_lib/videoDetail";
import { useDocumentMeta } from "@/app/_lib/useDocumentMeta";

// 靜態站的「影片外殼頁」。
//
// output:"export" 只會替 build 當下已知的影片產生 HTML；build 之後後端才新增的
// 影片沒有對應檔案。伺服器（nginx / serve-static）設定成：影片網址找不到檔案時，
// 不回 404，改回傳這個外殼頁。外殼在瀏覽器讀網址上的 id 即時 fetch API 渲染，
// 使用者就能正常觀看，不必等重新 build。
//
// 注意：社群爬蟲（FB/LINE/X）不執行 JS，走 fallback 的新影片分享預覽只會是通用
// 資訊；完整的 per-video SEO/OG 仍要靠下一次重新 build 把該片轉為預先產生的頁面。

// 從目前網址解析出影片 id 與相關影片連結前綴。
// 支援 /programs/{category}/video/{id} 與 /topic/video/{id}（trailingSlash 皆可）。
function parseVideoPath(pathname: string): {
  id: string;
  videoBasePath: string;
} | null {
  const marker = "/video/";
  const at = pathname.indexOf(marker);
  if (at < 0) return null;

  const videoBasePath = pathname.slice(0, at + marker.length - 1); // 去掉尾斜線
  const rest = pathname.slice(at + marker.length);
  const id = rest.split("/").filter(Boolean)[0]; // 取 /video/ 後第一段當 id
  if (!id) return null;

  return { id, videoBasePath };
}

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      data: BrandVideoResponse;
      videoBasePath: string;
      initialItems: PlaylistVideoItem[];
      initialNextPage: number | null;
    }
  | { status: "notfound" };

export default function VideoFallbackPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  // 資料就緒後把 API 的 SEO / OG 補進 <head>（含分頁標題）；load 中／找不到時不注入
  useDocumentMeta(
    state.status === "ready" ? buildVideoDocMeta(state.data) : null,
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const parsed = parseVideoPath(window.location.pathname);
      if (!parsed) {
        if (!cancelled) setState({ status: "notfound" });
        return;
      }

      const data = await getVideo(parsed.id);
      if (cancelled) return;
      if (!data?.video) {
        setState({ status: "notfound" });
        return;
      }

      const playlistKey = data.playlist?.key ?? "";
      const firstPage = await getPlaylistPage(playlistKey);
      if (cancelled) return;
      const initialItems = firstPage.items.filter(
        (item) => item.id !== data.video.id,
      );

      setState({
        status: "ready",
        data,
        videoBasePath: parsed.videoBasePath,
        initialItems,
        initialNextPage: firstPage.nextPage,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main style={{ padding: "40px 16px", textAlign: "center" }}>
        影片載入中…
      </main>
    );
  }

  if (state.status === "notfound") {
    return (
      <main>
        <NotFoundPanel />
      </main>
    );
  }

  return (
    <VideoDetail
      data={state.data}
      videoBasePath={state.videoBasePath}
      initialItems={state.initialItems}
      initialNextPage={state.initialNextPage}
    />
  );
}
