// 基礎影片結構
export interface BrandVideoResponse {
  video: {
    id: number; // 影片 ID [cite: 280]
    title: string; // 影片標題 [cite: 280]
    publishAt: string; // 發布時間 (YYYY/MM/DD HH:mm) [cite: 280]
    publishedAtiso: string; // ISO 8601 發布時間 [cite: 280]
    description: string; // 原始文字描述 [cite: 280]
    descriptionHtml: string; // 已轉段落 HTML 的描述 [cite: 280]
    summary: string; // 清理後摘要（移除網址、分隔線與頻道宣傳） [cite: 280]
    orientation: "vertical" | "horizontal"; // 影片方向 [cite: 280]
    canonicalUrl: string; // 一般影片頁 canonical URL [cite: 280]
    posterUrl: string; // 播放器 posterURL [cite: 280]
    hlsUrl: string; // HLS 串流 URL [cite: 280]
    spriteUrl: string; // 預覽縮圖 sprite URL [cite: 280]
  };
  navigation: {
    prev: VideoNavigation | null; // 上一支影片，沒有時為 null [cite: 280]
    next: VideoNavigation | null; // 下一支影片，沒有時為 null [cite: 280]
  };
  related: VideoRelatedItem[]; // 相關影片列表 [cite: 280]
  share: {
    facebook: string; // Facebook 分享 URL [cite: 280]
    twitter: string; // Twitter/X 分享 URL [cite: 280]
    line: string; // LINE 分享 URL [cite: 280]
  };
  seo: {
    title: string; // SEO title，可用於 <title> 與 og:title [cite: 283]
    description: string; // SEO description，可用於 meta description 與 og:description [cite: 283]
    canonicalUrl: string; // canonical URL，可用於 canonical link 與 og:url [cite: 283]
    imageUrl: string; // SEO 圖片 URL，可用於 og:image [cite: 283]
    publishedAt: string; // ISO 8601 發布時間，可用於 article published time [cite: 283]
  };
  schema: {
    "@context": string; // 固定為 https://schema.org [cite: 283]
    "@type": string; // 目前為 VideoObject [cite: 283]
    name: string; // 結構化資料的影片名稱 [cite: 283]
    description: string; // 結構化資料的影片描述 [cite: 283]
    thumbnailUrl: string[]; // 結構化資料的縮圖 URL 陣列 [cite: 283]
    uploadDate: string; // 結構化資料的 ISO 8601 上架時間 [cite: 283]
    url: string; // 結構化資料的影片頁 URL [cite: 283]
    contentUrl: string; // 結構化資料的影片內容 URL (HLS URL) [cite: 283]
    embedUrl: string; // 結構化資料的可嵌入播放 URL (HLS URL) [cite: 283]
  };
}

export interface VideoNavigation {
  id: number; // 影片 ID [cite: 280]
  title: string; // 影片標題 [cite: 280]
  publishAt: string; // 影片發布時間 [cite: 280]
  thumbnailUrl: string; // 影片縮圖 [cite: 280]
  articleUrl: string; // 影片導頁連結 [cite: 280]
}

export interface VideoRelatedItem {
  id: number; // 相關影片 ID [cite: 280]
  title: string; // 相關影片標題 [cite: 280]
  publishAt: string; // 相關影片發布時間 [cite: 280]
  thumbnailUrl: string; // 相關影片縮圖 [cite: 280]
  articleUrl: string; // 相關影片導頁連結 [cite: 280]
}
