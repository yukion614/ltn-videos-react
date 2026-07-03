"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Crumb from "@/app/_components/Crumb/Crumb";
import NotFoundPanel from "@/app/_components/NotFoundPanel/NotFoundPanel";
import type {
  VideoListItem,
  VideoListResponse,
} from "@/app/_interfaces/videoArticle";
import styles from "./page.module.scss";
import VedoThumbnail from "@/app/_components/VideoThumbnail/VideoThumbnail";
import VideoPlayer from "@/app/_components/VideoPlayer/VideoPlayer";
import { programMeta, getPrograms } from "@/app/_lib/programMeta";
import type { ProgramMeta } from "@/app/_lib/programMeta";
import { useDocumentMeta } from "@/app/_lib/useDocumentMeta";
import { watchUrlToSlug, toProxiedHls } from "@/app/_lib/videoDetail";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";
import { useIsMobile } from "@/app/hooks/useIsMobile";

const basePath = "https://video.ltn.com.tw/brand/api";

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

type PlaylistLoadState = "idle" | "loading" | "ready" | "empty" | "error";

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

function CategoryContent() {
  const pathname = usePathname();
  // 網址 /programs/{key} 的第 2 段就是後端節目 key（路由參數 = 後端 key）。
  // 用 usePathname 而非 useParams：外殼頁被伺服器服務於其他 key 時，
  // useParams 會拿到烤死的參數，usePathname 才反映真正的網址。
  const slug = pathname?.split("/").filter(Boolean)[1] ?? "";

  // 節目清單（tabs／標題／集數）改吃後端；初值用後備清單避免閃爍、
  // 後端回來後再覆蓋（新節目就會出現在 tabs 且能正確顯示標題）。
  const [programs, setPrograms] = useState<ProgramMeta[]>(programMeta);
  const [programsLoaded, setProgramsLoaded] = useState(programMeta.length > 0);
  useEffect(() => {
    let ignore = false;
    getPrograms().then((list) => {
      if (!ignore) {
        if (list.length) setPrograms(list);
        setProgramsLoaded(true);
      }
    }).catch(() => {
      if (!ignore) setProgramsLoaded(true);
    });
    return () => {
      ignore = true;
    };
  }, []);
  const program = programs.find((p) => p.key === slug);
  const [playlistState, setPlaylistState] =
    useState<PlaylistLoadState>("idle");
  const isMissingProgram =
    programsLoaded && !program && playlistState === "empty";

  // 分類頁沒有 per-page SEO API，就用節目名稱組出分頁標題與 OG（名稱回來前不注入）
  useDocumentMeta(
    isMissingProgram
      ? {
          title: "找不到此節目 - 自由影音",
          description: "這個節目可能不存在、已下架，或網址輸入有誤。",
          canonicalUrl: slug ? `/programs/${slug}` : undefined,
        }
      : program?.name
      ? {
          title: `${program.name} - 自由影音`,
          description: `${program.name}｜自由影音節目最新影片一覽`,
          canonicalUrl: slug ? `/programs/${slug}` : undefined,
        }
      : null,
  );

  const [thumbnailPool, setThumbnailPool] = useState<VideoListItem[]>([]);
  // 第一則影片的播放網址（列表 API 不含 hlsUrl，需另打詳情補上）
  const [leadHls, setLeadHls] = useState<string>("");
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
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const activeKeyRef = useRef<string | null>(null);

  // 切換節目時重置無限滾動的數量
  useEffect(() => {
    activeKeyRef.current = slug;
    fetchingRef.current = false;
    setThumbnailPool([]);
    setNextPage(slug ? 1 : null);
    setPlaylistState(slug ? "loading" : "idle");
  }, [slug]);

  const fetchPlaylistPage = useCallback(
    async (page: number, replace = false) => {
      if (!slug || fetchingRef.current) {
        return;
      }

      fetchingRef.current = true;
      activeKeyRef.current = slug;
      setLoadingMore(true);
      if (replace) {
        setPlaylistState("loading");
      }

      try {
        // slug 就是後端 playlist key，直接抓該清單的分頁（不再靠節目名稱對照）
        const res = await fetch(`${basePath}/playlist-items/${slug}/${page}`);

        if (!res.ok) {
          if (activeKeyRef.current !== slug) {
            return;
          }
          if (replace) {
            setThumbnailPool([]);
            setPlaylistState("empty");
          }
          setNextPage(null);
          return;
        }

        const data: VideoListResponse = await res.json();

        // 抓的過程中若已切換到別的節目，丟棄這批結果
        if (activeKeyRef.current !== slug) {
          return;
        }

        const items = data.items || [];
        const hasMore = data.hasMore ?? items.length > 0;
        setThumbnailPool((prev) => (replace ? items : [...prev, ...items]));
        setNextPage(hasMore ? (data.nextPage ?? page + 1) : null);
        if (replace) {
          setPlaylistState(items.length > 0 ? "ready" : "empty");
        }
      } catch {
        if (activeKeyRef.current !== slug) {
          return;
        }
        if (replace) {
          setThumbnailPool([]);
          setPlaylistState("error");
        }
        setNextPage(null);
      } finally {
        if (activeKeyRef.current === slug) {
          setLoadingMore(false);
        }
        fetchingRef.current = false;
      }
    },
    [slug],
  );

  useEffect(() => {
    if (!slug) {
      setThumbnailPool([]);
      setNextPage(null);
      return;
    }

    fetchPlaylistPage(1, true);
  }, [fetchPlaylistPage, slug]);

  // 無限滾動：底部 sentinel 進入視窗就再載入一批
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || nextPage === null) {
      return;
    }

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
  }, [fetchPlaylistPage, loadingMore, nextPage]);

  // 第一則影片改用播放器：列表資料沒有 hlsUrl，需以 watchUrl 的 slug 另打詳情補上
  const leadItem = thumbnailPool[0];
  const leadSlug = leadItem
    ? watchUrlToSlug(leadItem.watchUrl) ?? String(leadItem.id)
    : "";

  useEffect(() => {
    if (!leadSlug) {
      setLeadHls("");
      return;
    }

    let cancelled = false;
    setLeadHls("");
    fetch(`${basePath}/video/${leadSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((detail: BrandVideoResponse | null) => {
        if (cancelled) return;
        // 詳情可能取不到 video（下架／異常），補空字串讓畫面退回縮圖
        setLeadHls(toProxiedHls(detail?.video?.hlsUrl ?? "") ?? "");
      })
      .catch(() => {
        if (!cancelled) setLeadHls("");
      });

    return () => {
      cancelled = true;
    };
  }, [leadSlug]);

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

  // 不再因為「不在寫死清單」而導回 /programs；未知 key 也照網址抓後端。
  // slug 為空（外殼在 prerender 階段 window 尚未就緒）時先不渲染。
  if (!slug) {
    return null;
  }

  const programName = program?.name ?? "";
  const crumbs = [
    {
      href: "/",
      label: "首頁",
    },
    {
      href: "/programs",
      label: "節目",
    },
    {
      href: `/programs/${slug}`,
      label: programName,
    },
  ];

  const missingCrumbs = [
    {
      href: "/",
      label: "首頁",
    },
    {
      href: "/programs",
      label: "節目",
    },
    {
      label: "找不到此節目",
    },
  ];

  if (isMissingProgram) {
    return (
      <main className={styles.page}>
        <div className={styles.tabsWrap}>
          <nav className={styles.programTabs} aria-label="節目分類">
            {programs.map((item) => (
              <Link href={`/programs/${item.key}`} key={item.key}>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.wrap}>
          <div className={styles.crumbWrap}>
            <Crumb crumbs={missingCrumbs} />
          </div>

          <NotFoundPanel
            className={styles.programNotFound}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.tabsWrap}>
        <nav className={styles.programTabs} aria-label="節目分類">
          {programs.map((item) => (
            <Link
              className={item.key === slug ? styles.tabActive : undefined}
              href={`/programs/${item.key}`}
              key={item.key}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.wrap}>
        <div className={styles.crumbWrap}>
          <Crumb crumbs={crumbs} />
        </div>

        <h1 className={styles.programName}>{programName}</h1>

        <div className={styles.content}>
          <section className={styles.feed} aria-label="節目影片列表">
            {episodes.map((item, index) => {
              const role = slotRole(index);

              // 第一則：改用播放器並自動播放；hlsUrl 還沒補到前先顯示大圖縮圖
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
                            titlePosition="top"
                            allowFullscreen
                          />
                        </div>
                      </>
                    ) : (
                      <VedoThumbnail
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
                  variant="stacked"
                  title={item.title}
                  duration={item.duration}
                  slug={item.href}
                  src={item.thumbnailUrl}
                  alt={item.title}
                />
              );
            })}
          </section>

          {nextPage !== null ? (
            <div
              ref={sentinelRef}
              className={styles.sentinel}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

// useSearchParams 在靜態匯出（output: export）時必須包在 Suspense 邊界內，否則整頁 prerender 失敗
export default function Page() {
  return (
    <Suspense fallback={null}>
      <CategoryContent />
    </Suspense>
  );
}
