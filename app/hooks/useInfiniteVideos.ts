import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoListItem } from "../_interfaces/videoArticle";
import type {
  PlaylistEntry,
  PlaylistItemsResponse,
} from "../_interfaces/playlist";

// playlist-list/topic 回傳：標題 + 該分區下的清單陣列
interface TopicListResponse {
  title: string;
  updatedAt: string;
  items: PlaylistEntry[];
}

// 話題列表頁：先打 playlist-list/topic 取得話題清單入口，
// 再用該清單的 playlist-items 端點做真實分頁（上游已提供 nextPage / hasMore）。
const TOPIC_LIST = "https://video.ltn.com.tw/brand/api/playlist-list/topic";

// useInfiniteVideos：封裝「無限往下載入影片清單」的狀態與行為。
// 回傳畫面需要的資料與哨兵 ref，元件只要把 sentinelRef 掛到 DOM 即可。
export function useInfiniteVideos() {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [title, setTitle] = useState(""); // 話題標題（取自上游清單）
  const [loading, setLoading] = useState(true); // 首次載入
  const [loadingMore, setLoadingMore] = useState(false); // 載入後續頁
  const [nextPage, setNextPage] = useState<number | null>(1); // 下一頁頁碼，null 代表沒有更多
  // 用 ref 擋住「正在抓取中又重複觸發」，避免 IntersectionObserver 連續觸發抓同一頁
  const fetchingRef = useRef(false);
  // playlist-items 的基底 API（不含頁碼），第一次取得後快取
  const apiBaseRef = useRef<string | null>(null);

  // 取得話題清單入口：回傳 playlist-items 的基底 API（已去掉尾端頁碼）
  const ensureApiBase = useCallback(async () => {
    if (apiBaseRef.current) return apiBaseRef.current;

    const res = await fetch(TOPIC_LIST);
    const data: TopicListResponse = await res.json();
    // playlist-list/topic 直接回傳 items（清單陣列），取第一份清單
    const entry = data.items?.[0];
    if (!entry?.apiUrl) return null;

    if (data.title) setTitle(data.title);
    // apiUrl 形如 .../playlist-items/{key}/1，去掉尾端頁碼當基底
    apiBaseRef.current = entry.apiUrl.replace(/\/\d+$/, "");
    return apiBaseRef.current;
  }, []);

  // loadPage：載入指定頁碼的影片，並把結果累加到清單。
  const loadPage = useCallback(
    async (page: number) => {
      // 已經有請求在進行中就直接退出，避免 observer 連環觸發把同一頁抓很多次
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const isFirst = page === 1;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      try {
        const base = await ensureApiBase();
        if (!base) {
          setNextPage(null);
          return;
        }

        const res = await fetch(`${base}/${page}`);
        const data: PlaylistItemsResponse = await res.json();
        const items = data.items ?? [];

        // 有資料才更新畫面；累加而非覆蓋，達成無限往下接。
        // 上游分頁可能在不同頁（或同頁）重複回傳同一支影片，
        // 這裡用 id 去重，避免清單出現重複資料導致 React key 衝突。
        if (items.length > 0) {
          setVideos((prev) => {
            const seen = new Set(prev.map((v) => v.id));
            const fresh: VideoListItem[] = [];
            for (const v of items as VideoListItem[]) {
              // 同時擋掉「跨頁重複」與「同一頁內重複」的 id
              if (seen.has(v.id)) continue;
              seen.add(v.id);
              fresh.push(v);
            }
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
        // 依上游提供的分頁資訊決定下一頁
        const more = data.hasMore ?? items.length > 0;
        setNextPage(more ? data.nextPage ?? page + 1 : null);
      } finally {
        // 不論成功或失敗都要解鎖，否則之後永遠抓不了
        fetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [ensureApiBase],
  );

  // 首次載入第 1 頁
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // 哨兵：進入畫面就載入下一頁
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || nextPage === null) return; // 沒有更多就不觀察

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadPage(nextPage);
      },
      { rootMargin: "400px" }, // 提前 400px 預載，捲到底前就接好
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextPage, loadPage]);

  return { videos, title, loading, loadingMore, nextPage, sentinelRef };
}
