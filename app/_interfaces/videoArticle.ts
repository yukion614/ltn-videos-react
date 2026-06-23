// 基礎影片文章結構
export interface vedioArticle {
  id: number; // 影片 ID
  title: string; // 影片標題
  publishAt: string; // 發布時間，格式為YYYY/MM/DD HH:mm
  articleUrl: string; // 一般影片頁導頁連結
}

export interface VideoListItem extends vedioArticle {
  thumbnailUrl: string; // 列表縮圖 URL [cite: 123]
  hlsUrl?: string;
}

export interface VideoListResponse {
  items: VideoListItem[]; // 影片列表資料 [cite: 123]
  nextPage: number | null; // 下一頁頁碼；沒有下一頁時為 null [cite: 123]
  hasMore: boolean; // 是否還有下一頁 [cite: 123]
}
