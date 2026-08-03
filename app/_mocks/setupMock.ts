// axios-mock-adapter 的統一註冊點。
//
// 規則：
//   1. 只有 NEXT_PUBLIC_API_MOCK === "true" 時才攔截（預設只寫在 .env.development）。
//   2. 只攔「後端還沒好」的路徑，其餘一律 passThrough() 打真的 API，
//      不會影響現有那些用原生 fetch 的區塊。
//   3. 每個 mock 都給一點延遲，才看得出 loading 狀態。
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";

import { liveMock } from "./live";

// 讀 .env.*。Next 會在 build 時把這個字串直接內嵌，關掉時整段判斷會被移除。
const MOCK_ENABLED = process.env.NEXT_PUBLIC_API_MOCK === "true";

// 假資料的回應延遲（ms），模擬真實網路
const DELAY = 300;

export function setupMock(instance: AxiosInstance) {
  if (!MOCK_ENABLED) return;

  const mock = new MockAdapter(instance, {
    delayResponse: DELAY,
    // 沒對上任何規則的請求 → 照樣送到真的 API，不要噴 404
    onNoMatch: "passthrough",
  });

  // GET 任何結尾是 /live 的網址 → 直接回 liveMock，不出網路。
  //
  // 用正規表示式而非字串 "/live"：本專案很多 API 網址是後端回的「完整網址」
  // （像 congressEntry.apiUrl），沒有經過 baseURL；字串只比對得到相對路徑，
  // 正則兩種都接得到。
  mock.onGet(/\/youtube-live$/).reply(200, liveMock);

  // 想測錯誤處理時，把上面那行換成：
  // mock.onGet(/\/live$/).reply(500);
  // 想測「沒有直播」時，改回 liveEmptyMock（同目錄 live.ts）

  // eslint-disable-next-line no-console
  console.info("[mock] axios mock 已啟用：GET /youtube-live");

  return mock;
}
