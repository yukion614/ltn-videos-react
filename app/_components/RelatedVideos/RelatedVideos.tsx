"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/styles/videopage.module.scss";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import type { PlaylistVideoItem } from "@/app/_interfaces/playlist";
import {
  fallbackVideo,
  getPlaylistPage,
  watchUrlToSlug,
} from "@/app/_lib/videoDetail";

// 一次顯示／展開的張數
const STEP = 8;

interface RelatedVideosProps {
  videoBasePath: string; // 影片連結前綴，如 /programs/{category}/video 或 /topic/video
  playlistKey: string; // 所屬播放清單 key，用來分頁抓更多
  currentVideoId: number; // 目前影片 id，從清單中排除
  initialItems: PlaylistVideoItem[]; // server 端預抓的第 1 頁（已排除自己）
  initialNextPage: number | null; // 第 1 頁之後的下一頁頁碼
}

export default function RelatedVideos({
  videoBasePath,
  playlistKey,
  currentVideoId,
  initialItems,
  initialNextPage,
}: RelatedVideosProps) {
  const isMobile = useIsMobile();
  const [items, setItems] = useState<PlaylistVideoItem[]>(initialItems);
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
  const [visible, setVisible] = useState(STEP); // 桌機目前顯示張數
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  // 抓下一頁並累加（去重 + 排除自己）
  const loadMore = useCallback(async () => {
    if (nextPage === null || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const { items: more, nextPage: np } = await getPlaylistPage(
        playlistKey,
        nextPage,
      );
      setItems((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const fresh = more.filter(
          (v) => v.id !== currentVideoId && !seen.has(v.id),
        );
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      setNextPage(np);
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [nextPage, playlistKey, currentVideoId]);

  // 桌機「看更多」：多顯示一批；若已逼近已載入尾端且還有下一頁，順手預抓
  const expand = useCallback(() => {
    const next = visible + STEP;
    setVisible(next);
    if (next >= items.length && nextPage !== null) {
      loadMore();
    }
  }, [visible, items.length, nextPage, loadMore]);

  // 手機顯示全部已載入；桌機切片到 visible
  const shown = isMobile ? items : items.slice(0, visible);
  // 桌機：還有未顯示的或還有下一頁；手機：只看還有沒有下一頁
  const hasMore = isMobile
    ? nextPage !== null
    : visible < items.length || nextPage !== null;

  // 手機版：哨兵進入畫面就抓下一頁（無限滾動）
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMobile) return;
    const el = sentinelRef.current;
    if (!el || nextPage === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, nextPage, loadingMore, loadMore]);

  return (
    <>
      <div className={styles.recommendGrid}>
        {shown.map((item) => (
          <Link
            className={styles.recommendCard}
            href={`${videoBasePath}/${watchUrlToSlug(item.watchUrl) ?? item.id}`}
            // 影片頁是 ISR：prefetch 會讓清單上每個連結都在伺服器渲染一次，關掉省成本。
            prefetch={false}
            key={item.id}
          >
            <span className={styles.thumb}>
              <img
                src={item.thumbnailUrl || fallbackVideo.posterUrl}
                alt={item.title}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </span>
            <strong>{item.title}</strong>
            <small>{item.publishAt}</small>
          </Link>
        ))}
      </div>

      {/* 手機版：無限滾動哨兵；桌機版：看更多按鈕 */}
      {hasMore &&
        (isMobile ? (
          <div ref={sentinelRef} className={styles.moreSentinel} aria-hidden />
        ) : (
          <div className={styles.moreWrap}>
            <button
              type="button"
              className={styles.moreButton}
              onClick={expand}
              disabled={loadingMore}
            >
              {loadingMore ? "載入中…" : "看更多"}
            </button>
          </div>
        ))}
    </>
  );
}
