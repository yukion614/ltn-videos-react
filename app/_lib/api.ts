// 資料 API 的統一 base URL。上游若換網址，只改這一處即可（8 個呼叫端都 import 這裡）。
// 也可用環境變數 NEXT_PUBLIC_API_BASE 覆蓋，方便切換測試／正式環境。
//
// 注意：這是「資料 API」的 host（/brand/api/list、/shorts、/video/... 等），
// 跟「影片串流檔」（/media、/hls 代理）是不同的東西，兩者不要混用。
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://data.ltn.com.tw/brand/api";
