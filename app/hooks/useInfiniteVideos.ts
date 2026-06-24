import { useCallback, useEffect, useRef, useState } from "react";
import type {
  VideoListItem,
  VideoListResponse,
} from "../_interfaces/videoArticle";

// 走本地分頁 API（app/api/list）；真實上游不分頁，無法示範無限 scroll
const basePath = "/api";

// useInfiniteVideos：封裝「無限往下載入影片清單」的狀態與行為。
// 回傳畫面需要的資料與哨兵 ref，元件只要把 sentinelRef 掛到 DOM 即可。
export function useInfiniteVideos() {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true); // 首次載入
  const [loadingMore, setLoadingMore] = useState(false); // 載入後續頁
  const [nextPage, setNextPage] = useState<number | null>(1); // 下一頁頁碼，null 代表沒有更多
  // 用 ref 擋住「正在抓取中又重複觸發」，避免 IntersectionObserver 連續觸發抓同一頁
  const fetchingRef = useRef(false);
  // 記住已載入的 id，跨頁去重不依賴 videos state（避免 useCallback 抓到舊值）
  const seenIdsRef = useRef<Set<number>>(new Set());

  // loadPage：抓取指定頁碼的影片，並把結果累加到清單。useCallback 空依賴 → 整個生命週期只建立一次
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
      // 向本地分頁 API 要這一頁的資料
      const res = await fetch(`${basePath}/list?page=${page}`);
      // 解析 JSON 成我們定義的回傳型別
      const data: VideoListResponse = await res.json();
      // 依 id 去重，避免後端回傳重疊資料造成重複 key（只留沒看過的）
      const fresh = data.items.filter((v) => !seenIdsRef.current.has(v.id));
      // 把這批新 id 全部記進「已看過」集合，供下一頁去重
      fresh.forEach((v) => seenIdsRef.current.add(v.id));

      // 有新資料才更新畫面；累加而非覆蓋，達成無限往下接
      if (fresh.length > 0) setVideos((prev) => [...prev, ...fresh]);

      // 信任資料、不信任 hasMore：非首頁卻沒有新資料 → 視為到底，把 nextPage 設 null 停止觀察
      // （目前後端 hasMore 永遠回 true 且不分頁，靠這條件避免無限空轉）
      if (!isFirst && fresh.length === 0) setNextPage(null);
      // 否則照後端給的：還有更多就記下一頁頁碼，沒有就設 null
      else setNextPage(data.hasMore ? data.nextPage : null);
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
