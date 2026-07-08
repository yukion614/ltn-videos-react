// 基礎影片文章結構
export interface vedioArticle {
  id: number; // 影片 ID
  title: string; // 影片標題
  publishAt: string; // 發布時間，格式為YYYY/MM/DD HH:mm
  // 觀看頁連結，格式為 /video/{slug} 或 /video/{slug}/{playlistKey}。
  // 影片詳情 API（/video/{key}）的 key 就是第一段 slug，不是數字 id。
  watchUrl: string;
}

export interface VideoListItem extends vedioArticle {
  thumbnailUrl: string; // 列表縮圖 URL
  // /list 與 playlist-items 都不會回傳 hlsUrl；此欄位為前端另打詳情後補上（如 Navbar）
  hlsUrl?: string;
  // 進度條預覽用的 sprite sheet 首圖 URL（結尾為 Thumbnail_000000001.jpg）；
  // 同樣是列表 API 沒有、需另打詳情才拿得到，故為選填
  spriteUrl?: string;
}

export interface VideoListResponse {
  items: VideoListItem[]; // 影片列表資料 [cite: 123]
  nextPage: number | null; // 下一頁頁碼；沒有下一頁時為 null [cite: 123]
  hasMore: boolean; // 是否還有下一頁 [cite: 123]
}
