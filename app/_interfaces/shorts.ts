export type ShortsOrientation = "horizontal" | "vertical";

export type ShortsDisplayMode = "contain" | "cover";

export interface ShortsApiItem {
  id: number;
  title: string;
  publishAt: string;
  description: string;
  descriptionHtml: string;
  summary: string;
  orientation: ShortsOrientation;
  displayMode: ShortsDisplayMode;
  articleUrl: string;
  watchUrl: string;
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
