"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ShortsRailItem } from "@/app/_interfaces/shorts";
import { useDragScroll } from "@/app/hooks/useDragScroll";
import styles from "./ShortsRail.module.scss";

// react-player v3：以 src 指定來源（v2 的 url 已停用）
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => <div className={styles.playerLoading}>載入中</div>,
});

// 來源未開 CORS，改走 next.config.ts 的同源代理（/hls/...）
function toProxiedHls(url: string) {
  return url.replace("https://video.ltn.com.tw/media/", "/hls/");
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
            {/* 整張卡片是連結，點擊進入 /shorts/{id} 觀看頁；拖曳時 useDragScroll 會攔截 click 不誤觸 */}
            <Link
              href={`/shorts/${short.id}`}
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
                {isHovered ? (
                  <ReactPlayer
                    className={styles.player}
                    src={toProxiedHls(short.hlsUrl)}
                    playing // hover 時自動播放
                    muted // 靜音（瀏覽器自動播放的必要條件）
                    loop // 循環播放
                    playsInline
                    controls={false} // 不顯示控制列／時間軸
                    width="100%"
                    height="100%"
                  />
                ) : null}
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
