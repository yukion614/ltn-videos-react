// 資料 API 的統一 base URL。上游若換網址，只改這一處即可（8 個呼叫端都 import 這裡）。
// 也可用環境變數 NEXT_PUBLIC_API_BASE 覆蓋，方便切換測試／正式環境。
//
// 注意：這是「資料 API」的 host（/brand/api/list、/shorts、/video/... 等），
// 跟「影片串流檔」（/media、/hls 代理）是不同的東西，兩者不要混用。
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://data.ltn.com.tw/brand/api";

// ISR 快取秒數。各路由以 `export const revalidate` 套用，資料 fetch 也帶同樣秒數。
//
// 影片發佈後標題／描述幾乎不再變動 → 存久一點，省下打 API 的次數。
// 列表頁（節目分類／最新／節目清單）要讓新影片儘快浮上來 → 設短一些。
//
// 注意：這只影響「已產生過的頁面多久刷新一次」。全新的影片沒有快取可言，
// 第一個訪客就會觸發即時渲染，不受此秒數影響，也不必重 build。
//
// ⚠️ route segment 的 `export const revalidate` 是靜態分析的，不吃匯入的常數
//    （會被判為 "Invalid config value exports"），各路由必須寫字面值。
//    改這裡的數值時，記得同步各路由檔的字面值。
export const VIDEO_REVALIDATE = 3600; // 影片詳情頁：1 小時
export const LIST_REVALIDATE = 120; // 列表 / 分類頁：2 分鐘
