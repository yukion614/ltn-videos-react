"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./page.module.scss";
import NotFoundPanel from "@/app/_components/NotFoundPanel/NotFoundPanel";
import type { ShortsApiItem, ShortsApiResponse } from "../_interfaces/shorts";
import { watchUrlToSlug } from "../_lib/videoDetail";
import { useDocumentMeta } from "../_lib/useDocumentMeta";
import { API_BASE } from "../_lib/api";

// 網址與比對統一用 slug（/video/{slug}）；沒有 slug 時退回數字 id
function itemSlug(item: ShortsApiItem): string {
  return watchUrlToSlug(item.watchUrl) ?? String(item.id);
}

// 這個網址是不是 HLS（.m3u8）串流
function isHlsSource(url?: string) {
  return !!url && /\.m3u8($|\?)/i.test(url);
}

// 瀏覽器是否原生支援 HLS（iOS / macOS Safari 皆為 true）。
// 原生支援時直接把 .m3u8 餵給 <video> 即可，不需要 hls.js。
function canPlayNativeHls() {
  if (typeof document === "undefined") return false;
  const v = document.createElement("video");
  return (
    v.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    v.canPlayType("application/x-mpegURL") !== ""
  );
}

// 從 HLS 主清單挑出 BANDWIDTH 最小的那條子清單。
// 預熱只是為了「開頭能立刻播」，抓最低畫質即可：檔案最小、最省流量，
// 真正播放時 hls.js／原生播放器仍會依當下網速自行選擇畫質。
// 傳進來的若不是主清單（沒有 STREAM-INF）就回 null，由呼叫端當成媒體清單處理。
function pickLowestVariant(m3u8: string): string | null {
  const lines = m3u8.split("\n").map((l) => l.trim());
  let best: { bandwidth: number; uri: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXT-X-STREAM-INF:")) continue;
    // URI 固定寫在 STREAM-INF 標籤的下一行
    const uri = lines[i + 1];
    // 純防呆：規格保證下一行是 URI，正常不會走到這裡。
    // 但檔案若被截斷或格式有異，沒擋掉就會把下一個 #EXT 標籤當網址送去 fetch。
    if (!uri || uri.startsWith("#")) continue;
    const bandwidth = Number(lines[i].match(/BANDWIDTH=(\d+)/)?.[1] ?? 0);
    if (!best || bandwidth < best.bandwidth) best = { bandwidth, uri };
  }
  return best?.uri ?? null;
}

// 媒體清單裡的第一個分段檔（第一個非註解、非空白的行）
function firstSegment(m3u8: string): string | null {
  for (const raw of m3u8.split("\n")) {
    const line = raw.trim();
    if (line && !line.startsWith("#")) return line;
  }
  return null;
}

// 先把下兩支影片的「第一段」下載起來，加入遊覽器快取
async function warmUpHls(masterUrl: string): Promise<void> {
  const master = await (await fetch(masterUrl)).text();
  const variant = pickLowestVariant(master);
  // 有子清單就往下一層拿；沒有代表這份已經是片段清單，直接用它
  const playlistUrl = variant
    ? new URL(variant, masterUrl).toString()
    : masterUrl;
  const playlist = variant ? await (await fetch(playlistUrl)).text() : master;
  const segment = firstSegment(playlist);
  if (!segment) return;
  // 抓下來不做任何事，純粹是為了讓瀏覽器把它存進快取
  await fetch(new URL(segment, playlistUrl).toString());
}

const basePath = API_BASE;

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

// 優先用後端預組的分享連結（帶 UTM，行銷可追成效）；舊資料沒有 share 時
// 才退回用 watchUrl 自行拼。後端欄位名為 twitter，前端沿用 x。
function resolveShareUrls(item: ShortsApiItem): ShareUrls {
  if (item.share) {
    return {
      line: item.share.line,
      facebook: item.share.facebook,
      x: item.share.twitter,
    };
  }
  return buildShareUrls(item.watchUrl);
}

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

  // 進度條
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const seekingRef = useRef(false);

  // 整個短影音牆「共用同一個 <video>」，切換時只換它的 src、不重建元素。
  // 原本每滑一則就掛一個全新的 <video>，在 iOS 上等於丟失了「使用者手勢授權」——
  // 使用者開過聲音後，下一則因是全新元素、無手勢紀錄，帶聲 autoplay 被擋 → 被迫轉靜音，
  // 造成「聲音記不住、每則都變回靜音」。改成同一個元素持續存在，iOS 才會延續授權、記住聲音。
  // 用 document.createElement 手動建立（而非 React render），才能在切換 slide 時用 appendChild
  // 把「同一個」DOM 節點搬到目前這則的掛載點，不被 React 的重新掛載銷毀。
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  if (videoElRef.current === null && typeof document !== "undefined") {
    const v = document.createElement("video");
    v.className = styles.player;
    v.loop = true;
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.style.opacity = "0"; // 換片載入期間先透明，露出封面，避免閃到上一則的畫面
    videoElRef.current = v;
  }
  // 非原生 HLS 瀏覽器（Chrome/Firefox/Android）用的 hls.js 實例，換來源／卸載時要銷毀
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  // 已經預熱過的來源，避免同一支重複抓
  const warmedRef = useRef<Set<string>>(new Set());

  // 目前這則的掛載點：新的 active slide 的掛載 div 一出現，就把共用 <video> 搬進去。
  // 只在 node 非 null 時採用，避免舊 slide 卸下 ref（傳 null）時把記錄清掉；
  // 各 slide 的掛載 div 都常駐（不隨切換卸載），所以搬移時 <video> 不會被連帶移除、播放不中斷。
  const attachMount = useCallback((node: HTMLDivElement | null) => {
    const v = videoElRef.current;
    if (!node || !v) return;
    if (v.parentElement !== node) node.appendChild(v);
  }, []);

  // /shorts/{id} 有自己的 server 路由會帶 initialId 進來；直接進 /shorts/ 時沒有，
  // 就從網址 /shorts/{slug} 自行解析（保險，也讓元件能獨立運作）。
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

  // 網址 /shorts/{id} 指定的那則在整份清單裡都找不到 → 視同無效路由，顯示 404
  // （對齊其他頁「抓不到內容就顯示 NotFoundPanel」的行為）
  const [notFound, setNotFound] = useState(false);

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
      // 整份清單都翻完仍沒有這個 slug：網址指定了無效的單則 → 顯示 404
      setNotFound(true);
      setTargetSlug(null);
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

  const activeSrc = items[index]?.hlsUrl;

  // 共用 <video> 的常駐監聽（只掛一次）：進度條更新、載入好後淡入顯示。
  useEffect(() => {
    const v = videoElRef.current;
    if (!v) return;
    // 播放中持續更新進度條（拖曳中先不更新，避免被播放進度蓋回去）
    const onTimeUpdate = () => {
      if (seekingRef.current) return;
      if (v.duration > 0) setPlayed(v.currentTime / v.duration);
    };
    // 新來源真的有畫面了才顯示，換片過場期間維持透明、露出封面
    const onReady = () => {
      v.style.opacity = "1";
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("playing", onReady);
    v.addEventListener("loadeddata", onReady);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("playing", onReady);
      v.removeEventListener("loadeddata", onReady);
    };
  }, []);

  // 換來源並起播：只有 active 那則的 src 變動時重新掛載來源到共用 <video>。
  useEffect(() => {
    const video = videoElRef.current;
    if (!video || !activeSrc) return;
    let cancelled = false;

    video.style.opacity = "0"; // 先藏起來，等新來源就緒（loadeddata/playing）再淡入
    // iOS 靜音自動播放的前提：play() 前 muted/playsInline 必須已是 true
    video.muted = muted;
    video.playsInline = true;

    // 起播：帶聲 autoplay 被 iOS 擋掉時，退回靜音再播一次，確保換到下一則一定會動。
    const tryPlay = () => {
      if (cancelled || !playing) return;
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          if (cancelled) return;
          if (!video.muted) {
            video.muted = true;
            setMuted(true); // 同步回按鈕圖示，維持狀態一致
            const retry = video.play();
            if (retry && typeof retry.catch === "function")
              retry.catch(() => {});
          }
        });
      }
    };

    // iOS 原生 HLS：剛指派 src 時資料還沒就緒，立即 play() 可能被中止；
    // 再等 canplay 補播一次，確保換片後的冷啟動也會自動起播。
    const onCanPlay = () => tryPlay();

    // 先銷毀上一則殘留的 hls.js 實例，再掛新來源
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!isHlsSource(activeSrc) || canPlayNativeHls()) {
      video.src = activeSrc;
      video.addEventListener("canplay", onCanPlay);
      tryPlay();
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(activeSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
          } else {
            // 極少數：既不原生支援也不支援 hls.js，仍試著直接餵 src
            video.src = activeSrc;
            tryPlay();
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", onCanPlay);
    };
    // muted/playing 只作為起播的初始值，變動由下方各自的 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc]);

  // 預抓接下來兩則的影片開頭。
  // 滑動有 480ms 的節流鎖。
  // 等目前這則能播了才開始：預熱跟播放共用同一條頻寬，搶在前面反而讓眼前這則更卡。
  useEffect(() => {
    const video = videoElRef.current;
    if (!video) return;

    // 非 HLS 的來源不預熱：那會是單一影片檔，用 fetch 抓等於整支下載一遍
    const targets = [items[index + 1], items[index + 2]]
      .map((s) => s?.hlsUrl)
      .filter((u): u is string => !!u && isHlsSource(u));
    if (targets.length === 0) return;

    let cancelled = false;

    const start = async () => {
      // 一支抓完再抓下一支（下一則優先），兩支同時抓會互相拖慢
      for (const url of targets) {
        if (cancelled) return;
        if (warmedRef.current.has(url)) continue;
        warmedRef.current.add(url);
        try {
          await warmUpHls(url);
        } catch {
          // 預熱失敗完全不影響播放（頂多滑過去時照舊現載）；
          // 把記錄清掉，讓之後切換時還有機會再試一次
          warmedRef.current.delete(url);
        }
      }
    };

    // readyState >= 3（HAVE_FUTURE_DATA）表示目前這則已經有得播了
    if (video.readyState >= 3) {
      start();
      return () => {
        cancelled = true;
      };
    }

    // 還沒就緒就等 canplay；另外壓一個上限，避免這則載不出來時預熱永遠不啟動
    video.addEventListener("canplay", start, { once: true });
    const timer = setTimeout(start, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      video.removeEventListener("canplay", start);
    };
  }, [index, items]);

  // 元件卸載時銷毀 hls.js 實例（換片不銷毀由上方 effect 處理）
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // 播放／暫停（使用者點擊影片切換）
  useEffect(() => {
    const video = videoElRef.current;
    if (!video) return;
    if (playing) {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  // 靜音切換
  useEffect(() => {
    const video = videoElRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  // 依滑鼠／手指在進度條上的位置換算成時間並跳轉
  const seekToClientX = (clientX: number) => {
    const bar = seekBarRef.current;
    const video = videoElRef.current;
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

  // 目前這則短影音的 meta：隨捲動切換而動態更新（瀏覽器分頁標題、og/twitter 分享預覽）。
  // 靜態匯出沒有 server 端 generateMetadata，只能在瀏覽器把當前這則的資料補進 <head>；
  // 元件切換／卸載時 useDocumentMeta 會自動還原。必須放在下方 early return 之前，
  // 避免違反 hooks 呼叫順序。
  useDocumentMeta(
    current
      ? {
          title: `${current.title}｜自由影音`,
          description: current.summary || current.description,
          // canonical / og:url：用當前站台網域 + /shorts/{slug}，對齊網址列 replaceState 的 slug
          canonicalUrl:
            typeof window !== "undefined"
              ? `${window.location.origin}/shorts/${itemSlug(current)}`
              : undefined,
          imageUrl: current.posterUrl,
          ogType: "video.other",
        }
      : null,
  );

  // 網址指定了不存在的單則：整頁顯示 404（與其他外殼頁一致）
  if (notFound) {
    return (
      <main className={styles.stage} ref={stageRef}>
        <NotFoundPanel />
      </main>
    );
  }

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
            const shareUrls = resolveShareUrls(short);

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

                      {/* 共用 <video> 的掛載點：每則都常駐（切換時不卸載，避免搬移中把
                          播放中的 <video> 連帶移除），只有目前這則掛上 ref，把共用元素搬進來 */}
                      <div
                        className={styles.videoMount}
                        ref={isActive ? attachMount : undefined}
                      />

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
