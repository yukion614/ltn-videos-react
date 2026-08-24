// 首頁清單入口（playlist-list/home）的資料存取。呼叫端只認這支，
// 不必知道現在拿到的是 mock 還是真 API。
// 對照 _lib/live.ts、_lib/topic.ts 的寫法：走 http（axios instance）才吃得到
// _mocks/setupMock 的假資料；用原生 fetch 打的請求 mock adapter 攔不到。
import type { PlaylistListResponse } from "../_interfaces/playlist";
import { http } from "./http";

// GET /playlist-list/home → 首頁各區塊（main / youtubeLive / topic / shorts / program / congress）
export async function fetchHomeList(): Promise<PlaylistListResponse | null> {
  try {
    const res = await http.get<PlaylistListResponse>("/playlist-list/home");
    return res.data;
  } catch {
    // 拿不到就讓呼叫端顯示空狀態，不要整頁掛掉
    return null;
  }
}
