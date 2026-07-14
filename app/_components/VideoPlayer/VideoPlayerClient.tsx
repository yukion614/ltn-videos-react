"use client";

import dynamic from "next/dynamic";
import styles from "./VideoPlayer.module.scss";

// 只在瀏覽器渲染的播放器（ssr: false）。詳情頁／節目頁請 import 這支，不要直接用 VideoPlayer。
//
// 為什麼播放器不能在 server 渲染：
//   VideoPlayer 的畫面依賴兩個「server 上只能用猜的」條件——
//     1. useIsMobile()：依賴 window，server 一律回 false（決定音量滑桿要不要出現）
//     2. isPlaying 初值樂觀設 true：假設自動播放會成功，但 server 無從得知
//   這兩頁改成 server 渲染後，猜錯的那一幀會被實際畫到螢幕上，JS 接手再更正
//   （控制列、音量滑桿、播放鍵出現又消失）——那個更正就是使用者看到的閃動。
//
//   首頁的播放器要等 API 資料到齊才在 client 掛載、本來就不經 SSR，所以不會閃。
//   這裡讓詳情頁／節目頁走同一條路，行為對齊首頁。
//
// SEO 不受影響：爬蟲讀的是 og:* / <title> / <h1> / 影片清單，那些仍由 server 渲染；
// <video> 元素本身對爬蟲沒有意義。
const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  ssr: false,
  // 佔位框：沿用 playerWrapper 的 16:9 黑底，避免播放器載入後才撐開造成版面跳動
  loading: () => <div className={styles.playerWrapper} aria-hidden="true" />,
});

export default VideoPlayer;
