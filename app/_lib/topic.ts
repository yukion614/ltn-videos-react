// 話題（topic）區塊的資料存取。呼叫端只認這支，不必知道現在拿到的是 mock 還是真 API。
// 對照 _lib/live.ts 的寫法：走 http（axios instance）才吃得到 _mocks/setupMock 的假資料。
import type {
  TopicListResponse,
  PlaylistItemsResponse,
  PlaylistEntry,
  PlaylistVideoItem,
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

// 單一話題頁（/topic/[category]）的資料：話題清單資訊 + 該清單影片。
// slug 就是路由參數，對應 entry.key（沒有 key 時退回 entry.id 的字串）。
//
// 找不到對應 entry 時不直接放棄：後端剛上架的話題可能還沒進 /playlist-list/topic，
// 但 playlist-items 已有內容，改用慣例路徑再試一次，抓得到就照常呈現。
export async function fetchTopicSection(slug: string): Promise<{
  entry: PlaylistEntry | null;
  items: PlaylistVideoItem[];
} | null> {
  if (!slug) return null;

  const list = await fetchTopicList();
  const entry =
    list?.items?.find((item) => (item.key || String(item.id ?? "")) === slug) ??
    null;

  const data = await fetchPlaylistItems(
    entry?.apiUrl ?? `/playlist-items/${slug}/1`,
  );
  const items = data?.items ?? [];

  // 清單裡沒有、影片也抓不到 → 真的沒這個話題
  if (!entry && items.length === 0) return null;

  return {
    entry: entry ?? {
      id: data?.playlist?.id,
      key: data?.playlist?.key ?? slug,
      title: data?.playlist?.title ?? "話題",
      apiUrl: `/playlist-items/${slug}/1`,
    },
    items,
  };
}
