import type { Metadata } from "next";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";
import type {
  VideoListItem,
  VideoListResponse,
} from "@/app/_interfaces/videoArticle";
import type {
  ProgramListResponse,
  PlaylistItemsResponse,
  PlaylistVideoItem,
} from "@/app/_interfaces/playlist";
import { API_BASE, LIST_REVALIDATE, VIDEO_REVALIDATE } from "./api";

const basePath = API_BASE;

/**
 * 取得「話題」第一支影片的 watchUrl。
 * 1. playlist-list/topic → 取第一個清單的 apiUrl
 * 2. 該 apiUrl(playlist-items) → 取第一支影片的 watchUrl
 * 失敗時回傳 null。
 */
export async function getTopicFirstWatchUrl(): Promise<string | null> {
  try {
    const listRes = await fetch(`${basePath}/playlist-list/topic`, {
      next: { revalidate: LIST_REVALIDATE },
    });
    if (!listRes.ok) return null;
    const listData = (await listRes.json()) as ProgramListResponse;
    const apiUrl = listData.items?.[0]?.apiUrl;
    if (!apiUrl) return null;

    const itemsRes = await fetch(apiUrl, {
      next: { revalidate: LIST_REVALIDATE },
    });
    if (!itemsRes.ok) return null;
    const itemsData = (await itemsRes.json()) as PlaylistItemsResponse;
    return itemsData.items?.[0]?.watchUrl ?? null;
  } catch {
    return null;
  }
}

export const fallbackVideo: BrandVideoResponse["video"] = {
  id: 0,
  title: "颱風山陀兒逼近！東部風強雨驟慎防災害",
  publishAt: "2026/06/17 12:00",
  publishedAtIso: "2026-06-17T12:00:00+08:00",
  description:
    "中央氣象署最新資料指出，颱風山陀兒持續朝台灣東部海域逐步逼近，東部、東南部地區須嚴防強風暴雨。",
  descriptionHtml:
    "<p>中央氣象署最新資料指出，颱風山陀兒持續朝台灣東部海域逐步逼近，預估今晚至明日清晨影響最劇，東部、東南部地區須嚴防強風暴雨。</p><p>請民眾避免前往山區及海邊活動，並隨時注意最新警報資訊。</p>",
  summary:
    "颱風山陀兒持續朝台灣東部海域逐步逼近，東部、東南部地區須嚴防強風暴雨。",
  orientation: "horizontal",
  canonicalUrl: "/brand/video/0",
  newsUrl: "",
  posterUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/maxresdefault.jpg",
  hlsUrl: "",
  spriteUrl: "",
};

/**
 * 從 watchUrl 取出影片詳情 API 需要的 slug。
 *
 * 後端的 watchUrl 形如 `/video/{slug}` 或 `/video/{slug}/{playlistKey}`，
 * 詳情端點 `/video/{key}` 的 key 是「第一段 slug」，不是清單裡的數字 id。
 * 用數字 id 去打 `/video/{id}` 會得到空陣列 []，導致 video 為 undefined。
 */
export function watchUrlToSlug(watchUrl?: string): string | null {
  if (!watchUrl) return null;
  // 取 /video/ 後的第一段；同時容忍開頭有無斜線、含網域的完整網址
  const match = watchUrl.match(/\/video\/([^/?#]+)/);
  return match ? match[1] : null;
}

// 播放清單分頁結果：影片列表 + 下一頁頁碼（null 代表沒有更多）
export interface PlaylistPage {
  items: PlaylistVideoItem[];
  nextPage: number | null;
}

/**
 * 取得某播放清單第 page 頁的影片列表與分頁資訊。
 * 影片詳細頁的「你還會想看」改用此來源（playlist-items/{key}/{page}），
 * 不再用詳情 API 的 related 欄位。可在 server 與 client 共用（純 fetch）。
 * 失敗時回傳空列表且 nextPage 為 null。
 */
export async function getPlaylistPage(
  key: string,
  page = 1,
): Promise<PlaylistPage> {
  if (!key) return { items: [], nextPage: null };

  try {
    // next.revalidate 只在 server 端生效；此函式也被 client 元件（RelatedVideos
    // 的分頁載入）呼叫，瀏覽器會忽略這個選項，無副作用。
    const res = await fetch(`${basePath}/playlist-items/${key}/${page}`, {
      next: { revalidate: LIST_REVALIDATE },
    });
    if (!res.ok) return { items: [], nextPage: null };
    const data = (await res.json()) as PlaylistItemsResponse;
    const items = data.items ?? [];
    const more = data.hasMore ?? items.length > 0;
    return { items, nextPage: more ? data.nextPage ?? page + 1 : null };
  } catch {
    return { items: [], nextPage: null };
  }
}

export async function getVideo(id: string) {
  try {
    const res = await fetch(`${basePath}/video/${id}`, {
      next: { revalidate: VIDEO_REVALIDATE },
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as BrandVideoResponse;
  } catch {
    return null;
  }
}

/**
 * 影片詳情頁的完整資料：影片本身 + 「你還會想看」的第一頁。
 *
 * programs / topic / latest 三個影片路由的取數邏輯完全相同，抽出來共用。
 * 「你還會想看」優先用所屬播放清單（playlist-items 可分頁）；沒有清單或清單抓不到
 * 內容時（如最新頁的單片，playlist 回空），退回詳情 API 的 related 欄位——
 * related 是固定一批、沒有分頁，故 nextPage 為 null。
 *
 * 找不到影片時回 null，由呼叫端決定 notFound()。
 */
export async function getVideoPageData(id: string) {
  const data = await getVideo(id);
  if (!data?.video) return null;

  const playlistKey = data.playlist?.key ?? "";
  const firstPage = playlistKey
    ? await getPlaylistPage(playlistKey)
    : { items: [], nextPage: null };

  let initialItems = firstPage.items.filter(
    (item) => item.id !== data.video.id,
  );
  let initialNextPage = firstPage.nextPage;

  if (initialItems.length === 0) {
    initialItems = (data.related ?? []).filter(
      (item) => item.id !== data.video.id,
    );
    initialNextPage = null;
  }

  return { data, initialItems, initialNextPage };
}

/**
 * 節目分類頁（/programs/[category]）的 server 端初始資料。
 *
 * 過去這頁是 client 元件，開啟後才在瀏覽器抓這些資料，爬蟲只看得到空殼。
 * 改 server 渲染後由這裡一次備齊，HTML 送出時就含影片清單。
 *
 * leadHls / leadSprite：列表 API 不含 hlsUrl / spriteUrl，第一則要當播放器用，
 * 需以其 watchUrl 的 slug 另打詳情補上。抓不到就回空字串，畫面退回顯示縮圖。
 */
export interface CategoryPageData {
  items: VideoListItem[];
  nextPage: number | null;
  leadHls: string;
  leadSprite: string;
}

export async function getCategoryPageData(
  category: string,
): Promise<CategoryPageData> {
  const empty: CategoryPageData = {
    items: [],
    nextPage: null,
    leadHls: "",
    leadSprite: "",
  };
  if (!category) return empty;

  let items: VideoListItem[] = [];
  let nextPage: number | null = null;

  try {
    const res = await fetch(`${basePath}/playlist-items/${category}/1`, {
      next: { revalidate: LIST_REVALIDATE },
    });
    if (!res.ok) return empty;

    const data = (await res.json()) as VideoListResponse;
    items = data.items ?? [];
    const hasMore = data.hasMore ?? items.length > 0;
    nextPage = hasMore ? (data.nextPage ?? 2) : null;
  } catch {
    return empty;
  }

  const leadSlug = items[0]
    ? watchUrlToSlug(items[0].watchUrl) ?? String(items[0].id)
    : "";
  if (!leadSlug) return { items, nextPage, leadHls: "", leadSprite: "" };

  const detail = await getVideo(leadSlug);
  return {
    items,
    nextPage,
    leadHls: toProxiedHls(detail?.video?.hlsUrl ?? "") ?? "",
    // sprite 用 CSS background 顯示、不受 CORS 限制，直接用原始網址
    leadSprite: detail?.video?.spriteUrl ?? "",
  };
}

const HLS_UPSTREAM = "https://video.ltn.com.tw/media/";

// 上游是否會對這個網域回應 Access-Control-Allow-Origin（CORS 白名單只含 ltn.com.tw）
function canReachUpstreamDirectly(hostname: string) {
  return hostname === "ltn.com.tw" || hostname.endsWith(".ltn.com.tw");
}

/**
 * 取得可播放的 HLS 網址。
 *
 * 上游 video.ltn.com.tw 只對 *.ltn.com.tw 網域開放 CORS，其餘網域一律走
 * next.config.ts 的同源代理 /hls/*。判斷依據是「目前頁面的網域」而非 NODE_ENV：
 * 本機 `next start` 是 production build 卻跑在 localhost，用 NODE_ENV 判斷會誤放行、
 * 播放器直連上游被 CORS 擋掉。
 *
 * 伺服器端沒有 origin 可判斷，回傳原始網址（正式站的情形）；瀏覽器端會在真正掛載
 * 來源前再轉一次（見 VideoPlayer），所以 server 先算好的網址在本機也會被修正。
 * 已是 /hls/* 的網址再轉一次不會變，重複套用是安全的。
 */
export function toProxiedHls(url?: string) {
  if (!url) {
    return undefined;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return canReachUpstreamDirectly(window.location.hostname)
    ? url
    : url.replace(HLS_UPSTREAM, "/hls/");
}

export interface Crumb {
  href?: string; // 省略時視為「目前頁面」，不可點擊
  label: string;
}

/**
 * 麵包屑取自 API 回傳的資料，不使用路由 params：
 * - 開頭固定補上「首頁」(/)
 * - 中間為 API 的 breadcrumb 欄位（如「主要 → 影音精選」）
 *   其 url 形如 /programs/{playlist key}，與本站 /programs/[category] 路由一致，直接沿用。
 * 不包含目前影片標題；最後一層若是目前頁面/分類，會省略 href 讓它不可點擊。
 */
export function buildVideoCrumbs(
  data: BrandVideoResponse | null,
  opts?: { isTopic?: boolean; isLatest?: boolean },
): Crumb[] {
  const crumbs: Crumb[] = [{ href: "/", label: "首頁" }];

  // 最新影片頁：只顯示「首頁 › 最新」，不帶 API 分類（/list 是扁平的最新清單）。
  if (opts?.isLatest) {
    crumbs.push({ href: "/latest", label: "最新" });
    return crumbs;
  }

  // topic 影片頁：保留「話題」入口，並顯示 API breadcrumb 的最後一層，
  // 但最後一層不帶 href，作為目前所在分類顯示。
  if (opts?.isTopic) {
    crumbs.push({ href: "/topic", label: "話題" });

    const breadcrumb = data?.breadcrumb ?? [];
    const lastCrumb = breadcrumb[breadcrumb.length - 1];
    const topicLabel = lastCrumb?.title || data?.playlist?.title;

    if (topicLabel && topicLabel !== "話題") {
      crumbs.push({ label: topicLabel });
    }

    return crumbs;
  }

  for (const item of data?.breadcrumb ?? []) {
    crumbs.push({ href: item.url, label: item.title });
  }

  return crumbs;
}

/**
 * 依據影片資料組出 SEO / OG / Twitter metadata。
 * 給各路由的 generateMetadata 共用。
 */
export function buildVideoMetadata(data: BrandVideoResponse | null): Metadata {
  const seo = data?.seo;
  const video = data?.video ?? fallbackVideo;

  const title = seo?.title || video.title || "影片詳細頁 | 自由影音";
  // 後端沒給描述就不輸出 description / og:description（回 undefined，Next 會整個省略標籤）。
  // 不塞佔位字串：最新（/list）的影片 seo.description 常是空字串，硬填會讓 FB 分享預覽
  // 顯示一句沒有意義的話；沒有標籤時 FB 會自行略過該行，比顯示假資訊好。
  const description = seo?.description || video.summary || undefined;
  const imageUrl = seo?.imageUrl || video.posterUrl;
  const canonicalUrl = seo?.canonicalUrl || video.canonicalUrl;

  return {
    title,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      type: "video.other",
      title,
      description,
      url: canonicalUrl || undefined,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
