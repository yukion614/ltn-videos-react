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
import { buildSiteIcons, SITE_SHARE_IMAGE } from "./siteIcons";

const basePath = API_BASE;

//取得影片Id
export async function getTopicFirstVideoId(): Promise<number | null> {
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
    return itemsData.items?.[0]?.id ?? null;
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
    return { items, nextPage: more ? (data.nextPage ?? page + 1) : null };
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
 * 影片詳情頁的完整資料：影片本身 + 「你還會想看」的 related 後備清單。
 *
 * programs / topic / latest 三個影片路由的取數邏輯完全相同，抽出來共用。
 *
 * 「你還會想看」的第一頁改由 client 端（RelatedVideos）自己抓，server 不預帶——
 * 這樣首屏 HTML 的正文只含本片內容，其他影片的標題不會進到 SSR HTML 影響本頁 SEO。
 * 這裡只回傳 related 後備：播放清單抓不到內容時（如最新頁的單片，playlist 回空）
 * 才用得到；它固定一批、沒有分頁，且只在 client 端 fallback 時渲染。
 *
 * 找不到影片時回 null，由呼叫端決定 notFound()。
 */
export async function getVideoPageData(id: string) {
  const data = await getVideo(id);
  if (!data?.video) return null;

  // 有播放清單的影片（topic / programs）由 client 抓 playlist 第 1 頁，用不到 related 後備，
  // 就不把它序列化進 flight data（否則其他影片標題會出現在檢視原始碼的 <script> 裡）。
  // 只有沒有播放清單的影片（如最新頁單片）才帶 related 當後備。
  const relatedFallback = data.playlist?.key
    ? []
    : (data.related ?? []).filter((item) => item.id !== data.video.id);

  return { data, relatedFallback };
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
    ? (watchUrlToSlug(items[0].watchUrl) ?? String(items[0].id))
    : "";
  if (!leadSlug) return { items, nextPage, leadHls: "", leadSprite: "" };

  const detail = await getVideo(leadSlug);
  return {
    items,
    nextPage,
    leadHls: detail?.video?.hlsUrl ?? "",
    leadSprite: detail?.video?.spriteUrl ?? "",
  };
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
 * 組出影片頁的 schema.org VideoObject JSON-LD。
 *
 * 後端詳情 API 已回傳現成的 data.schema（BrandVideoSchema），優先直接沿用；
 * 只有它缺漏時（如最新頁單片、fallback）才用 video 欄位自組一份，讓每支影片頁
 * 都至少有一組結構化資料。回傳可直接丟給 <JsonLd> 的物件，沒有可用資料時回 null。
 */
export function buildVideoJsonLd(
  data: BrandVideoResponse | null,
): Record<string, unknown> | null {
  // 後端已備好完整 VideoObject：直接用，欄位最準（含 contentUrl / embedUrl）。
  if (data?.schema && data.schema.name) {
    // interface 可被 declaration merging 擴充，TS 不保證它只有已知的 key，
    // 因此不給隱含 index signature，無法直接指派給 Record<string, unknown>
    //（若 BrandVideoSchema 改成 type 別名就不需要轉型）。這裡只是型別層面的
    // 轉換，執行期不做任何處理，物件會原封不動輸出到 JSON-LD。
    return data.schema as unknown as Record<string, unknown>;
  }

  const video = data?.video;
  if (!video) return null;

  // 後備：用 video 欄位補一份最小可用的 VideoObject。
  // thumbnailUrl 依 Google 建議用陣列；uploadDate 需 ISO 8601（用 publishedAtIso）。
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.summary || video.description || video.title,
    uploadDate: video.publishedAtIso || undefined,
  };

  if (video.posterUrl) jsonLd.thumbnailUrl = [video.posterUrl];
  if (video.canonicalUrl) jsonLd.url = video.canonicalUrl;
  if (video.hlsUrl) {
    jsonLd.contentUrl = video.hlsUrl;
    jsonLd.embedUrl = video.hlsUrl;
  }

  return jsonLd;
}

/**
 * 影片詳細頁共用的 Open Graph 預設值。
 *
 * Next 的 metadata 是「淺層合併」：頁面的 generateMetadata 一旦宣告 openGraph，
 * app/layout.tsx 的整個 openGraph 物件會被取代（siteName / locale 等不會保留），
 * 所以站台層級的欄位必須在這裡補回來。
 */
const VIDEO_OG_DEFAULTS = {
  siteName: "自由時報電子報",
  locale: "zh_TW",
} as const;

/** 同上，twitter 也會被整個取代，站台帳號要在這裡補。 */
const VIDEO_TWITTER_DEFAULTS = {
  site: "@ltntw",
  creator: "@ltntw",
} as const;

/** 抓不到影片標題時的後備標題。 */
const FALLBACK_TITLE = "影片詳細頁 | 自由影音";

/**
 * 依據影片資料組出 SEO / OG / Twitter metadata。
 * 給各路由的 generateMetadata 共用（latest / topic / programs / shorts）。
 *
 * 要改「影片詳細頁通用的 metadata」就改這支函式；只影響單一路由的差異，
 * 由呼叫端拿回傳值再覆寫。
 */
export function buildVideoMetadata(data: BrandVideoResponse | null): Metadata {
  const seo = data?.seo;
  const video = data?.video ?? fallbackVideo;

  const title = seo?.title || video.title || FALLBACK_TITLE;
  // 後端沒給描述就不輸出 description / og:description（回 undefined，Next 會整個省略標籤）。
  // 不塞佔位字串：最新（/list）的影片 seo.description 常是空字串，硬填會讓 FB 分享預覽
  // 顯示一句沒有意義的話；沒有標籤時 FB 會自行略過該行，比顯示假資訊好。
  const description = seo?.description || video.summary || undefined;
  // 圖片與描述不同：分享卡片沒有圖會很難看，且站台預設圖不算「假資訊」，故補後備。
  const imageUrl = seo?.imageUrl || video.posterUrl || SITE_SHARE_IMAGE;
  const canonicalUrl = seo?.canonicalUrl || video.canonicalUrl;

  return {
    title,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    // 讓 <link rel="image_src"> 指向本片的圖，而不是繼承 layout 的站台預設圖。
    // 一併帶上 favicon / apple-touch-icon，否則淺層合併會把它們一起蓋掉。
    icons: buildSiteIcons(imageUrl),
    openGraph: {
      ...VIDEO_OG_DEFAULTS,
      type: "video.other",
      title,
      description,
      url: canonicalUrl || undefined,
      images: [{ url: imageUrl }],
    },
    twitter: {
      ...VIDEO_TWITTER_DEFAULTS,
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
