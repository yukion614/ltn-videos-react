"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import dynamic from "next/dynamic";
import styles from "./page.module.scss";
import type { ShortsApiItem, ShortsApiResponse } from "../_interfaces/shorts";
import { watchUrlToSlug } from "../_lib/videoDetail";

// 網址與比對統一用 slug（/video/{slug}）；沒有 slug 時退回數字 id
function itemSlug(item: ShortsApiItem): string {
  return watchUrlToSlug(item.watchUrl) ?? String(item.id);
}

// react-player v3：以 src 指定來源（v2 的 url 已停用）
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => <div className={styles.playerLoading}>載入中</div>,
});

const basePath = "https://video.ltn.com.tw/brand/api";

// 上游只對 *.ltn.com.tw 開 CORS：正式環境直接用原始網址；
// 本機 dev（localhost）才走 next.config.ts 的同源代理 /hls/*
function toProxiedHls(url: string) {
  if (process.env.NODE_ENV === "development") {
    return url.replace("https://video.ltn.com.tw/media/", "/hls/");
  }
  return url;
}

async function fetchShorts(
  moreId: number | null = null,
): Promise<ShortsApiResponse> {
  const endpoint = moreId ? `/shorts/${moreId}` : "/shorts";
  const res = await fetch(`${basePath}${endpoint}`);
  return res.json();
}

// 依 id 去重後把新一批接到既有清單後面。
// 上游分頁（/shorts/{moreId}）可能回傳與前面重疊、或同一批內重複的短影音，
// 不去重會讓 key={short.id} 撞 key，導致 React 警告與畫面重複。
function mergeUniqueById(
  prev: ShortsApiItem[],
  incoming: ShortsApiItem[],
): ShortsApiItem[] {
  const seen = new Set(prev.map((s) => s.id));
  const fresh: ShortsApiItem[] = [];
  for (const s of incoming) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    fresh.push(s);
  }
  return fresh.length > 0 ? [...prev, ...fresh] : prev;
}

function buildShareUrls(url: string) {
  const u = encodeURIComponent(url);
  return {
    line: `https://social-plugins.line.me/lineit/share?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}`,
  };
}

type ShareUrls = ReturnType<typeof buildShareUrls>;

// 三顆分享鍵：桌機放在面板內，手機浮在影片右側（樣式靠外層 btnClass 切換）
function ShareLinks({ urls, btnClass }: { urls: ShareUrls; btnClass: string }) {
  return (
    <>
      <a
        className={`${btnClass} ${styles.line}`}
        href={urls.line}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="分享到 LINE"
      >
        <img
          src="/line.jpg"
          height={35}
          width={35}
          alt="分享到line"
          style={{ borderRadius: "50%" }}
        />
      </a>
      <a
        className={`${btnClass} ${styles.facebook}`}
        href={urls.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="分享到 Facebook"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"
            fill="currentColor"
          />
        </svg>
      </a>
      <a
        className={`${btnClass} ${styles.x}`}
        href={urls.x}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="分享到 X"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M17.5 3h3l-6.6 7.5L21.7 21h-5.9l-4.3-5.6L6.5 21H3.5l7-8L2.6 3h6l3.9 5.1L17.5 3zm-1 16h1.6L8 4.6H6.3L16.5 19z"
            fill="currentColor"
          />
        </svg>
      </a>
    </>
  );
}

export default function ShortsFeed({ initialId }: { initialId?: string }) {
  const [items, setItems] = useState<ShortsApiItem[]>([]);
  const [moreId, setMoreId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [played, setPlayed] = useState(0); // 目前這則的播放進度 0~1

  // 影片元素與進度條：用來讀取播放時間、換算拖曳位置後跳轉
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const seekingRef = useRef(false);

  // 完全 SPA：/shorts/ 這頁會被伺服器拿來服務 /shorts/{id}（見 serve-static.mjs、
  // nginx.conf 的 fallback）。此時沒有 props initialId，改從網址 /shorts/{slug} 解析目標。
  // 只在掛載時取一次（之後捲動會用 replaceState 改寫網址，不能每次 render 重算，
  // 否則會誤觸下方「首批載入」effect 重抓資料）。
  const [startId] = useState<string | undefined>(
    () =>
      initialId ??
      (typeof window !== "undefined"
        ? window.location.pathname.match(/\/shorts\/([^/]+)/)?.[1]
        : undefined),
  );

  // 網址帶入的目標影片 slug：載入後要跳到這一則；解析完成後設回 null
  const [targetSlug, setTargetSlug] = useState<string | null>(
    () => startId ?? null,
  );

  const stageRef = useRef<HTMLElement | null>(null);
  const lockRef = useRef(false);
  const itemsRef = useRef<ShortsApiItem[]>(items);
  const hasMoreRef = useRef(hasMore);
  const expandedRef = useRef(expanded);
  const touchStartY = useRef<number | null>(null);

  // 讓事件處理器讀到最新資料，避免閉包讀到舊值
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // 首批載入
  useEffect(() => {
    fetchShorts()
      .then((data) => {
        setItems(mergeUniqueById([], data.items));
        setMoreId(data.moreId);
        setHasMore(data.hasMore);
      })
      .finally(() => {
        // 沒有要跳轉的目標就直接顯示；有目標時等解析到該則再關閉載入動畫
        if (startId == null) setLoading(false);
      });
  }, [startId]);

  const loadMore = useCallback(async () => {
    if (!moreId || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchShorts(moreId);
      setItems((prev) => mergeUniqueById(prev, data.items));
      setMoreId(data.moreId);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [moreId, loadingMore]);

  // 解析網址帶入的 slug：在已載入清單裡找；找不到就往後再抓一批，直到找到或沒有更多
  useEffect(() => {
    if (targetSlug == null) return;
    if (items.length === 0) return; // 等首批回來

    const idx = items.findIndex((s) => itemSlug(s) === targetSlug);
    if (idx >= 0) {
      setIndex(idx);
      setTargetSlug(null);
      return;
    }

    if (hasMore && moreId && !loadingMore) {
      loadMore(); // 還沒載到，繼續往後找
    } else if (!hasMore) {
      setTargetSlug(null); // 整份都沒有這個 slug，退回從頭播
    }
  }, [targetSlug, items, hasMore, moreId, loadingMore, loadMore]);

  // 目標解析完成（或本來就沒有目標）後關閉載入動畫
  useEffect(() => {
    if (targetSlug == null) setLoading(false);
  }, [targetSlug]);

  // 切換到別則時把進度條歸零
  useEffect(() => {
    setPlayed(0);
  }, [index]);

  // 播放中持續更新進度條（拖曳中先不更新，避免被播放進度蓋回去）
  const handleTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => {
    if (seekingRef.current) return;
    const v = e.currentTarget;
    if (v.duration > 0) setPlayed(v.currentTime / v.duration);
  };

  // 依滑鼠／手指在進度條上的位置換算成時間並跳轉
  const seekToClientX = (clientX: number) => {
    const bar = seekBarRef.current;
    const video = playerRef.current;
    if (!bar || !video || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setPlayed(ratio);
    video.currentTime = ratio * video.duration;
  };

  const onSeekDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // 不要觸發影片的點擊暫停
    seekingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onSeekMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (seekingRef.current) seekToClientX(e.clientX);
  };
  const onSeekUp = () => {
    seekingRef.current = false;
  };

  // 目前這則的 slug 同步到網址（用 replaceState，不重新抓資料、不灌爆上一頁紀錄）
  useEffect(() => {
    if (targetSlug != null) return; // 還在跳轉中先不要動網址
    const cur = items[index];
    if (!cur) return;
    window.history.replaceState(null, "", `/shorts/${itemSlug(cur)}`);
  }, [index, items, targetSlug]);

  // 接近清單末端時先預抓下一批，讓滑動無縫
  useEffect(() => {
    if (hasMore && moreId && !loadingMore && index >= items.length - 3) {
      loadMore();
    }
  }, [index, items.length, hasMore, moreId, loadingMore, loadMore]);

  // 切換上一則／下一則（無限循環）
  const navigate = useCallback((dir: 1 | -1) => {
    if (lockRef.current) return;
    const len = itemsRef.current.length;
    if (len === 0) return;
    lockRef.current = true;

    setExpanded(false);
    setPlaying(true);
    setIndex((i) => {
      let n = i + dir;
      // 已抵末端：還有更多就停在原地等預抓補上，否則循環回開頭
      if (n >= len) n = hasMoreRef.current ? i : 0;
      if (n < 0) n = len - 1;
      return n;
    });

    setTimeout(() => {
      lockRef.current = false;
    }, 480);
  }, []);

  // 滾輪／觸控／鍵盤切換（用原生監聽以便 preventDefault 擋住整頁捲動）
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // 事件是否落在右側面板（面板為獨立捲動區，不攔截、不切換短影音）
    const inPanel = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("[data-panel-scroll]");

    const onWheel = (e: WheelEvent) => {
      if (inPanel(e.target)) return; // 交給面板原生捲動
      e.preventDefault();
      if (Math.abs(e.deltaY) < 12) return;
      navigate(e.deltaY > 0 ? 1 : -1);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = inPanel(e.target)
        ? null
        : (e.touches[0]?.clientY ?? null);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (inPanel(e.target)) return; // 讓面板自己捲動
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const dy = touchStartY.current - (e.changedTouches[0]?.clientY ?? 0);
      if (Math.abs(dy) > 40) navigate(dy > 0 ? 1 : -1);
      touchStartY.current = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") navigate(1);
      else if (e.key === "ArrowUp") navigate(-1);
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("touchstart", onTouchStart, { passive: false });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKey);

    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [navigate]);

  const current = items[index];

  return (
    <main className={styles.stage} ref={stageRef}>
      {loading ? (
        <p className={styles.status}>載入中…</p>
      ) : !current ? (
        <p className={styles.status}>目前沒有短影音</p>
      ) : (
        // 垂直軌道：所有短影音排成一列，靠 translateY + transition 平滑位移
        <div
          className={styles.track}
          style={{ transform: `translateY(calc(var(--slide-h) * ${-index}))` }}
        >
          {items.map((short, i) => {
            const isActive = i === index;
            // 只渲染目前及相鄰兩則的細節，其餘僅佔位避免一次掛太多
            const isNear = Math.abs(i - index) <= 1;
            const shareUrls = buildShareUrls(short.watchUrl);

            return (
              <section className={styles.slide} key={short.id}>
                <div
                  className={`${styles.viewer} ${
                    isActive && expanded ? styles.viewerOpen : ""
                  }`}
                >
                  <div className={styles.videoCol}>
                    <div
                      className={styles.video}
                      onClick={
                        isActive ? () => setPlaying((p) => !p) : undefined
                      }
                    >
                      {/* 封面墊底：影片畫面出現前不黑屏，也是相鄰則滑入時看到的畫面 */}
                      <div
                        className={styles.poster}
                        style={{ backgroundImage: `url(${short.posterUrl})` }}
                      />

                      {/* 只有目前這則掛載播放器 */}
                      {isActive ? (
                        <ReactPlayer
                          ref={playerRef}
                          className={styles.player}
                          src={toProxiedHls(short.hlsUrl)}
                          playing={playing}
                          muted={muted}
                          loop
                          playsInline
                          autoPlay
                          controls={false}
                          width="100%"
                          height="100%"
                          onTimeUpdate={handleTimeUpdate}
                        />
                      ) : null}

                      {isActive ? (
                        <>
                          {/* 靜音切換 */}
                          <button
                            type="button"
                            className={styles.muteBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMuted((m) => !m);
                            }}
                            aria-label={muted ? "開啟聲音" : "靜音"}
                          >
                            {muted ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M4 9v6h4l5 5V4L8 9H4zm12.5 3 2.5 2.5-1 1L15.5 13 13 15.5l-1-1 2.5-2.5L12 9.5l1-1 2.5 2.5L18 8.5l1 1L16.5 12z"
                                  fill="currentColor"
                                />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M4 9v6h4l5 5V4L8 9H4zm12 3a4 4 0 0 0-2-3.5v7A4 4 0 0 0 16 12z"
                                  fill="currentColor"
                                />
                              </svg>
                            )}
                          </button>

                          {/* 暫停時顯示大播放鍵 */}
                          {!playing ? (
                            <span
                              className={styles.playOverlay}
                              aria-hidden="true"
                            >
                              <svg viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" fill="currentColor" />
                              </svg>
                            </span>
                          ) : null}

                          {/* 提示 */}
                          <div className={styles.hint}>↑ 向上滑動看下一則</div>

                          {/* 進度時間軸：點一下或拖曳可跳轉 */}
                          <div
                            className={styles.seekBar}
                            ref={seekBarRef}
                            data-panel-scroll
                            onPointerDown={onSeekDown}
                            onPointerMove={onSeekMove}
                            onPointerUp={onSeekUp}
                            onPointerCancel={onSeekUp}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              className={styles.seekFill}
                              style={{ width: `${played * 100}%` }}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* 資訊面板：當前這則永遠掛載，靠 open 類別做寬度／淡入過場 */}
                  {isActive ? (
                    <aside
                      className={`${styles.panel} ${
                        expanded ? styles.panelOpen : ""
                      }`}
                      aria-hidden={!expanded}
                    >
                      <div className={styles.panelInner} data-panel-scroll>
                        <header className={styles.panelHeader}>
                          <h2 className={styles.panelTitle}>{short.title}</h2>
                          <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={() => setExpanded(false)}
                            aria-label="關閉"
                            tabIndex={expanded ? 0 : -1}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M6 6l12 12M18 6L6 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </header>

                        <div
                          className={styles.panelBody}
                          dangerouslySetInnerHTML={{
                            __html: short.descriptionHtml,
                          }}
                        />

                        <div className={styles.share}>
                          <ShareLinks
                            urls={shareUrls}
                            btnClass={styles.shareBtn}
                          />
                        </div>
                      </div>
                    </aside>
                  ) : null}
                </div>

                {/* 浮動分享列：手機版顯示在影片右側（桌機隱藏，分享在面板內） */}
                {isActive ? (
                  <div className={styles.shareRail}>
                    <ShareLinks urls={shareUrls} btnClass={styles.railBtn} />
                  </div>
                ) : null}

                {/* 左下資訊塢（收合時顯示，隨影片一起滑入；展開時淡出） */}
                {isNear ? (
                  <div
                    className={`${styles.infoDock} ${
                      isActive && expanded ? styles.infoDockHidden : ""
                    }`}
                  >
                    <h1 className={styles.dockTitle}>{short.title}</h1>
                    <p className={styles.dockSummary}>{short.summary}</p>
                    {/* 描述 */}
                    {/* {short.descriptionHtml && (
                      <div
                        className={styles.mobilePanelBody}
                        dangerouslySetInnerHTML={{
                          __html: short.descriptionHtml,
                        }}
                      />
                    )} */}

                    {isActive ? (
                      <button
                        type="button"
                        className={styles.moreBtn}
                        onClick={() => setExpanded(true)}
                        tabIndex={expanded ? -1 : 0}
                      >
                        更多內容
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
