"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// c.js 會在 window 上掛這些全域變數／函式
declare global {
  interface Window {
    pvServer?: string;
    getScrNews?: (
      channel: string,
      type: string,
      group: string,
      no: string,
    ) => void;
  }
}

/**
 * 從路徑取出影片 id：抓 `video` 或 `shorts` 這段後面的一段（如
 * /programs/xxx/video/202607... → "202607..."；/shorts/{slug} → "{slug}"）。
 * 非影片／短影音頁回傳 null。
 */
function getVideoId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  for (const key of ["video", "shorts"]) {
    const idx = segments.indexOf(key);
    if (idx !== -1 && segments[idx + 1]) return segments[idx + 1];
  }
  return null;
}

/**
 * PV 追蹤（client component，集中處理所有需要瀏覽器互動的追蹤邏輯）。
 *
 * 為什麼放這裡而不是 layout：layout 是 Server Component，不能傳
 * onLoad 這種事件處理函式給 <Script>，所以 c.js 的載入與計數都收在這個
 * client 元件裡。
 *
 * 計數時機：
 *  - 首次載入：c.js 的 onLoad 觸發（此時 getScrNews 才存在）
 *  - SPA 換頁：監聽 usePathname 變化，c.js 已載入（ready）後才補計
 */
export default function PvTracker() {
  const pathname = usePathname();
  const ready = useRef(false); // c.js 是否已載入完成

  const sendPv = () => {
    try {
      // 清掉上一頁殘留的 PV script 節點，避免重複計數。因為 c.js 會在每次換頁時新增一個
      document
        .querySelectorAll('script[src*="RI_Server"]')
        .forEach((el) => el.remove());

      // 影片詳細頁（/topic/video/[id]、/latest/video/[id]）與短影音（/shorts/[id]）：
      // group 帶 "video"、no 帶影片 id；其餘頁面 group / no 留空。
      // 第一個參數帶當前網域（正式環境為 video.ltn.com.tw）。
      const videoId = getVideoId(pathname);
      const group = videoId ? "video" : "";
      const no = videoId ?? "";
      window.getScrNews?.(location.hostname, "", group, no);
    } catch (e) {
      console.error("PV 追蹤失敗", e);
    }
  };

  useEffect(() => {
    // c.js 尚未載入完成前跳過（首次計數由下方 Script 的 onLoad 負責，避免重複）
    if (!ready.current) return;
    sendPv();
  }, [pathname]);

  return (
    <Script
      src="https://cache.ltn.com.tw/js/c.js"
      strategy="afterInteractive"
      onLoad={() => {
        ready.current = true;
        sendPv(); // 首次 PV
      }}
    />
  );
}
