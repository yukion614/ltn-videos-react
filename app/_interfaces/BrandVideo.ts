// 單一影片詳情 API（/brand/api/video/{slug}/{playlistKey}）的回應結構
export interface BrandVideoResponse {
  video: BrandVideo;
  playlist: BrandVideoPlaylist; // 此影片所屬播放清單
  breadcrumb: BrandVideoBreadcrumb[]; // 麵包屑導覽
  navigation: {
    prev: VideoNavigation | null; // 上一支影片，沒有時為 null
    next: VideoNavigation | null; // 下一支影片，沒有時為 null
  };
  related: VideoRelatedItem[]; // 相關影片列表
  share: BrandVideoShare; // 社群分享連結
  seo: BrandVideoSeo; // SEO / OG 用資料
  schema: BrandVideoSchema; // schema.org 結構化資料（VideoObject）
}

// 影片本體
export interface BrandVideo {
  id: number; // 影片 ID
  title: string; // 影片標題
  publishAt: string; // 發布時間 (YYYY/MM/DD HH:mm)
  publishedAtIso: string; // ISO 8601 發布時間（後端欄位為大寫 I）
  description: string; // 原始文字描述
  descriptionHtml: string; // 已轉段落 HTML 的描述
  summary: string; // 清理後摘要（移除網址、分隔線與頻道宣傳）
  orientation: "vertical" | "horizontal"; // 影片方向
  canonicalUrl: string; // 一般影片頁 canonical URL
  newsUrl: string; // 對應新聞頁連結
  posterUrl: string; // 播放器 poster URL
  hlsUrl: string; // HLS 串流 URL
  spriteUrl: string; // 預覽縮圖 sprite URL
}

// 此影片所屬播放清單
export interface BrandVideoPlaylist {
  key: string; // 清單 key，如 "974323396a3dfebd6bb421"
  title: string; // 清單標題，如「影音精選」
  parentKey: string; // 上層分區 key，如 "main"
  parentTitle: string; // 上層分區標題，如「主要」
}

// 麵包屑項目
export interface BrandVideoBreadcrumb {
  title: string; // 節點名稱，如「影音精選」
  url: string; // 節點連結，如 "/programs/974323396a3dfebd6bb421"
}

// 上一支 / 下一支影片
export interface VideoNavigation {
  id: number; // 影片 ID
  title: string; // 影片標題
  publishAt: string; // 影片發布時間
  thumbnailUrl: string; // 影片縮圖
  watchUrl: string; // 觀看頁連結 /video/{slug}/{playlistKey}
}

// 相關影片項目
export interface VideoRelatedItem {
  id: number; // 相關影片 ID
  title: string; // 相關影片標題
  publishAt: string; // 相關影片發布時間
  thumbnailUrl: string; // 相關影片縮圖
  watchUrl: string; // 觀看頁連結 /video/{slug}/{playlistKey}
}

// 社群分享連結
export interface BrandVideoShare {
  facebook: string; // Facebook 分享 URL
  twitter: string; // Twitter/X 分享 URL
  line: string; // LINE 分享 URL
}

// SEO / OG 用資料
export interface BrandVideoSeo {
  title: string; // SEO title，可用於 <title> 與 og:title
  description: string; // SEO description，可用於 meta description 與 og:description
  canonicalUrl: string; // canonical URL，可用於 canonical link 與 og:url
  imageUrl: string; // SEO 圖片 URL，可用於 og:image
  publishedAt: string; // ISO 8601 發布時間，可用於 article published time
}

// schema.org 結構化資料（VideoObject）
export interface BrandVideoSchema {
  "@context": string; // 固定為 https://schema.org
  "@type": string; // 目前為 VideoObject
  name: string; // 結構化資料的影片名稱
  description: string; // 結構化資料的影片描述
  thumbnailUrl: string[]; // 結構化資料的縮圖 URL 陣列
  uploadDate: string; // 結構化資料的 ISO 8601 上架時間
  url: string; // 結構化資料的影片頁 URL
  contentUrl: string; // 結構化資料的影片內容 URL (HLS URL)
  embedUrl: string; // 結構化資料的可嵌入播放 URL (HLS URL)
}
