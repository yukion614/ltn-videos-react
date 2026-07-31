"use client";

import { useEffect } from "react";

/**
 * 把網址列從 /topic 改寫成 /topic/video/{slug}。
 *
 * /topic 是「話題第一支影片」的原地渲染（不做 server 轉址，理由見 page.tsx），
 * 網址列預設會停在 /topic。這裡沿用 ShortsFeed 的做法，掛載後用 replaceState
 * 補上影片自己的網址，讓使用者複製／分享時拿到的是該影片的固定連結。
 *
 * replaceState 只改網址列字串，不發 HTTP 請求，所以不會重新觸發 server 渲染，
 * 也不會產生任何能被 CDN 快取住的轉址——這正是它能避開 307 那組問題的原因。
 * 用 replaceState 而非 pushState：避免在上一頁紀錄多塞一筆，否則使用者按返回
 * 會先退回 /topic 再退出去，等於要按兩次。
 */
export default function TopicUrlSync({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    // 只在還停在 /topic 時改寫；使用者已自行前往別頁時不干擾
    if (window.location.pathname !== "/topic") return;
    window.history.replaceState(null, "", `/topic/video/${slug}`);
  }, [slug]);

  return null;
}
