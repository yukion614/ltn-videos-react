"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Crumb from "@/app/_components/Crumb/Crumb";
import type {
  VideoListItem,
  VideoListResponse,
} from "@/app/_interfaces/videoArticle";
import type {
  ProgramListResponse,
  PlaylistEntry,
} from "@/app/_interfaces/playlist";
import styles from "./page.module.scss";
import VedoThumbnail from "@/app/_components/VideoThumbnail/VideoThumbnail";
import { programMeta, programKeys } from "@/app/_lib/programMeta";
import { watchUrlToSlug } from "@/app/_lib/videoDetail";

const basePath = "https://video.ltn.com.tw/brand/api";

const programs = programMeta;
const validKeys = programKeys;

const episodeSeeds = [
  {
    title:
      "桃園人為何怒了？黃世杰挑戰張善政揭他「最大弱點」！市政危機成選戰變天關鍵",
    date: "2026/06/18",
    duration: "12:48",
    views: "45萬次觀看",
    label: "完整訪談",
  },
  {
    title: "完整版上集／來賓激辯國防特別預算與兩岸關係走向，區域戰略平衡怎麼看",
    date: "2026/06/16",
    duration: "18:22",
    views: "31萬次觀看",
    label: "焦點對談",
  },
  {
    title: "深度專訪／政壇老將回顧三十年從政路，揭密關鍵決策背後的內幕與掙扎",
    date: "2026/06/14",
    duration: "09:36",
    views: "22萬次觀看",
    label: "深度專訪",
  },
  {
    title: "焦點議題／物價民生政策現場大體檢，專家點名三大盲點與下一步挑戰",
    date: "2026/06/12",
    duration: "14:10",
    views: "19萬次觀看",
    label: "議題解析",
  },
  {
    title: "獨家解析／最新民調數字背後的真相，這個族群成為決勝關鍵變數",
    date: "2026/06/10",
    duration: "11:05",
    views: "28萬次觀看",
    label: "獨家解析",
  },
  {
    title: "現場直擊／街頭民眾最真實的心聲公開，這次選舉最在意的是什麼",
    date: "2026/06/08",
    duration: "07:42",
    views: "16萬次觀看",
    label: "現場直擊",
  },
  {
    title: "完整版下集／攤牌時刻各方立場一次說清楚，交鋒火花讓氣氛瞬間凝結",
    date: "2026/06/06",
    duration: "21:17",
    views: "37萬次觀看",
    label: "完整收看",
  },
  {
    title: "幕後花絮／錄影現場的笑料與真情流露，來賓卸下心防談從政路",
    date: "2026/06/04",
    duration: "05:58",
    views: "12萬次觀看",
    label: "幕後花絮",
  },
  {
    title: "重點回顧／本週最受關注的三件大事完整整理，一次掌握政壇風向",
    date: "2026/06/02",
    duration: "10:24",
    views: "26萬次觀看",
    label: "重點回顧",
  },
  {
    title: "專家連線／國際變局下台灣的因應之道，從地緣政治到經濟布局",
    date: "2026/05/30",
    duration: "16:33",
    views: "18萬次觀看",
    label: "專家連線",
  },
  {
    title: "犀利對談／名嘴與學者針鋒相對一小時，爭議政策雙方寸步不讓",
    date: "2026/05/28",
    duration: "20:01",
    views: "33萬次觀看",
    label: "犀利對談",
  },
  {
    title: "年度特輯／回顧這一年走過的重大時刻，那些改變台灣政局的關鍵畫面",
    date: "2026/05/26",
    duration: "24:16",
    views: "41萬次觀看",
    label: "年度特輯",
  },
];

function getSlug(category: string | string[] | undefined) {
  if (Array.isArray(category)) {
    return category[0] || "";
  }

  return category || "";
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

function CategoryContent() {
  const params = useParams();
  const router = useRouter();
  const slug = getSlug(params.category);
  const programIndex = programs.findIndex((program) => program.key === slug);
  const program = programIndex >= 0 ? programs[programIndex] : undefined;
  const isValid = validKeys.includes(slug);
  const [thumbnailPool, setThumbnailPool] = useState<VideoListItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const activeKeyRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  useEffect(() => {
    if (!isValid) {
      router.replace("/programs");
    }
  }, [isValid, router]);

  // 切換節目時重置無限滾動的數量
  useEffect(() => {
    activeKeyRef.current = key;
    fetchingRef.current = false;
    setThumbnailPool([]);
    setNextPage(key ? 1 : null);
  }, [slug, key]);

  const fetchPlaylistPage = useCallback(
    async (page: number, replace = false) => {
      //if (!isValid || !key || fetchingRef.current) {
      if (!isValid || fetchingRef.current) {
        return;
      }

      fetchingRef.current = true;
      activeKeyRef.current = key;
      setLoadingMore(true);

      try {
        let res: Response;
        console.log("dont have key :", key);
        // 情況 A：網址沒有帶 key，先用 program 名字去抓對應的 apiUrl
        if (!key) {
          console.log("dont have key :");
          const listRes = await fetch(`${basePath}/playlist-list/program`);
          if (!listRes.ok) throw new Error("撈取節目清單失敗");

          const listData = await listRes.json();
          const matchedItem = listData?.items?.find(
            (item: any) => item.title === program?.name,
          );

          const apiUrl = matchedItem?.apiUrl;
          if (!apiUrl) {
            setThumbnailPool([]);
            setNextPage(null);
            return;
          }

          // 用找到的 apiUrl 撈取實際的影片列表
          res = await fetch(apiUrl);
        } else {
          // 情況 B：網址本來就有帶 key，直接撈取
          res = await fetch(`${basePath}/playlist-items/${key}/${page}`);
        }

        // 統一驗證撈取影片列表的 response
        if (!res.ok) {
          if (replace) {
            setThumbnailPool([]);
          }
          setNextPage(null);
          return;
        }
        // if (!key) {
        //   const res = await fetch(`${basePath}/playlist-list/program`);
        //   const data: ProgramListResponse = await res.json();
        //   const matchedItem = data?.items.find(
        //     (item) => item.title === program?.name,
        //   );
        //   const apiUrl = matchedItem?.apiUrl;
        //   if (!apiUrl) return;
        //   const resNext = await fetch(apiUrl);
        //   const dataNext: ProgramListResponse = await resNext.json();
        //   return dataNext;
        // } else {
        //   const res = await fetch(`${basePath}/playlist-items/${key}/${page}`);
        //   if (!res.ok) {
        //     if (replace) {
        //       setThumbnailPool([]);
        //     }
        //     setNextPage(null);
        //     return;
        //   }
        // }

        const data: VideoListResponse = await res.json();

        if (activeKeyRef.current !== key) {
          return;
        }

        const items = data.items || [];
        const hasMore = data.hasMore ?? items.length > 0;
        setThumbnailPool((prev) => (replace ? items : [...prev, ...items]));
        setNextPage(hasMore ? (data.nextPage ?? page + 1) : null);
      } catch {
        if (replace) {
          setThumbnailPool([]);
        }
        setNextPage(null);
      } finally {
        if (activeKeyRef.current === key) {
          setLoadingMore(false);
        }
        fetchingRef.current = false;
      }
    },
    [isValid, key],
  );

  useEffect(() => {
    // if (!isValid || !key) {
    //   setThumbnailPool([]);
    //   setNextPage(null);
    //   return;
    // }
    if (!isValid) {
      setThumbnailPool([]);
      setNextPage(null);
      return;
    }

    fetchPlaylistPage(1, true);
  }, [fetchPlaylistPage, isValid, key]);

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

  const episodes = useMemo(() => {
    const currentProgram = program || programs[0];
    return thumbnailPool.map(
      (video, index): ProgramEpisode => ({
        id: `${currentProgram.key}-${video.id}-${index}`,
        href: `/programs/${currentProgram.key}/video/${watchUrlToSlug(video.watchUrl) ?? video.id}`,
        title: video.title,
        date: video.publishAt?.split(" ")[0] || "",
        duration: "",
        views: "",
        label: "",
        ep: `EP.${Math.max(currentProgram.ep - index, 1)}`,
        thumbnailUrl: video.thumbnailUrl,
      }),
    );
  }, [program, thumbnailPool]);

  if (!isValid || !program) {
    return null;
  }

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
      href: `/programs/${program.key}`,
      label: program.name,
    },
  ];

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

        <h1 className={styles.programName}>{program.name}</h1>

        <div className={styles.content}>
          <section className={styles.feed} aria-label="節目影片列表">
            {episodes.map((item, index) => {
              const role = slotRole(index);

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
