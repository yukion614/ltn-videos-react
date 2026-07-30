"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// 清單的一格：episode 為 null＝骨架（尚未載入／查無影片）
type FeedSlot = { key: string; episode: ProgramEpisode | null };

// 一段版型：主圖 + 側邊縮圖 + 下方整排縮圖
type FeedBlock = {
  key: string;
  kind: "hero" | "medium";
  hero: FeedSlot;
  side: FeedSlot[];
  rows: FeedSlot[];
};

/**
 * 版型輪迴規則：
 * - 第 1 段：大圖（桌機 3 欄寬）+ 側邊 2 張 + 下方 8 張＝11 個
 * - 之後每段：中圖（桌機 2 欄寬）+ 側邊 4 張 + 下方 8 張＝13 個
 *
 * 切成一段一段的 block 而不是排成一片扁平網格，是為了避開「跨列（grid-row: span 2）」：
 * Safari 不把高度來自 aspect-ratio 的跨列項目計入列軌高度，大圖會滿出格子被下一排蓋住。
 * 詳見 page.module.scss 開頭的說明。
 */
const HERO_BLOCK = { side: 2, rows: 8 } as const; // 1 + 2 + 8 = 11
const MEDIUM_BLOCK = { side: 4, rows: 8 } as const; // 1 + 4 + 8 = 13

function chunkFeed(slots: FeedSlot[]): FeedBlock[] {
  const blocks: FeedBlock[] = [];
  let cursor = 0;

  while (cursor < slots.length) {
    const isFirst = blocks.length === 0;
    const spec = isFirst ? HERO_BLOCK : MEDIUM_BLOCK;
    const sideEnd = cursor + 1 + spec.side;

    blocks.push({
      key: slots[cursor].key,
      kind: isFirst ? "hero" : "medium",
      hero: slots[cursor],
      // 最後一段可能不滿，slice 自然會截短，網格照樣排得下
      side: slots.slice(cursor + 1, sideEnd),
      rows: slots.slice(sideEnd, sideEnd + spec.rows),
    });

    cursor = sideEnd + spec.rows;
  }

  return blocks;
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

  // 手機版：第一則播放器滑過頂端後固定在最上層。
  // 固定後的寬度與水平位置全部交給 CSS（.leadFixed，算式與 .wrap 相同），
  // 這裡只負責「該不該固定」這一個布林值——不再有任何 JS 量出來的 px。
  const isMobile = useIsMobile(759);
  const leadSentinelRef = useRef<HTMLDivElement | null>(null);
  const [leadStuck, setLeadStuck] = useState(false);

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

  const feedBlocks = useMemo(() => {
    // 查無影片／首屏：先排 10 格骨架，版型不會空一片
    const slots: FeedSlot[] =
      episodes.length > 0
        ? episodes.map((episode) => ({ key: episode.id, episode }))
        : Array.from({ length: 10 }, (_, index) => ({
            key: `skeleton-${index}`,
            episode: null,
          }));

    // 載入更多時在尾端補幾格骨架，慢網速滾到底才不會突然斷掉
    if (episodes.length > 0 && loadingMore) {
      for (let i = 0; i < 4; i += 1) {
        slots.push({ key: `more-${episodes.length + i}`, episode: null });
      }
    }

    return chunkFeed(slots);
  }, [episodes, loadingMore]);

  const programName = program?.name ?? "";

  // 主圖（大圖／中圖）：圖片自己的 aspect-ratio 就等於外層 .hero / .mediumHero 的比例，
  // 剛好貼滿——不用 height: 100%，就不必依賴 Safari 對百分比高度的解析
  // fill：桌機時填滿整格高度（中圖要跟右側 2×2 縮圖等高，見 .mediumHero 的註解）
  const renderHero = (slot: FeedSlot, fill = false) => {
    const item = slot.episode;
    if (!item) {
      return <VedoThumbnail isLoaded={false} variant="overlay" fill={fill} />;
    }

    return (
      <VedoThumbnail
        isLoaded={true}
        variant="overlay"
        fill={fill}
        title={item.title}
        duration={item.duration}
        meta={`${item.date} · ${item.views}`}
        slug={item.href}
        src={item.thumbnailUrl}
        alt={item.title}
      />
    );
  };

  // 側邊／下方的一般縮圖：圖片 16:9 + 標題在下
  const renderThumb = (slot: FeedSlot) => {
    const item = slot.episode;
    if (!item) {
      return (
        <VedoThumbnail key={slot.key} isLoaded={false} variant="stacked" />
      );
    }

    return (
      <VedoThumbnail
        key={slot.key}
        isLoaded={true}
        variant="stacked"
        title={item.title}
        duration={item.duration}
        slug={item.href}
        src={item.thumbnailUrl}
        alt={item.title}
      />
    );
  };

  // 第一則：改用播放器並自動播放；手機版滑過 navbar 後固定在頂端
  const renderLead = (item: ProgramEpisode) => (
    <>
      {/* 哨兵：偵測播放器是否滑過視窗頂端（手機版固定用） */}
      <div
        ref={leadSentinelRef}
        className={styles.leadSentinel}
        aria-hidden="true"
      />
      {/* 播放器固定後離開文件流，由這塊佔位撐住 .hero 原本的高度。
          不能只靠 .hero 的 aspect-ratio：Safari 算不出來，格子會塌成 0，
          下面的縮圖整批往上跳（連哨兵也一起上移，固定狀態還會來回抖動）。 */}
      {leadStuck ? (
        <div className={styles.leadSpacer} aria-hidden="true" />
      ) : null}
      <div className={leadStuck ? styles.leadFixed : undefined}>
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
  );

  const tabs = (
    <div className={styles.tabsWrap}>
      <nav className={styles.programTabs} aria-label="節目分類">
        {programs.map((item) => (
          <a
            className={item.key === slug ? styles.tabActive : undefined}
            href={`/programs/${item.key}`}
            key={item.key}
          >
            {item.name}
          </a>
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
            {feedBlocks.map((block, blockIndex) => {
              const isLeadBlock = blockIndex === 0;
              const leadEpisode = block.hero.episode;

              return (
                <Fragment key={block.key}>
                  <div
                    className={
                      block.kind === "hero"
                        ? styles.heroBlock
                        : styles.mediumBlock
                    }
                  >
                    <div
                      className={
                        block.kind === "hero" ? styles.hero : styles.mediumHero
                      }
                    >
                      {/* 拿不到 hlsUrl 時退回顯示大圖縮圖 */}
                      {isLeadBlock && leadEpisode && leadHls
                        ? renderLead(leadEpisode)
                        : renderHero(block.hero, block.kind === "medium")}
                    </div>

                    {block.side.length > 0 ? (
                      <div
                        className={
                          block.kind === "hero"
                            ? styles.heroSide
                            : styles.mediumSide
                        }
                      >
                        {block.side.map(renderThumb)}
                      </div>
                    ) : null}
                  </div>

                  {block.rows.length > 0 ? (
                    <div className={styles.rowsBlock}>
                      {block.rows.map(renderThumb)}
                    </div>
                  ) : null}
                </Fragment>
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
