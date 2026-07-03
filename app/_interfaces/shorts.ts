export type ShortsOrientation = "horizontal" | "vertical";

export type ShortsDisplayMode = "contain" | "cover";

// 後端預先組好的分享連結（已帶 UTM 追蹤參數，供行銷成效統計）
export interface ShortsShare {
  facebook: string;
  twitter: string;
  line: string;
}

export interface ShortsApiItem {
  id: number;
  title: string;
  publishAt: string;
  description: string;
  descriptionHtml: string;
  summary: string;
  orientation: ShortsOrientation;
  displayMode: ShortsDisplayMode;
  // 觀看頁連結，格式 /video/{slug}；後端已移除 articleUrl
  watchUrl: string;
  // 後端提供的分享連結（含 UTM）；舊資料可能沒有，故為選填
  share?: ShortsShare;
  posterUrl: string;
  hlsUrl: string;
  spriteUrl: string;
}

export interface ShortsApiResponse {
  items: ShortsApiItem[];
  hasMore: boolean;
  moreId: number | null;
}

export type ShortsRailItem = Pick<
  ShortsApiItem,
  "id" | "title" | "publishAt" | "watchUrl" | "posterUrl" | "hlsUrl"
> & {
  views?: string;
};
