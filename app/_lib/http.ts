// 共用的 axios instance。baseURL 沿用 API_BASE，呼叫端只寫路徑即可：
//   http.get<LiveResponse>("/live")  →  https://data.ltn.com.tw/brand/api/live
//
// 現有程式碼多半直接用原生 fetch，兩者可以並存；需要 mock 假資料的 API 才走這裡。
import axios from "axios";

import { API_BASE } from "./api";
import { setupMock } from "../_mocks/setupMock";

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// 掛上 mock adapter。實際是否攔截由 NEXT_PUBLIC_API_MOCK 決定（見 setupMock），
// 關掉時這裡等同沒做事，所有請求照常打真的 API。
setupMock(http);
