import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoListItem } from "../_interfaces/videoArticle";
import { API_BASE } from "../_lib/api";

// list/{page} 回傳：直接就是分頁後的影片清單（上游已提供 nextPage / hasMore）
interface ListResponse {
  items: VideoListItem[];
  nextPage?: number | null; // 下一頁頁碼；沒有下一頁時為 null
  hasMore?: boolean; // 是否還有下一頁
}

// 最新影片列表頁：直接打 list/{page} 做分頁，回傳即為影片清單，
// 不需要像 playlist-list 那樣先取清單入口再分頁。
const LIST_API = `${API_BASE}/list`;

// useInfiniteVideos：封裝「無限往下載入影片清單」的狀態與行為。
// 回傳畫面需要的資料與哨兵 ref，元件只要把 sentinelRef 掛到 DOM 即可。
export function useInfiniteVideos() {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true); // 首次載入
  const [loadingMore, setLoadingMore] = useState(false); // 載入後續頁
  const [nextPage, setNextPage] = useState<number | null>(1); // 下一頁頁碼，null 代表沒有更多
  // 用 ref 擋住「正在抓取中又重複觸發」，避免 IntersectionObserver 連續觸發抓同一頁
  const fetchingRef = useRef(false);

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
        const res = await fetch(`${LIST_API}/${page}`);
        const data: ListResponse = await res.json();
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
        setNextPage(more ? (data.nextPage ?? page + 1) : null);
      } finally {
        // 不論成功或失敗都要解鎖，否則之後永遠抓不了
        fetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // 首次載入第 1 頁
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // 桌機「看更多」用：手動載入下一頁；沒有更多時不動作
  const loadMore = useCallback(() => {
    if (nextPage !== null) loadPage(nextPage);
  }, [nextPage, loadPage]);

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

  return { videos, loading, loadingMore, nextPage, sentinelRef, loadMore };
}
