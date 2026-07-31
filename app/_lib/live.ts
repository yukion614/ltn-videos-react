// 直播區塊的資料存取。呼叫端只認這支，不必知道現在拿到的是 mock 還是真 API。
import type { LiveResponse } from "../_interfaces/playlist";

import { http } from "./http";

export async function fetchLive(): Promise<LiveResponse | null> {
  try {
    const res = await http.get<LiveResponse>("/live");
    return res.data;
  } catch {
    // 直播區塊拿不到資料時不顯示即可，不要讓整頁掛掉（同 congress-live 的處理方式）
    return null;
  }
}
