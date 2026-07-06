import type { Metadata } from "next";
import type { DocMeta } from "@/app/_lib/useDocumentMeta";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";
import type {
  ProgramListResponse,
  PlaylistItemsResponse,
  PlaylistVideoItem,
} from "@/app/_interfaces/playlist";

const basePath = "https://video.ltn.com.tw/brand/api";

/**
 * 取得「話題」第一支影片的 watchUrl。
 * 1. playlist-list/topic → 取第一個清單的 apiUrl
 * 2. 該 apiUrl(playlist-items) → 取第一支影片的 watchUrl
 * 失敗時回傳 null。
 */
export async function getTopicFirstWatchUrl(): Promise<string | null> {
  try {
    const listRes = await fetch(`${basePath}/playlist-list/topic`);
    if (!listRes.ok) return null;
    const listData = (await listRes.json()) as ProgramListResponse;
    const apiUrl = listData.items?.[0]?.apiUrl;
    if (!apiUrl) return null;

    const itemsRes = await fetch(apiUrl);
    if (!itemsRes.ok) return null;
    const itemsData = (await itemsRes.json()) as PlaylistItemsResponse;
    return itemsData.items?.[0]?.watchUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * 靜態匯出用：列出「話題」區塊所有影片的 slug。
 *
 * 「話題」連結與 topic 影片頁的相關影片都指向 /topic/video/{slug}，
 * 這些 slug 來自 /playlist-list/topic 底下各清單的影片，
 * 不在 /list（最新影片）裡。若 generateStaticParams 只用 getVideoIds()，
 * 這些頁面不會被產生，靜態站上一點就 404。
 *
 * 逐一走訪 topic 各清單收集 watchUrl 的 slug（去重）。
 * maxPages 限制每份清單最多抓幾頁（方案 B 傳 1＝只取最新一頁）；
 * 預設 Infinity＝分頁抓完整份清單（另有 50 頁安全上限防無限迴圈）。
 * 失敗時盡量回傳已取得的部分，不讓單一清單失敗拖垮整個 build。
 */
export async function getTopicVideoIds(maxPages = Infinity): Promise<string[]> {
  const slugs = new Set<string>();
  try {
    const listRes = await fetch(`${basePath}/playlist-list/topic`);
    if (!listRes.ok) return [];
    const listData = (await listRes.json()) as ProgramListResponse;

    for (const entry of listData.items ?? []) {
      // 各清單以 playlist-items/{key}/{page} 分頁；用清單 id 當 key
      const key = entry.id != null ? String(entry.id) : entry.key ?? "";
      if (!key) continue;

      let page: number | null = 1;
      // guard：50 頁安全上限防無限迴圈；maxPages：方案 B 只抓最新幾頁
      for (let guard = 0; page != null && guard < 50 && guard < maxPages; guard++) {
        const { items, nextPage }: PlaylistPage = await getPlaylistPage(
          key,
          page,
        );
        for (const item of items) {
          const slug = watchUrlToSlug(item.watchUrl);
          if (slug) slugs.add(slug);
        }
        page = nextPage;
      }
    }
  } catch {
    // 走到一半失敗就用已收集到的部分
  }
  return [...slugs];
}

/**
 * 靜態匯出用：列出「節目」區塊所有影片的 slug。
 *
 * ※ 目前（方案 B）未接線：programs 詳情頁改成只預先產生 /list 最新影片，
 *   節目清單較舊的影片交給 /video-fallback 即時渲染。保留此函式以便日後
 *   要切回「完整 per-video SEO」時，直接在 generateStaticParams 併回即可。
 *
 * 節目影片頁連到 /programs/{category}/video/{slug}，這些 slug 來自
 * /playlist-list/program 底下各節目清單（playlist-items/{key}/{page}），
 * 多數並不在 /list（最新影片）裡。若 [id] 的 generateStaticParams 只用
 * getVideoIds()，這些頁面在 output:"export" 下不會被產生，靜態站一點就 404
 * （dev 是即時產生所以看起來正常）。
 *
 * 逐一走訪每個節目清單並分頁抓完，收集所有 watchUrl 的 slug（去重）。
 * 失敗時盡量回傳已取得的部分，不讓單一清單失敗拖垮整個 build。
 */
export async function getProgramVideoIds(): Promise<string[]> {
  const slugs = new Set<string>();
  try {
    const listRes = await fetch(`${basePath}/playlist-list/program`);
    if (!listRes.ok) return [];
    const listData = (await listRes.json()) as ProgramListResponse;

    for (const entry of listData.items ?? []) {
      // playlist-items 以清單 key 分頁；apiUrl 用的是英數 key，優先採用，退回數字 id
      const key = entry.key || (entry.id != null ? String(entry.id) : "");
      if (!key) continue;

      let page: number | null = 1;
      // 安全上限：避免分頁資料異常造成無限迴圈
      for (let guard = 0; page != null && guard < 50; guard++) {
        const { items, nextPage }: PlaylistPage = await getPlaylistPage(
          key,
          page,
        );
        for (const item of items) {
          const slug = watchUrlToSlug(item.watchUrl);
          if (slug) slugs.add(slug);
        }
        page = nextPage;
      }
    }
  } catch {
    // 走到一半失敗就用已收集到的部分
  }
  return [...slugs];
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
    const res = await fetch(`${basePath}/playlist-items/${key}/${page}`);
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
    const res = await fetch(`${basePath}/video/${id}`);

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as BrandVideoResponse;
  } catch {
    return null;
  }
}

/**
 * 靜態匯出用：抓取影片清單，回傳所有影片 id（字串）。
 * 給動態路由的 generateStaticParams 預先列出要產生的頁面。
 */
export async function getVideoIds(): Promise<string[]> {
  try {
    const res = await fetch(`${basePath}/list`);
    if (!res.ok) return [];
    // 路由 key 為 watchUrl 內的 slug（詳情 API 的 key），不是數字 id
    const data = (await res.json()) as { items?: { watchUrl?: string }[] };
    return (data.items ?? [])
      .map((item) => watchUrlToSlug(item.watchUrl))
      .filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

/**
 * 取得可播放的 HLS 網址。
 *
 * 上游 video.ltn.com.tw 只對 *.ltn.com.tw 網域開放 CORS：
 * - 正式 build（部署在 ltn.com.tw 子網域，如 test49.ltn.com.tw）：
 *   上游會回應 Access-Control-Allow-Origin，直接用 API 給的原始網址即可。
 * - 本機 dev（localhost 非 ltn.com.tw）：上游不給 CORS，
 *   改走 next.config.ts 的同源代理 /hls/*。
 */
export function toProxiedHls(url?: string) {
  if (!url) {
    return undefined;
  }

  if (process.env.NODE_ENV === "development") {
    return url.replace("https://video.ltn.com.tw/media/", "/hls/");
  }

  return url;
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
  const description = seo?.description || video.summary || "自由影音影片詳細頁";
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

/**
 * 依影片資料組出 client 端要注入 <head> 的扁平 meta（給 useDocumentMeta 用）。
 * 與 buildVideoMetadata 共用同一套取值 / 後備邏輯，只是攤平成 DocMeta 形狀，
 * 供靜態外殼頁（video-fallback）在瀏覽器補上 SEO / OG 標籤。
 */
export function buildVideoDocMeta(data: BrandVideoResponse | null): DocMeta {
  const seo = data?.seo;
  const video = data?.video ?? fallbackVideo;

  return {
    title: seo?.title || video.title || "影片詳細頁 | 自由影音",
    description: seo?.description || video.summary || "自由影音影片詳細頁",
    imageUrl: seo?.imageUrl || video.posterUrl,
    canonicalUrl: seo?.canonicalUrl || video.canonicalUrl,
    ogType: "video.other",
  };
}
