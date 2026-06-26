import { useCallback, useEffect, useRef, useState } from "react";
import type {
  VideoListItem,
  VideoListResponse,
} from "../_interfaces/videoArticle";

// 純靜態版：沒有本地 API，改直接打上游（已開 CORS）。
// 上游只回 15 筆且不分頁，這裡在前端把它擴充成可分頁的資料池，用來示範無限 scroll。
const UPSTREAM = "https://video.ltn.com.tw/brand/api/list";
const PAGE_SIZE = 9; // 每頁筆數
const TOTAL_PAGES = 6; // 模擬總頁數（捲到底會停）

// useInfiniteVideos：封裝「無限往下載入影片清單」的狀態與行為。
// 回傳畫面需要的資料與哨兵 ref，元件只要把 sentinelRef 掛到 DOM 即可。
export function useInfiniteVideos() {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true); // 首次載入
  const [loadingMore, setLoadingMore] = useState(false); // 載入後續頁
  const [nextPage, setNextPage] = useState<number | null>(1); // 下一頁頁碼，null 代表沒有更多
  // 用 ref 擋住「正在抓取中又重複觸發」，避免 IntersectionObserver 連續觸發抓同一頁
  const fetchingRef = useRef(false);
  // 前端資料池（打一次上游後快取在這裡，之後分頁都從它切片）
  const poolRef = useRef<VideoListItem[] | null>(null);

  // loadPage：載入指定頁碼的影片，並把結果累加到清單。useCallback 空依賴 → 整個生命週期只建立一次
  const loadPage = useCallback(async (page: number) => {
    // 已經有請求在進行中就直接退出，避免 observer 連環觸發把同一頁抓很多次
    if (fetchingRef.current) return;
    // 上鎖：標記「現在正在抓取」
    fetchingRef.current = true;
    // 是不是第 1 頁（首次載入）→ 決定要顯示哪種 loading
    const isFirst = page === 1;
    // 首頁用全頁 loading；後續頁用「載入更多」的小 loading
    if (isFirst) setLoading(true);
    else setLoadingMore(true);

    try {
      // 第一次需要時才打上游，並把 15 筆素材擴充成多頁資料池（id 重新編號保證唯一）
      if (!poolRef.current) {
        const res = await fetch(UPSTREAM);
        const data: VideoListResponse = await res.json();
        const base = data.items;
        const target = PAGE_SIZE * TOTAL_PAGES;
        poolRef.current = Array.from({ length: target }, (_, i) => {
          const src = base[i % base.length];
          return {
            ...src,
            id: 100000 + i, // 唯一遞增 id（避免 React key 重複）
            title: `${src.title}（#${i + 1}）`, // 標明序號，捲動時可看出有載入新資料
          };
        });
      }

      // 從資料池切出這一頁
      const pool = poolRef.current;
      const start = (page - 1) * PAGE_SIZE;
      const items = pool.slice(start, start + PAGE_SIZE);
      const hasMore = start + PAGE_SIZE < pool.length;

      // 有資料才更新畫面；累加而非覆蓋，達成無限往下接
      if (items.length > 0) setVideos((prev) => [...prev, ...items]);
      // 還有更多就記下一頁頁碼，沒有就設 null 停止觀察
      setNextPage(hasMore ? page + 1 : null);
    } finally {
      // 不論成功或失敗都要解鎖，否則之後永遠抓不了
      fetchingRef.current = false;
      // 關掉兩種 loading 狀態
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

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

  return { videos, loading, loadingMore, nextPage, sentinelRef };
}
