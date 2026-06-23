"use client";

import dynamic from "next/dynamic";
import styles from "./VideoPlayer.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
});

interface VideoPlayerProps {
  src?: string;
  poster?: string; //影片還沒播放前顯示的封面圖
  title?: string;
  width?: number | string;
  height?: number | string;
}

export default function VideoPlayer({
  src,
  poster,
  title,
  width = "100%",
  height = "auto",
}: VideoPlayerProps) {
  return (
    <div className={styles.playerWrapper} style={{ width, height }}>
      <ReactPlayer
        src={src}
        controls={true} // 顯示播放控制列
        light={poster}
        playing={true} // 自動播放
        muted={true} // 瀏覽器規定：自動播放必須靜音才會成功
        width="100%"
        height="100%"
      />
      {title ? (
        <>
          <span className={styles.gradient} aria-hidden="true" />
          <span className={styles.mediaTitle}>{title}</span>
        </>
      ) : null}
    </div>
  );
}
