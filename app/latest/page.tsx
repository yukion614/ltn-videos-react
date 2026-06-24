"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "@/styles/listpage.module.scss";
import Crumb from "../_components/Crumb/Crumb";
import { useInfiniteVideos } from "../hooks/useInfiniteVideos";

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
  const { videos, loading, loadingMore, nextPage, sentinelRef } =
    useInfiniteVideos();

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

        {loading ? (
          <p className={styles.status}>載入中…</p>
        ) : videos.length === 0 ? (
          <p className={styles.status}>目前沒有影片</p>
        ) : (
          <div className={styles.grid}>
            {videos.map((video) => (
              <Link
                href={video.articleUrl || "#"}
                className={styles.card}
                key={video.id}
              >
                <div className={styles.media}>
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                </div>
                <div className={styles.info}>
                  <strong className={styles.cardTitle}>{video.title}</strong>
                  <small className={styles.date}>{video.publishAt}</small>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 哨兵 + 狀態：捲到這裡就自動載入下一頁 */}
        {!loading && nextPage !== null && (
          <div ref={sentinelRef} className={styles.status}>
            {loadingMore ? "載入中…" : ""}
          </div>
        )}
        {!loading && nextPage === null && videos.length > 0 && (
          <p className={styles.status}>已經到底了</p>
        )}
      </div>
    </main>
  );
}
