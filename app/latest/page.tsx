"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.scss";
import type {
  VideoListItem,
  VideoListResponse,
} from "../_interfaces/videoArticle";
import Crumb from "../_components/Crumb/Crumb";

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

const basePath = "https://video.ltn.com.tw/brand/api";

export default function LatestPage() {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(`${basePath}/list`);
        const data: VideoListResponse = await res.json();
        setVideos(data.items);
      } finally {
        setLoading(false);
      }
    }

    fetchLatest();
  }, []);

  return (
    <main className={styles.latest}>
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
      </div>
    </main>
  );
}
