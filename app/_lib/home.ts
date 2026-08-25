// 首頁清單入口（playlist-list/home）的資料存取。呼叫端只認這支，
// 不必知道現在拿到的是 mock 還是真 API。
// 對照 _lib/live.ts、_lib/topic.ts 的寫法：走 http（axios instance）才吃得到
// _mocks/setupMock 的假資料；用原生 fetch 打的請求 mock adapter 攔不到。
import type { PlaylistListResponse } from "../_interfaces/playlist";
import { http } from "./http";

// GET /playlist-list/home → 首頁各區塊（main / youtubeLive / topic / shorts / program / congress）
export async function fetchHomeList(): Promise<PlaylistListResponse | null> {
  try {
    // 路徑可用環境變數覆寫（測試新清單用，例如 /playlist-list/home2），沒設就走正式路徑
    const res = await http.get<PlaylistListResponse>(
      process.env.NEXT_PUBLIC_HOME_PLAYLIST_PATH || "/playlist-list/home",
    );
    // 測試路徑（如 home2）可能回舊的扁平結構或空資料，沒有 sections 就視同拿不到，
    // 免得呼叫端存取 sections.xxx 直接整頁崩潰
    if (!res.data?.sections) return null;
    return res.data;
  } catch {
    // 拿不到就讓呼叫端顯示空狀態，不要整頁掛掉
    return null;
  }
}
