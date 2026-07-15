"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useIsMobile } from "../../hooks/useIsMobile";
import styles from "./VideoPlayer.module.scss";

// 這個網址是不是 HLS（.m3u8）串流
function isHlsSource(url?: string) {
  return !!url && /\.m3u8($|\?)/i.test(url);
}

// 瀏覽器是否原生支援 HLS（iOS Safari / macOS Safari 皆為 true）。
// 原生支援時直接把 .m3u8 餵給 <video> 即可，完全不需要 hls.js。
function canPlayNativeHls() {
  if (typeof document === "undefined") return false;
  const v = document.createElement("video");
  return (
    v.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    v.canPlayType("application/x-mpegURL") !== ""
  );
}

// 播放後多久自動隱藏標題與控制列（毫秒）
const AUTO_HIDE_MS = 5000;

// sprite 縮圖規格：後端固定「每 2 秒一格、10×10 格、每格 160×90、每張 1600×900」，
// 多於 100 格就換下一張（Thumbnail_000000001.jpg → _000000002.jpg …）
const SPRITE_INTERVAL = 2; // 每格代表的秒數
const SPRITE_COLS = 10;
const SPRITE_ROWS = 10;
const SPRITE_TILE_W = 160;
const SPRITE_TILE_H = 90;

interface VideoPlayerProps {
  src?: string;
  poster?: string; //影片還沒播放前顯示的封面圖
  title?: string;
  // 進度條預覽用的 sprite sheet 首圖（結尾 _000000001.jpg）；有值才顯示拖曳縮圖
  spriteUrl?: string;
  // 標題連結：有值時，上方標題可點擊進入該影片詳情頁（僅 titlePosition="top" 生效）
  titleHref?: string;
  width?: number | string;
  height?: number | string;
  allowFullscreen?: boolean; // 是否顯示全螢幕鍵（首頁、短影音不需要）
  // 標題疊放位置：預設 "bottom"（暫停時才顯示於底部）；
  // "top" 則固定疊在影片上方且播放中也持續顯示（控制軸仍在底部）
  titlePosition?: "top" | "bottom";
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
  spriteUrl,
  titleHref,
  width = "100%",
  height = "auto",
  allowFullscreen = false,
  titlePosition = "bottom",
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true); // 是否正在播放（預設 true → 自動播放）
  const [currentTime, setCurrentTime] = useState(0); // 目前播放秒數
  const [duration, setDuration] = useState(0); // 影片總長度（秒）
  const [muted, setMuted] = useState(true); // 是否靜音（預設 true → 自動播放才會成功）
  const [volume, setVolume] = useState(0.8); // 音量 0~1
  const [hasStarted, setHasStarted] = useState(false); // 是否已真正開始播放（light 封面點擊前為 false）
  const mediaRef = useRef<HTMLVideoElement | null>(null); // 底層 <video> 元素，用來拖曳跳轉
  const wrapperRef = useRef<HTMLDivElement | null>(null); // 播放器外框，全螢幕的目標元素
  // 非原生 HLS 瀏覽器（Chrome/Firefox/Android）用的 hls.js 實例，切換來源／卸載時要銷毀
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  // 已經掛到 <video> 上的來源。用來擋掉「同一個 src 重複指派」——
  // React Strict Mode（next dev 預設開啟）會把 effect 跑兩次（掛載 → 清理 → 再掛載），
  // 而下方 cleanup 只銷毀 hls.js 實例、無法還原原生的 video.src，
  // 於是 video.src 會被連續設兩次（實測相隔 1ms），第一次載入被中止並重新載入，畫面閃一下。
  // ref 在 Strict Mode 的重掛載之間會保留，第二次就會跳過重設；真正卸載時 ref 自然消失。
  const attachedSrcRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false); // 是否處於全螢幕
  const isMobile = useIsMobile(); // 手機版：volume 屬性在 iOS 唯讀，音量滑桿無效，只留靜音鍵
  // 播放一段時間後自動隱藏標題與控制列（AUTO_HIDE_MS）；點擊播放器再次顯示
  const [controlsHidden, setControlsHidden] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 拖曳／hover 進度條時的預覽：time = 游標對應秒數；left = 預覽框在進度條上的水平位置(px)
  const [seekPreview, setSeekPreview] = useState<{
    time: number;
    left: number;
  } | null>(null);

  const isSeekable = Number.isFinite(duration) && duration > 0; // 直播 duration 是 Infinity，不顯示進度條
  // 封面（light）尚未點擊播放前，react-player 會顯示自己的播放鍵；此時隱藏自製控制鍵，避免兩顆按鈕重疊
  const previewActive = Boolean(poster) && !hasStarted;
  // 控制軸顯示時機：
  // - bottom 標題（首頁／詳情）：僅播放中顯示，暫停時讓位給底部標題（維持原行為）
  // - top 標題（節目頁）：底部沒有標題，播放一開始就常駐控制軸，
  //   避免緩衝／播完／自動播放中斷等使 isPlaying 短暫變 false 時整條控制軸消失
  const showControlBar =
    !previewActive && (isPlaying || (titlePosition === "top" && hasStarted));

  // 控制項隱藏時附加的樣式（透明 + 不可點）；含前置空白方便字串串接
  const hideCls = controlsHidden ? ` ${styles.hidden}` : "";

  // 播放時：AUTO_HIDE_MS 後自動隱藏；暫停 / 尚未開始播放：清除計時並保持顯示
  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying && hasStarted) {
      hideTimerRef.current = setTimeout(
        () => setControlsHidden(true),
        AUTO_HIDE_MS,
      );
    } else {
      setControlsHidden(false);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, hasStarted]);

  useEffect(() => {
    const video = mediaRef.current;
    if (!video || !src || previewActive) return;
    let cancelled = false;

    const source = src;

    // iOS 靜音自動播放的前提：play() 前 muted/playsInline 必須已是 true
    video.muted = muted;
    video.playsInline = true;

    const tryAutoplay = () => {
      if (cancelled) return;
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // 自動播放被擋 → 顯示可點的播放鍵讓使用者手動點
          if (!cancelled) setIsPlaying(false);
        });
      }
    };

    // 把來源直接掛到 <video>（一般 mp4 / 原生支援 HLS 的瀏覽器）。
    // 同一個 src 只掛一次：重複指派 video.src 會中止前一次載入並重新載入，畫面閃一下。
    // 見 attachedSrcRef 的說明（Strict Mode 會讓這個 effect 跑兩次）。
    const attachNativeSrc = () => {
      if (attachedSrcRef.current !== source) {
        video.src = source;
        attachedSrcRef.current = source;
      }
      tryAutoplay();
    };

    if (!isHlsSource(source) || canPlayNativeHls()) {
      attachNativeSrc();
    } else {
      // 非原生 HLS：動態載入 hls.js 接上（此路徑不會在 iOS 執行）
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(source);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, tryAutoplay);
          } else {
            // 極少數：既不原生支援也不支援 hls.js，仍試著直接餵 src
            attachNativeSrc();
          }
        })
        .catch(() => {
          if (!cancelled) setIsPlaying(false);
        });
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // muted 只作為 play 前的初始值，不需要因為之後切靜音而重掛來源
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, previewActive]);

  // isPlaying 變動時同步底層 <video>（使用者按播放/暫停鍵）
  useEffect(() => {
    const video = mediaRef.current;
    if (!video) return;
    if (isPlaying) {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => setIsPlaying(false));
      }
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // muted / volume 變動時同步底層 <video>
  useEffect(() => {
    if (mediaRef.current) mediaRef.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    if (mediaRef.current) mediaRef.current.volume = volume;
  }, [volume]);

  // 點擊 / 觸控播放器:顯示控制項;播放中則重新計時再自動隱藏
  const revealControls = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsHidden(false);
    if (isPlaying && hasStarted) {
      hideTimerRef.current = setTimeout(
        () => setControlsHidden(true),
        AUTO_HIDE_MS,
      );
    }
  };

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

  // 只採信「有限且大於 0」的總長度。HLS（尤其短影音來源）在中繼資料尚未
  // 解析完成前會先回報 Infinity/NaN，若照單全收會讓 isSeekable 卡在 false、
  // 進度條永遠不出現。多個事件（loadedmetadata／timeupdate／durationchange）
  // 都呼叫這裡補抓，任一先拿到有效值即可。
  function syncDuration(next: number) {
    if (Number.isFinite(next) && next > 0) {
      setDuration((prev) => (prev === next ? prev : next));
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

  // 依秒數換算出該格 sprite 的背景圖與位置（回傳可直接套用的 style）
  function spriteTileStyle(time: number): React.CSSProperties | undefined {
    if (!spriteUrl) return undefined;
    const perSheet = SPRITE_COLS * SPRITE_ROWS; // 每張 100 格
    const index = Math.floor(time / SPRITE_INTERVAL); // 第幾格（從 0 起算）
    const sheet = Math.floor(index / perSheet) + 1; // 第幾張（1 起算）
    const pos = index % perSheet; // 該張內的格子序號
    const col = pos % SPRITE_COLS;
    const row = Math.floor(pos / SPRITE_COLS);
    // 把首圖網址的 _000000001 換成實際張號（保留其餘路徑與副檔名）
    const sheetUrl = spriteUrl.replace(
      /_\d+(\.\w+)$/,
      `_${String(sheet).padStart(9, "0")}$1`,
    );
    return {
      backgroundImage: `url("${sheetUrl}")`,
      backgroundPosition: `-${col * SPRITE_TILE_W}px -${row * SPRITE_TILE_H}px`,
      backgroundSize: `${SPRITE_COLS * SPRITE_TILE_W}px ${SPRITE_ROWS * SPRITE_TILE_H}px`,
    };
  }

  // 游標在進度條上移動 → 換算對應秒數與水平位置，更新預覽（無 sprite 或直播則不顯示）
  function updateSeekPreview(clientX: number, el: HTMLElement) {
    if (!spriteUrl || !isSeekable) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    // 預覽框寬 160px：夾在進度條範圍內，避免超出被播放器 overflow 裁掉
    const half = SPRITE_TILE_W / 2;
    const left = Math.min(
      rect.width - half,
      Math.max(half, ratio * rect.width),
    );
    setSeekPreview({ time: ratio * duration, left });
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
      onClick={revealControls}
      // 桌機：滑鼠移入 / 移動就顯示控制列（手機無 hover，沿用點擊）
      onMouseEnter={isMobile ? undefined : revealControls}
      onMouseMove={isMobile ? undefined : revealControls}
    >
      {/* 原生 <video>：來源掛載與自動播放由上方 useEffect 處理（iOS 原生 HLS /
          其他瀏覽器 hls.js），不再經 react-player，避免其 hls lazy chunk 在 iOS
          首次載入卡住導致 <video> 建不出來的黑畫面問題。 */}
      <video
        ref={mediaRef}
        className={styles.video}
        muted={muted}
        playsInline
        autoPlay
        // controls 關閉，改用下方自製播放鍵
        style={{ width: "100%", height: "100%", display: "block" }}
        onPlay={() => {
          setIsPlaying(true); // 開始播放 → 隱藏標題
          setHasStarted(true); // 標記已開始，之後才顯示自製控制鍵
        }}
        onPause={() => setIsPlaying(false)} // 暫停 → 顯示標題
        onVolumeChange={(e) => {
          // 把裝置實際的 muted/volume 同步回 state（例如手機硬體音量鍵），讓受控值跟著裝置走
          const el = e.currentTarget;
          setMuted(el.muted);
          setVolume(el.volume);
        }}
        onLoadedMetadata={(e) => syncDuration(e.currentTarget.duration)} // 中繼資料就緒時先抓一次總長度
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime); // 更新進度
          // 短影音等來源的 HLS：durationchange 常先報 Infinity 再不補發，
          // 導致進度條一直不出現。播放中持續補抓 video.duration 當保險。
          syncDuration(e.currentTarget.duration);
        }}
        onDurationChange={(e) => syncDuration(e.currentTarget.duration)} // 取得總長度（僅採信有限值）
      />

      {/* 自製播放/暫停鍵，置中，避開底部標題；封面播放鍵還在時先不顯示，避免重疊 */}
      {!previewActive ? (
        <button
          type="button"
          className={`${styles.playToggle} ${
            isPlaying ? styles.playing : styles.paused
          }${hideCls}`}
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

      {/* 底部控制列：bottom 標題僅播放中顯示；top 標題（節目頁）播放後常駐 */}
      {showControlBar ? (
        <div className={`${styles.progressBar}${hideCls}`}>
          {/* 進度條：只有非直播（有總長度）才顯示 */}
          {isSeekable ? (
            <>
              <span className={styles.time}>{formatTime(currentTime)}</span>
              <div
                className={styles.seekWrap}
                onMouseMove={(e) =>
                  updateSeekPreview(e.clientX, e.currentTarget)
                }
                onMouseLeave={() => setSeekPreview(null)}
                onTouchMove={(e) =>
                  updateSeekPreview(e.touches[0].clientX, e.currentTarget)
                }
                onTouchEnd={() => setSeekPreview(null)}
              >
                {/* sprite 縮圖預覽：有 spriteUrl 且正在 hover／拖曳時才出現 */}
                {spriteUrl && seekPreview ? (
                  <div
                    className={styles.seekPreview}
                    style={{ left: seekPreview.left }}
                  >
                    <div
                      className={styles.seekPreviewImg}
                      style={spriteTileStyle(seekPreview.time)}
                    />
                    <span className={styles.seekPreviewTime}>
                      {formatTime(seekPreview.time)}
                    </span>
                  </div>
                ) : null}
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
              </div>
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

      {/* 暫停／停止狀態：控制列已隱藏時，獨立把全螢幕鍵放右下角，保持可用
          （控制列常駐的 top 標題模式不需要，避免出現兩顆全螢幕鍵） */}
      {!previewActive && !showControlBar && allowFullscreen ? (
        <div className={styles.fullscreenStandalone}>{fullscreenButton}</div>
      ) : null}

      {/* 標題疊放於上方：播放中也持續顯示（控制軸仍在底部） */}
      {title && titlePosition === "top" ? (
        <>
          <span
            className={`${styles.gradientTop}${hideCls}`}
            aria-hidden="true"
          />
          {titleHref ? (
            // 標題本身就是連結：整塊定位於頂端，點選進入該影片詳情頁
            <Link
              href={titleHref}
              // titleHref 指向影片詳情頁（ISR）；prefetch 會在伺服器多渲染一次，關掉。
              prefetch={false}
              className={`${styles.mediaTitleTop} ${styles.mediaTitleLink}${hideCls}`}
            >
              {title}
            </Link>
          ) : (
            <span className={`${styles.mediaTitleTop}${hideCls}`}>{title}</span>
          )}
        </>
      ) : null}

      {/* 標題疊放於底部：僅暫停時顯示（首頁 / 詳情頁預設行為） */}
      {title && titlePosition === "bottom" && !isPlaying ? (
        <>
          <span className={styles.gradient} aria-hidden="true" />
          <span className={styles.mediaTitle}>{title}</span>
        </>
      ) : null}
    </div>
  );
}
