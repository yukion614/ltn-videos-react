// 播放清單列表 API：https://data.ltn.com.tw/brand/api/playlist-list/home

// 單一播放清單的索引項目
export interface PlaylistEntry {
  id?: number; // 播放清單 ID（shorts / congress 等特殊區塊可能沒有）
  key?: string; // 清單 key（目前多為空字串）
  title: string; // 清單標題，如「影音精選」
  count?: number; // 清單內影片數量
  apiUrl: string; // 取得清單影片的 API（playlist-items/{id}/{page}）
}

// 區塊（main / topic / shorts / program / congress）
export interface PlaylistSection {
  title: string; // 區塊標題，如「主要」「話題」「節目」
  items: PlaylistEntry[]; // 該區塊底下的播放清單
}

// playlist-list/home 回傳結構
export interface PlaylistListResponse {
  title: string; // 頁面標題，如「首頁」
  updatedAt: string; // ISO 8601 更新時間
  sections: Record<string, PlaylistSection>; // 依用途分區的播放清單
}

// playlist-list/program 回傳結構（扁平 items，非 sections）
export interface ProgramListResponse {
  title: string; // 區塊標題，如「節目」
  updatedAt: string; // ISO 8601 更新時間
  items: PlaylistEntry[]; // 所有節目播放清單
}

// 播放清單影片項目 API：https://data.ltn.com.tw/brand/api/playlist-items/{id}/{page}

export interface PlaylistVideoItem {
  id: number; // 影片 ID
  title: string; // 影片標題
  publishAt: string; // 發布時間（YYYY/MM/DD HH:mm）
  thumbnailUrl: string; // 列表縮圖 URL
  // 觀看頁連結，格式 /video/{slug}/{playlistKey}；詳情 API 的 key 為第一段 slug
  watchUrl: string;
}

//yt  直播
export interface LiveItem {
  id: string; // live ID
  name: string; // live 標題
  url: string; //影片來源（YouTube embed）
  status: string; // 狀態文字：PLAY / OFF
}

export interface LiveResponse {
  visible: boolean; // 是否顯示整個直播區塊
  onplay: number | null; //目前直播中的直播 id（無則為 null）
  items: LiveItem[]; // 直播列表
}

// 國會直播 API：congress 區塊 items[0].apiUrl（如 .../brand/api/congress-live）

// 單一議程項目（每個議程帶自己的影片網址，status === "onplay" 代表直播中）
export interface CongressLiveItem {
  id: number; // 議程 ID
  name: string; // 議程名稱，如「院會」
  url: string; // 影片來源（YouTube embed）
  status: string; // 狀態：onplay = 直播中，off = 未直播
  statusText: string; // 狀態文字：PLAY / OFF
  pageUrl: string; // 該議程於自由時報的頁面連結
}

// congress-live 回傳結構
export interface CongressLiveResponse {
  visible: boolean; // 是否顯示整個國會直播區塊
  onplay: number | null; // 目前直播中的議程 id（無則為 null）
  moreUrl: string; // 「更多影片」連結
  items: CongressLiveItem[]; // 議程列表
}

// playlist-items 回傳結構
export interface PlaylistItemsResponse {
  playlist: {
    id: number; // 播放清單 ID
    key?: string; // 清單 key
    title: string; // 播放清單標題
  };
  items: PlaylistVideoItem[]; // 清單內影片列表
  page?: number; // 目前頁碼
  nextPage?: number | null; // 下一頁頁碼；沒有下一頁時為 null
  hasMore?: boolean; // 是否還有下一頁
}
