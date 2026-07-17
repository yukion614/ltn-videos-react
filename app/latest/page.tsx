"use client";

import Link from "next/link";
import styles from "@/styles/listpage.module.scss";
import Crumb from "../_components/Crumb/Crumb";
import { useInfiniteVideos } from "../hooks/useInfiniteVideos";
import { useIsMobile } from "../hooks/useIsMobile";
import { watchUrlToSlug } from "../_lib/videoDetail";
import VideoThumbnail from "../_components/VideoThumbnail/VideoThumbnail";

const crumbs = [
  {
    href: "/",
    label: "首頁",
  },
  {
    href: "/latest",
    label: "最新",
  },
];

export default function LatestPage() {
  // 無限往下載入的狀態與行為都封裝在 hook 裡，元件只負責畫面與掛上哨兵 ref
  const { videos, loading, loadingMore, nextPage, sentinelRef, loadMore } =
    useInfiniteVideos();
  // 手機版：捲到底自動載入（哨兵）；桌機版：按「看更多」手動載入
  const isMobile = useIsMobile();

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        {/* 麵包屑 */}
        <Crumb crumbs={crumbs} />
        <header className={styles.header}>
          <span className={styles.bar} aria-hidden="true" />
          <h1 className={styles.title}>最新</h1>
          <span className={styles.en}>Latest</span>
        </header>
        <div className={styles.grid}>
          {videos.length > 0
            ? videos.map((video) => (
                <div key={video.id}>
                  <VideoThumbnail
                    isLoaded={true}
                    variant="stacked"
                    title={video.title}
                    src={video.thumbnailUrl}
                    slug={`/latest/video/${watchUrlToSlug(video.watchUrl) ?? video.id}`}
                    alt={video.title}
                  />
                </div>
              ))
            : Array.from({ length: 12 }).map((_, index) => (
                <div key={index}>
                  <VideoThumbnail isLoaded={false} variant="stacked" />
                </div>
              ))}
        </div>
        {/* 還有下一頁時：手機版掛哨兵自動載入，桌機版顯示「看更多」按鈕 */}
        {!loading &&
          nextPage !== null &&
          (isMobile ? (
            <div ref={sentinelRef} className={styles.status}>
              {loadingMore ? "載入中…" : ""}
            </div>
          ) : (
            <div className={styles.moreWrap}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "載入中…" : "看更多"}
              </button>
            </div>
          ))}
        {!loading && nextPage === null && videos.length > 0 && (
          <p className={styles.status}>已經到底了</p>
        )}
      </div>
    </main>
  );
}
