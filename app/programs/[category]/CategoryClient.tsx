"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Crumb from "@/app/_components/Crumb/Crumb";
import NotFoundPanel from "@/app/_components/NotFoundPanel/NotFoundPanel";
import type {
  VideoListItem,
  VideoListResponse,
} from "@/app/_interfaces/videoArticle";
import styles from "./page.module.scss";
import VedoThumbnail from "@/app/_components/VideoThumbnail/VideoThumbnail";
// 播放器走 client-only 版（ssr: false）：它的畫面依賴 window 與自動播放結果，
// 在 server 渲染會先畫出猜錯的一幀、JS 再更正，造成控制列閃動。詳見 VideoPlayerClient。
import VideoPlayer from "@/app/_components/VideoPlayer/VideoPlayerClient";
import type { ProgramMeta } from "@/app/_lib/programMeta";
import { watchUrlToSlug } from "@/app/_lib/videoDetail";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import { API_BASE } from "@/app/_lib/api";

const basePath = API_BASE;

// 分類頁的互動層。清單第一頁、第一則影片的播放網址、節目 tabs 都由 server 端
// （page.tsx）備妥後當 props 傳進來——HTML 送出時就含影片清單，爬蟲讀得到。
// 這裡只負責真正需要瀏覽器的部分：無限滾動、手機版播放器固定。
//
// ※ page.tsx 以 key={category} 掛載本元件，切換節目時整個重新掛載，
//   因此不需要「切節目時重置清單」的邏輯（狀態隨卸載一起消失）。
export interface CategoryClientProps {
  slug: string; // 網址上的節目 key（= 後端 playlist key）
  programs: ProgramMeta[]; // 節目 tabs
  initialItems: VideoListItem[]; // server 抓好的第 1 頁
  initialNextPage: number | null; // 第 1 頁之後的下一頁頁碼
  leadHls: string; // 第一則的 HLS 播放網址（空字串＝退回顯示縮圖）
  leadSprite: string; // 第一則的進度條預覽 sprite
  isMissingProgram: boolean; // 查無此節目且清單為空
}

type ProgramEpisode = {
  id: string;
  href: string;
  title: string;
  date: string;
  duration: string;
  views: string;
  label: string;
  ep: string;
  thumbnailUrl?: string;
};

/**
 * 版型輪迴規則（4 欄網格）：
 * - index 0：大圖（跨 3 欄 × 2 列）→ 旁邊 2 張縮圖 + 下方兩列各 4 張＝整段 11 個
 * - 之後每段：中圖（跨 2 欄 × 2 列）→ 旁邊 4 張縮圖 + 下方兩列各 4 張＝整段 13 個
 *   （大段 11 個之後，以 13 個為一個週期不斷重複中圖段）
 */
function slotRole(index: number): "big" | "medium" | "normal" {
  if (index === 0) return "big";
  if (index >= 11 && (index - 11) % 13 === 0) return "medium";
  return "normal";
}

export default function CategoryClient({
  slug,
  programs,
  initialItems,
  initialNextPage,
  leadHls,
  leadSprite,
  isMissingProgram,
}: CategoryClientProps) {
  const program = programs.find((p) => p.key === slug);

  // server 已備妥第 1 頁；這裡只接手第 2 頁之後的無限滾動
  const [thumbnailPool, setThumbnailPool] =
    useState<VideoListItem[]>(initialItems);
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
  const [loadingMore, setLoadingMore] = useState(false);
  // 載入更多失敗：保留 nextPage、改顯示「點此重試」，而不是靜默停掉
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  // 手機版：第一則播放器滑過頂端後固定在最上層
  const isMobile = useIsMobile(759);
  const leadWrapRef = useRef<HTMLDivElement | null>(null);
  const leadSentinelRef = useRef<HTMLDivElement | null>(null);
  const [leadStuck, setLeadStuck] = useState(false);
  // 播放器原始位置與尺寸：固定時沿用，維持原本大小與水平位置
  const [leadBox, setLeadBox] = useState<{
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const fetchPlaylistPage = useCallback(
    async (page: number) => {
      if (!slug || fetchingRef.current) return;

      fetchingRef.current = true;
      setLoadingMore(true);
      setLoadError(false);

      try {
        const res = await fetch(`${basePath}/playlist-items/${slug}/${page}`);
        if (!res.ok) {
          // 後端回錯誤不等於「沒有更多」：保留 nextPage，讓使用者可重試
          setLoadError(true);
          return;
        }

        const data: VideoListResponse = await res.json();
        const items = data.items || [];
        const hasMore = data.hasMore ?? items.length > 0;
        setThumbnailPool((prev) => [...prev, ...items]);
        setNextPage(hasMore ? (data.nextPage ?? page + 1) : null);
      } catch {
        setLoadError(true);
      } finally {
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    },
    [slug],
  );

  // 無限滾動：底部 sentinel 進入視窗就再載入一批
  // （載入失敗時不掛 observer，避免自動重試轟炸後端；改由重試按鈕觸發）
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || nextPage === null || loadError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          fetchPlaylistPage(nextPage);
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [fetchPlaylistPage, loadError, loadingMore, nextPage]);

  // 量測播放器原始位置／尺寸（未固定時），固定時沿用並以等高佔位避免版面跳動
  useEffect(() => {
    if (!isMobile || !leadHls || leadStuck) return;
    const el = leadWrapRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setLeadBox({ left: rect.left, width: rect.width, height: rect.height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isMobile, leadHls, leadStuck]);

  // 手機版：以哨兵偵測播放器是否滑到 navbar 下緣，是則固定在 navbar 下方
  useEffect(() => {
    if (!isMobile || !leadHls) {
      setLeadStuck(false);
      return;
    }
    const sentinel = leadSentinelRef.current;
    if (!sentinel) return;

    // 讀取 navbar 高度（globals.css 的 --navbar-height），作為固定的頂端偏移
    const navH =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--navbar-height",
        ),
        10,
      ) || 44;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setLeadStuck(
          !entry.isIntersecting && entry.boundingClientRect.top < navH,
        );
      },
      // 把偵測線下移到 navbar 下緣，讓播放器一到 navbar 下方就固定
      { threshold: 0, rootMargin: `-${navH}px 0px 0px 0px` },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [isMobile, leadHls]);

  const episodes = useMemo(() => {
    const epBase = program?.ep ?? 0;
    return thumbnailPool.map(
      (video, index): ProgramEpisode => ({
        id: `${slug}-${video.id}-${index}`,
        href: `/programs/${slug}/video/${watchUrlToSlug(video.watchUrl) ?? video.id}`,
        title: video.title,
        date: video.publishAt?.split(" ")[0] || "",
        duration: "",
        views: "",
        label: "",
        ep: `EP.${Math.max(epBase - index, 1)}`,
        thumbnailUrl: video.thumbnailUrl,
      }),
    );
  }, [program, slug, thumbnailPool]);

  const programName = program?.name ?? "";

  const tabs = (
    <div className={styles.tabsWrap}>
      <nav className={styles.programTabs} aria-label="節目分類">
        {programs.map((item) => (
          <Link
            className={item.key === slug ? styles.tabActive : undefined}
            href={`/programs/${item.key}`}
            prefetch={false}
            key={item.key}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );

  if (isMissingProgram) {
    return (
      <main className={styles.page}>
        {tabs}

        <div className={styles.wrap}>
          <div className={styles.crumbWrap}>
            <Crumb
              crumbs={[
                { href: "/", label: "首頁" },
                { href: "/programs", label: "節目" },
                { label: "找不到此節目" },
              ]}
            />
          </div>

          <NotFoundPanel className={styles.programNotFound} />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {tabs}

      <div className={styles.wrap}>
        <div className={styles.crumbWrap}>
          <Crumb
            crumbs={[
              { href: "/", label: "首頁" },
              { href: "/programs", label: "節目" },
              { href: `/programs/${slug}`, label: programName },
            ]}
          />
        </div>

        <h1 className={styles.programName}>{programName}</h1>

        <div className={styles.content}>
          <section className={styles.feed} aria-label="節目影片列表">
            {episodes.length > 0
              ? episodes.map((item, index) => {
                  const role = slotRole(index);

                  // 第一則：改用播放器並自動播放；拿不到 hlsUrl 時顯示大圖縮圖
                  if (index === 0) {
                    return (
                      <div key={item.id} className={styles.big}>
                        {leadHls ? (
                          <>
                            {/* 哨兵：偵測播放器是否滑過視窗頂端（手機版固定用） */}
                            <div
                              ref={leadSentinelRef}
                              className={styles.leadSentinel}
                              aria-hidden="true"
                            />
                            {/* 固定時以等高佔位，避免下方內容往上跳 */}
                            {leadStuck && leadBox ? (
                              <div
                                style={{ height: leadBox.height }}
                                aria-hidden="true"
                              />
                            ) : null}
                            <div
                              ref={leadWrapRef}
                              style={
                                leadStuck && leadBox
                                  ? {
                                      position: "fixed",
                                      top: "var(--navbar-height)",
                                      left: leadBox.left,
                                      width: leadBox.width,
                                      zIndex: 30,
                                    }
                                  : undefined
                              }
                            >
                              <VideoPlayer
                                src={leadHls}
                                poster=""
                                title={item.title}
                                titleHref={item.href}
                                titlePosition="top"
                                spriteUrl={leadSprite}
                                allowFullscreen
                              />
                            </div>
                          </>
                        ) : (
                          <VedoThumbnail
                            isLoaded={true}
                            variant="overlay"
                            fill
                            title={item.title}
                            duration={item.duration}
                            meta={`${item.date} · ${item.views}`}
                            slug={item.href}
                            src={item.thumbnailUrl}
                            alt={item.title}
                          />
                        )}
                      </div>
                    );
                  }

                  if (role === "big" || role === "medium") {
                    return (
                      <VedoThumbnail
                        key={item.id}
                        isLoaded={true}
                        variant="overlay"
                        fill
                        className={role === "big" ? styles.big : styles.medium}
                        title={item.title}
                        duration={item.duration}
                        meta={`${item.date} · ${item.views}`}
                        slug={item.href}
                        src={item.thumbnailUrl}
                        alt={item.title}
                      />
                    );
                  }

                  return (
                    <VedoThumbnail
                      key={item.id}
                      isLoaded={true}
                      variant="stacked"
                      title={item.title}
                      duration={item.duration}
                      slug={item.href}
                      src={item.thumbnailUrl}
                      alt={item.title}
                    />
                  );
                })
              : // 查無影片
                Array.from({ length: 10 }).map((_, index) => {
                  const role = slotRole(index);

                  // 第一則：
                  if (index === 0) {
                    return (
                      <div key={index} className={styles.big}>
                        <VedoThumbnail
                          isLoaded={false}
                          variant="overlay"
                          fill
                        />
                      </div>
                    );
                  }

                  if (role === "big" || role === "medium") {
                    return (
                      <VedoThumbnail
                        key={index}
                        isLoaded={false}
                        variant="overlay"
                        fill
                        className={role === "big" ? styles.big : styles.medium}
                      />
                    );
                  }

                  return (
                    <VedoThumbnail
                      key={index}
                      isLoaded={false}
                      variant="stacked"
                    />
                  );
                })}

            {/* 載入更多時，接在清單尾端補幾張 skeleton，慢網速滾到底才不會突然斷掉。*/}
            {episodes.length > 0 &&
              loadingMore &&
              Array.from({ length: 4 }).map((_, i) => {
                const role = slotRole(episodes.length + i);

                if (role === "big" || role === "medium") {
                  return (
                    <VedoThumbnail
                      key={`skeleton-${i}`}
                      isLoaded={false}
                      variant="overlay"
                      fill
                      className={role === "big" ? styles.big : styles.medium}
                    />
                  );
                }

                return (
                  <VedoThumbnail
                    key={`skeleton-${i}`}
                    isLoaded={false}
                    variant="stacked"
                  />
                );
              })}
          </section>

          {nextPage !== null &&
            (loadError ? (
              <button
                type="button"
                className={styles.retry}
                onClick={() => fetchPlaylistPage(nextPage)}
              >
                載入失敗，點此重試
              </button>
            ) : (
              <div
                ref={sentinelRef}
                className={styles.sentinel}
                aria-hidden="true"
              />
            ))}
        </div>
      </div>
    </main>
  );
}
