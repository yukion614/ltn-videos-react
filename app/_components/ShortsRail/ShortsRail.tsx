"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ShortsRailItem } from "@/app/_interfaces/shorts";
import { useDragScroll } from "@/app/hooks/useDragScroll";
import { watchUrlToSlug } from "@/app/_lib/videoDetail";
import styles from "./ShortsRail.module.scss";

// 這個網址是不是 HLS（.m3u8）串流
function isHlsSource(url?: string) {
  return !!url && /\.m3u8($|\?)/i.test(url);
}

// 瀏覽器是否原生支援 HLS（iOS / macOS Safari 皆為 true）。
// 原生支援時直接把 .m3u8 餵給 <video>，不必用 hls.js（hls.js 走 XHR 受 CORS 限制，
// 直連上游 video.ltn.com.tw 在非 *.ltn.com.tw 網域會被擋）。
function canPlayNativeHls() {
  if (typeof document === "undefined") return false;
  const v = document.createElement("video");
  return (
    v.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    v.canPlayType("application/x-mpegURL") !== ""
  );
}

// 首頁短影音 hover 播放器：原生 <video> 取代 react-player（同 ShortsFeed 的做法）。
// 只有 hover 的卡片會掛載本元件，靜音循環自動播；卸載時銷毀 hls.js 實例。
function RailVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let cancelled = false;

    // 靜音自動播放的前提：play() 前 muted/playsInline 必須已是 true
    video.muted = true;
    video.playsInline = true;

    const tryPlay = () => {
      if (cancelled) return;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    if (!isHlsSource(src) || canPlayNativeHls()) {
      // 原生 HLS（Safari）：直接指派 src，原生 media 請求不受 CORS 限制
      video.src = src;
      tryPlay();
    } else {
      // 其他瀏覽器：用 hls.js 接上
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
          } else {
            video.src = src;
            tryPlay();
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={styles.player}
      loop
      muted
      autoPlay
      playsInline
    />
  );
}

export default function ShortsRail({ items }: { items: ShortsRailItem[] }) {
  // 只記住目前滑鼠停留的卡片，只有它會載入並播放影片
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  // 讓整列可以用滑鼠按住拖曳左右滑動
  const { ref, isDragging } = useDragScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`${styles.shortsRow} ${isDragging ? styles.dragging : ""}`}
      aria-label="短影音清單"
    >
      {items.map((short, index) => {
        // 拖曳中暫停 hover 自動播放，避免載入影片卡住滑動
        const isHovered = !isDragging && hoveredId === short.id;
        return (
          <article
            className={styles.shortCard}
            key={short.id}
            onMouseEnter={() => setHoveredId(short.id)}
            onMouseLeave={() =>
              setHoveredId((cur) => (cur === short.id ? null : cur))
            }
          >
            {/* 整張卡片是連結，點擊進入 /shorts/{slug} 觀看頁；拖曳時 useDragScroll 會攔截 click 不誤觸。
                shorts 頁以 watchUrl 的 slug 比對目標（見 ShortsFeed 的 itemSlug），
                這裡連結也要用同一種 slug，否則對不上會被判為無效路由顯示 404 */}
            <Link
              href={`/shorts/${watchUrlToSlug(short.watchUrl) ?? short.id}`}
              // /shorts/:id 是靠 rewrite 導回 /shorts 外殼的假路由，沒有對應的靜態
              // RSC payload（index.txt），開啟預抓取會對不存在的檔案發出 404。點擊導航
              // 不受影響，這裡關掉 prefetch 純粹避免 console 噴一整排 404。
              prefetch={false}
              className={styles.cardLink}
              draggable={false}
            >
              <div
                className={`${styles.shortMedia} ${styles[`tone${index % 8}`]}`}
              >
                {/* 封面墊底：影片載入前或失敗時都能看到圖，不會黑屏 */}
                <div
                  className={styles.poster}
                  style={{ backgroundImage: `url(${short.posterUrl})` }}
                />
                {/* 只有 hover 的卡片才掛載播放器，一次只載一支 */}
                {isHovered ? <RailVideo src={short.hlsUrl} /> : null}
                {/* 文字疊在圖片上：底部漸層提升可讀性 */}
                <div className={styles.caption}>
                  <strong className={styles.title}>{short.title}</strong>
                  <small className={styles.views}>
                    {short.views ?? short.publishAt}
                  </small>
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
