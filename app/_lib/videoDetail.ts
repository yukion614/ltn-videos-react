import type { Metadata } from "next";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";

const basePath = "https://video.ltn.com.tw/brand/api";

export const fallbackVideo: BrandVideoResponse["video"] = {
  id: 0,
  title: "颱風山陀兒逼近！東部風強雨驟慎防災害",
  publishAt: "2026/06/17 12:00",
  publishedAtiso: "2026-06-17T12:00:00+08:00",
  description:
    "中央氣象署最新資料指出，颱風山陀兒持續朝台灣東部海域逐步逼近，東部、東南部地區須嚴防強風暴雨。",
  descriptionHtml:
    "<p>中央氣象署最新資料指出，颱風山陀兒持續朝台灣東部海域逐步逼近，預估今晚至明日清晨影響最劇，東部、東南部地區須嚴防強風暴雨。</p><p>請民眾避免前往山區及海邊活動，並隨時注意最新警報資訊。</p>",
  summary:
    "颱風山陀兒持續朝台灣東部海域逐步逼近，東部、東南部地區須嚴防強風暴雨。",
  orientation: "horizontal",
  canonicalUrl: "/brand/video/0",
  posterUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/maxresdefault.jpg",
  hlsUrl: "",
  spriteUrl: "",
};

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
    const data = (await res.json()) as { items?: { id: number }[] };
    return (data.items ?? []).map((item) => String(item.id));
  } catch {
    return [];
  }
}

export function toProxiedHls(url?: string) {
  if (!url) {
    return undefined;
  }

  return url.replace("https://video.ltn.com.tw/media/", "/hls/");
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
