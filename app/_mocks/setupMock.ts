// axios-mock-adapter 的統一註冊點。
//
// 規則：
//   1. 只有 NEXT_PUBLIC_API_MOCK === "true" 時才攔截（預設只寫在 .env.development）。
//   2. 只攔「後端還沒好」的路徑，其餘一律 passThrough() 打真的 API，
//      不會影響現有那些用原生 fetch 的區塊。
//   3. 每個 mock 都給一點延遲，才看得出 loading 狀態。
//
// ⚠️ 只攔得到「走 http（axios instance）的請求」。用原生 fetch 打的 API 不會被攔，
//    要 mock 的呼叫端請先改成 http.get（見 app/_lib/topic.ts）。
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";

import {
  liveMock,
  topicMock,
  topicTwiceMock,
  topicPlaylistMock,
  topicPlaylistBaseballMock,
  homeListMock,
} from "./live";

// 讀 .env.*。Next 會在 build 時把這個字串直接內嵌，關掉時整段判斷會被移除。
const MOCK_ENABLED = process.env.NEXT_PUBLIC_API_MOCK === "true";

// 假資料的回應延遲（ms），模擬真實網路
const DELAY = 300;

export function setupMock(instance: AxiosInstance) {
  if (!MOCK_ENABLED) return;

  const mock = new MockAdapter(instance, {
    delayResponse: DELAY,
    // 有寫 Mock 規則的 API $\rightarrow$ 回傳你設定的假資料（Mock）。
    // 沒寫 Mock 規則的 API $\rightarrow$ 透過 passthrough 直接連到真實的伺服器抓真資料。
    onNoMatch: "passthrough",
  });

  mock.onGet(/\/youtube-live$/).reply(200, liveMock);
  mock.onGet(/\/playlist-list\/home$/).reply(200, homeListMock);
  // mock.onGet(/\/playlist-list\/topic$/).reply(200, topicMock);
  mock.onGet(/\/playlist-list\/topic$/).reply(200, topicTwiceMock);
  // playlist-items 只攔「後端還沒有的那兩份話題清單」，各自回自己的假資料，
  // /topic/[category] 才看得出各話題吃到自己那份。
  // ⚠️ 不要用 /playlist-items\/[^/]+\/\d+/ 這種泛用規則：首頁的影音精選、Shorts、節目
  //    也都打 playlist-items，全攔下來會讓它們一起變成話題的假資料。沒列到的照樣 passthrough。
  mock
    .onGet(/\/playlist-items\/379323096a3df27dd90876\/\d+$/)
    .reply(200, topicPlaylistMock);
  mock
    .onGet(/\/playlist-items\/379323096a3df27dd90877\/\d+$/)
    .reply(200, topicPlaylistBaseballMock);

  // 想測錯誤處理時，把上面那行換成：
  // mock.onGet(/\/playlist-list\/topic$/).reply(500);

  // eslint-disable-next-line no-console
  console.info(
    "[mock] axios mock 已啟用：GET /youtube-live、/playlist-list/home、/playlist-list/topic、/playlist-items/*",
  );

  return mock;
}
