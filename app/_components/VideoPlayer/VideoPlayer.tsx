"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "../../hooks/useIsMobile";
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
  allowFullscreen?: boolean; // 是否顯示全螢幕鍵（首頁、短影音不需要）
}

// 跨瀏覽器的全螢幕 API 型別（含 Safari/舊版 webkit 前綴）
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
// iPhone Safari 不支援對 div 全螢幕，只能對 <video> 呼叫這組 webkit 專屬 API
type IOSVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export default function VideoPlayer({
  src,
  poster,
  title,
  width = "100%",
  height = "auto",
  allowFullscreen = false,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true); // 是否正在播放（預設 true → 自動播放）
  const [currentTime, setCurrentTime] = useState(0); // 目前播放秒數
  const [duration, setDuration] = useState(0); // 影片總長度（秒）
  const [muted, setMuted] = useState(true); // 是否靜音（預設 true → 自動播放才會成功）
  const [volume, setVolume] = useState(0.8); // 音量 0~1
  const [hasStarted, setHasStarted] = useState(false); // 是否已真正開始播放（light 封面點擊前為 false）
  const mediaRef = useRef<HTMLVideoElement | null>(null); // 底層 <video> 元素，用來拖曳跳轉
  const wrapperRef = useRef<HTMLDivElement | null>(null); // 播放器外框，全螢幕的目標元素
  const [isFullscreen, setIsFullscreen] = useState(false); // 是否處於全螢幕
  const isMobile = useIsMobile(); // 手機版：volume 屬性在 iOS 唯讀，音量滑桿無效，只留靜音鍵

  const isSeekable = Number.isFinite(duration) && duration > 0; // 直播 duration 是 Infinity，不顯示進度條
  // 封面（light）尚未點擊播放前，react-player 會顯示自己的播放鍵；此時隱藏自製控制鍵，避免兩顆按鈕重疊
  const previewActive = Boolean(poster) && !hasStarted;

  // 監聽全螢幕狀態變化（含使用者按 Esc 退出），同步按鈕圖示
  useEffect(() => {
    if (!allowFullscreen) return;
    const doc = document as FullscreenDocument;
    const onChange = () => {
      const active = doc.fullscreenElement ?? doc.webkitFullscreenElement;
      setIsFullscreen(active === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [allowFullscreen]);

  // 切換全螢幕：進入時放大整個外框，退出時還原
  function toggleFullscreen() {
    const el = wrapperRef.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    if (!el) return;

    // 桌機 / Android / iPad：標準（含 webkit 前綴）的元素全螢幕
    if (el.requestFullscreen || el.webkitRequestFullscreen) {
      const active = doc.fullscreenElement ?? doc.webkitFullscreenElement;
      if (active) {
        if (doc.exitFullscreen) doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      } else {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
      return;
    }

    // iPhone Safari：不支援 div 全螢幕，改對底層 <video> 用 iOS 專屬 API
    const video = (mediaRef.current ??
      el.querySelector("video")) as IOSVideoElement | null;
    if (!video) return;
    if (video.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.();
    } else {
      video.webkitEnterFullscreen?.();
    }
  }

  // 把秒數格式化成 m:ss
  function formatTime(sec: number) {
    if (!Number.isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // 拖曳進度條 → 直接設定 <video> 的 currentTime
  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    if (mediaRef.current) mediaRef.current.currentTime = next;
    setCurrentTime(next);
  }

  // 拖曳音量 → 更新音量，音量 > 0 時自動解除靜音
  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setVolume(next);
    setMuted(next === 0);
  }

  // 全螢幕鍵（播放中放控制列、暫停時獨立放右下角，共用同一顆避免重複）
  const fullscreenButton = allowFullscreen ? (
    <button
      type="button"
      className={styles.fullscreenToggle}
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "退出全螢幕" : "全螢幕"}
    >
      {isFullscreen ? (
        // 退出全螢幕圖示
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M9 20v-3a2 2 0 0 0-2-2H4M15 20v-3a2 2 0 0 1 2-2h3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // 全螢幕圖示
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  ) : null;

  return (
    <div
      ref={wrapperRef}
      className={styles.playerWrapper}
      style={{ width, height }}
    >
      <ReactPlayer
        src={src}
        controls={false} // 關掉原生控制列，改用下方自製播放鍵
        light={poster}
        playing={isPlaying} // 由 state 控制，暫停才會真的停住
        muted={muted} // 由 state 控制；預設靜音以符合自動播放規定
        volume={volume} // 音量 0~1
        playsInline // iOS 必備：沒有它手機會擋掉行內自動播放（畫面卡住、按鈕顯示成暫停）
        autoPlay // 配合 muted 讓手機也能自動開播
        width="100%"
        height="100%"
        onPlay={() => {
          setIsPlaying(true); // 開始播放 → 隱藏標題
          setHasStarted(true); // 標記已開始，之後才顯示自製控制鍵
        }}
        onPause={() => setIsPlaying(false)} // 暫停 → 顯示標題
        onVolumeChange={(e) => {
          // react-player 內部每次 render 都會把 video.volume 重設回 props.volume，
          // 我們的進度更新又讓元件每秒 re-render 數次。若狀態只往 video 單向寫，
          // 使用者用手機硬體音量鍵調整後會被馬上覆蓋（表現為「一調就沒聲音」）。
          // 這裡反過來把裝置實際的 muted/volume 同步回 state，讓受控值跟著裝置走、不再打架。
          const el = e.currentTarget;
          mediaRef.current = el;
          setMuted(el.muted);
          setVolume(el.volume);
        }}
        onTimeUpdate={(e) => {
          mediaRef.current = e.currentTarget; // 記住底層 video 元素
          setCurrentTime(e.currentTarget.currentTime); // 更新進度
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)} // 取得總長度
      />

      {/* 自製播放/暫停鍵，置中，避開底部標題；封面播放鍵還在時先不顯示，避免重疊 */}
      {!previewActive ? (
        <button
          type="button"
          className={`${styles.playToggle} ${
            isPlaying ? styles.playing : styles.paused
          }`}
          onClick={() => setIsPlaying((prev) => !prev)}
          aria-label={isPlaying ? "暫停" : "播放"}
        >
          {isPlaying ? (
            // 暫停圖示 ❚❚
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            // 播放圖示 ▶
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          )}
        </button>
      ) : null}

      {/* 底部控制列：播放中才顯示；暫停或封面尚未點擊時隱藏（保持畫面乾淨） */}
      {isPlaying && !previewActive ? (
        <div className={styles.progressBar}>
          {/* 進度條：只有非直播（有總長度）才顯示 */}
          {isSeekable ? (
            <>
              <span className={styles.time}>{formatTime(currentTime)}</span>
              <input
                type="range"
                className={styles.seek}
                min={0}
                max={duration}
                step="any"
                value={currentTime}
                onChange={handleSeek}
                aria-label="播放進度"
              />
              <span className={styles.time}>{formatTime(duration)}</span>
            </>
          ) : (
            // 直播沒有進度可拖曳，顯示 LIVE 標記，並把音量推到最右
            // <span className={`${styles.time} ${styles.liveTag}`}>● LIVE</span>
            <></>
          )}

          {/* 音量控制：喇叭鍵切換靜音 + 滑桿調音量（直播 / 一般影片都有） */}
          <button
            type="button"
            className={styles.muteToggle}
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? "取消靜音" : "靜音"}
          >
            {muted || volume === 0 ? (
              // 靜音圖示 🔇
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" />
                <path
                  d="M16 9l5 5M21 9l-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            ) : (
              // 有聲音圖示 🔊
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" />
                <path
                  d="M16 8a5 5 0 010 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
          </button>
          {/* 音量滑桿：手機（iOS）的 video.volume 唯讀、拖了沒效果，只在桌機顯示 */}
          {!isMobile ? (
            <input
              type="range"
              className={styles.volume}
              min={0}
              max={1}
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolume}
              aria-label="音量"
            />
          ) : null}

          {/* 全螢幕鍵：由 allowFullscreen 控制是否顯示（首頁、短影音不顯示） */}
          {fullscreenButton}
        </div>
      ) : null}

      {/* 暫停／停止狀態：控制列已隱藏，獨立把全螢幕鍵放右下角，保持可用 */}
      {!previewActive && !isPlaying && allowFullscreen ? (
        <div className={styles.fullscreenStandalone}>{fullscreenButton}</div>
      ) : null}

      {title && !isPlaying ? (
        <>
          <span className={styles.gradient} aria-hidden="true" />
          <span className={styles.mediaTitle}>{title}</span>
        </>
      ) : null}
    </div>
  );
}
