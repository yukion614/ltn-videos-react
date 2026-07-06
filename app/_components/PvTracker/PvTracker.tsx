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
      // 比照正式站：第一個參數帶當前網域（正式環境為 video.ltn.com.tw），
      // type / group / no 留空。
      window.getScrNews?.(location.hostname, "", "", "");
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
