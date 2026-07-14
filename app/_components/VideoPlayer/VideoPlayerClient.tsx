"use client";

import dynamic from "next/dynamic";
import styles from "./VideoPlayer.module.scss";

// 只在瀏覽器渲染的播放器（ssr: false）。詳情頁／節目頁請 import 這支，不要直接用 VideoPlayer。

const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  ssr: false,
  // 佔位框：沿用 playerWrapper 的 16:9 黑底，避免播放器載入後才撐開造成版面跳動
  loading: () => <div className={styles.playerWrapper} aria-hidden="true" />,
});

export default VideoPlayer;
