"use client";
import Crumb from "../_components/Crumb/Crumb";
import styles from "@/styles/listpage.module.scss";
import { useInfiniteVideos } from "../hooks/useInfiniteVideos";
import Link from "next/link";

const crumbs = [
  {
    href: "/",
    label: "首頁",
  },
  {
    href: "/topic",
    label: "話題",
  },
];

const topic = {
  title: "2026 九合一選舉",
};
export default function page() {
  // 無限滑動
  const { videos, loading, loadingMore, nextPage, sentinelRef } =
    useInfiniteVideos();

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Crumb crumbs={crumbs} />
        <header className={styles.header}>
          <span className={styles.bar} aria-hidden="true" />
          <h1 className={styles.title}>{topic.title}</h1>
          {/* <span className={styles.en}>Latest</span> */}
        </header>
        {/*  */}

        {loading ? (
          <p className={styles.status}>載入中…</p>
        ) : videos.length === 0 ? (
          <p className={styles.status}>目前沒有影片</p>
        ) : (
          <div className={styles.grid}>
            {videos.map((video) => {
              return (
                <Link
                  href={video.articleUrl}
                  className={styles.card}
                  key={video.id}
                >
                  <div className={styles.media}>
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div className={styles.info}>
                    <strong className={styles.cardTitle}>{video.title}</strong>
                    <small className={styles.date}>{video.publishAt}</small>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
