// YT 直播區塊的假資料。後端 /live 還沒上線前，前端先照 LiveResponse 的形狀開發。
//
// 真的 API 好了之後：把 .env.development 的 NEXT_PUBLIC_API_MOCK 拿掉（或設成 false），
// 這份檔案可以整包刪掉，呼叫端不用改。
import type { LiveResponse } from "../_interfaces/playlist";

export const liveMock: LiveResponse = {
  visible: true,
  onplay: 1,
  items: [
    {
      id: "1",
      name: "藍白別再擋！台灣恐跌出美國優先名單！賴清德親上火線回應軍購",
      // 直播結束後會變成「無法播放存檔」，iframe 就是一片黑。畫面全黑時先確認這支還活著：
      //   https://www.youtube.com/embed/<ID>  貼到瀏覽器，能播才是好的
      url: "https://www.youtube.com/embed/QdPgHLBtjTc",
      status: "PLAY",
    },
  ],
};

// 需要測「整個區塊不顯示」的情境時，把 setupMock 內回傳的資料換成這一份即可
export const liveEmptyMock: LiveResponse = {
  visible: false,
  onplay: null,
  items: [],
};
