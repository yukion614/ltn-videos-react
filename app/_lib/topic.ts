// 話題（topic）區塊的資料存取。呼叫端只認這支，不必知道現在拿到的是 mock 還是真 API。
// 對照 _lib/live.ts 的寫法：走 http（axios instance）才吃得到 _mocks/setupMock 的假資料。
import type {
  TopicListResponse,
  PlaylistItemsResponse,
} from "../_interfaces/playlist";
import { http } from "./http";

// GET /playlist-list/topic → 話題清單（每筆帶自己的 playlist-items apiUrl）
export async function fetchTopicList(): Promise<TopicListResponse | null> {
  try {
    const res = await http.get<TopicListResponse>("/playlist-list/topic");
    return res.data;
  } catch {
    // 拿不到就讓呼叫端顯示空狀態，不要整頁掛掉
    return null;
  }
}

// apiUrl 是後端回的完整網址，axios 遇到絕對網址會略過 baseURL，直接打過去
export async function fetchPlaylistItems(
  apiUrl: string,
): Promise<PlaylistItemsResponse | null> {
  try {
    const res = await http.get<PlaylistItemsResponse>(apiUrl);
    return res.data;
  } catch {
    return null;
  }
}
