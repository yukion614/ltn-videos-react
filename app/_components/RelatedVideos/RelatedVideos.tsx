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
import VideoThumbnail from "@/app/_components/VideoThumbnail/VideoThumbnail";

// 一次顯示／展開的張數
const STEP = 8;

interface RelatedVideosProps {
  videoBasePath: string; // 影片連結前綴，如 /programs/{category}/video 或 /topic/video
  playlistKey: string; // 所屬播放清單 key，用來分頁抓更多
  currentVideoId: number; // 目前影片 id，從清單中排除
  // 播放清單抓不到內容時的後備清單（詳情 API 的 related，已排除自己）。
  // 只在 client 端 fallback 時渲染，不進 SSR HTML。
  relatedFallback: PlaylistVideoItem[];
}

export default function RelatedVideos({
  videoBasePath,
  playlistKey,
  currentVideoId,
  relatedFallback,
}: RelatedVideosProps) {
  const isMobile = useIsMobile();
  // 刻意從空清單起手：第 1 頁改在 mount 後於 client 抓，讓其他影片的標題不進 SSR HTML，
  // 本頁 SEO 正文只含本片內容。ready 為 true 才代表第 1 頁已抓完（用來決定空狀態/按鈕）。
  const [items, setItems] = useState<PlaylistVideoItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(STEP); // 桌機目前顯示張數
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  // mount 後抓「你還會想看」第 1 頁：優先播放清單，抓不到內容再退回 related 後備。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (playlistKey) {
        const { items: first, nextPage: np } =
          await getPlaylistPage(playlistKey);
        const fresh = first.filter((v) => v.id !== currentVideoId);
        if (cancelled) return;
        if (fresh.length > 0) {
          setItems(fresh);
          setNextPage(np);
          setReady(true);
          return;
        }
      }
      if (cancelled) return;
      setItems(relatedFallback.filter((v) => v.id !== currentVideoId));
      setNextPage(null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [playlistKey, currentVideoId, relatedFallback]);

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
  // 桌機：還有未顯示的或還有下一頁；手機：只看還有沒有下一頁。
  // 第 1 頁還沒抓完（ready 為 false）時先不顯示按鈕/哨兵，避免載入前就閃出「看更多」。
  const hasMore =
    ready &&
    (isMobile
      ? nextPage !== null
      : visible < items.length || nextPage !== null);

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
        {shown.length > 0 && ready
          ? shown.map((item) => (
              <VideoThumbnail
                key={item.id}
                isLoaded={true}
                variant="stacked"
                title={item.title}
                slug={`${videoBasePath}/${watchUrlToSlug(item.watchUrl) ?? item.id}`}
                src={item.thumbnailUrl || fallbackVideo.posterUrl}
                alt={item.title}
              />
            ))
          : Array.from({ length: STEP }).map((_, index) => (
              <VideoThumbnail key={index} isLoaded={false} variant="stacked" />
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
