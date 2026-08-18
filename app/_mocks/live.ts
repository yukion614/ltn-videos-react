// YT 直播區塊的假資料。後端 /live 還沒上線前，前端先照 LiveResponse 的形狀開發。
//
// 真的 API 好了之後：把 .env.development 的 NEXT_PUBLIC_API_MOCK 拿掉（或設成 false），
// 這份檔案可以整包刪掉，呼叫端不用改。
import type {
  LiveResponse,
  TopicListResponse,
  PlaylistItemsResponse,
} from "../_interfaces/playlist";

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

//輸出topic 單主題
export const topicMock: TopicListResponse = {
  title: "話題",
  updatedAt: "2026-08-18T01:49:03+00:00",
  items: [
    {
      id: 46,
      key: "379323096a3df27dd90876",
      title: "2026九合一選舉",
      count: 296,
      apiUrl:
        "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90876/1",
    },
  ],
};

//輸出topic 雙主題
export const topicTwiceMock: TopicListResponse = {
  title: "話題",
  updatedAt: "2026-08-18T01:49:03+00:00",
  items: [
    {
      id: 46,
      key: "379323096a3df27dd90876",
      title: "2026九合一選舉",
      count: 296,
      apiUrl:
        "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90870/1",
    },
    {
      id: 47,
      key: "379323096a3df27dd90877",
      title: "jomen 牛肉麵",
      count: 297,
      apiUrl:
        "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90871/1",
    },
  ],
};

//topic playlist
export const topicPlaylistMock: PlaylistItemsResponse = {
  playlist: {
    id: 46,
    key: "379323096a3df27dd90876",
    title: "2026九合一選舉",
  },
  items: [
    {
      id: 65867,
      title: "巡訪高雄世運主場館    賴瑞隆拋「五大升級」方案",
      publishAt: "2026/08/18 09:18",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/18/202608186a83b29aef41b.jpg",
      watchUrl: "/video/202608186a83b29aef41b/379323096a3df27dd90876",
    },
    {
      id: 65866,
      title: "民調輸江啟臣6個百分點  何欣純：內參民調差更少將「黃金交叉」",
      publishAt: "2026/08/17 21:44",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/17/202608176a830ff5b0287.jpg",
      watchUrl: "/video/202608176a830ff5b0287/379323096a3df27dd90876",
    },
    {
      id: 65864,
      title: "盧秀燕願幫民眾黨議員站台 江和樹：有2028總統格局",
      publishAt: "2026/08/17 21:22",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/17/202608176a830ac2ad806.jpg",
      watchUrl: "/video/202608176a830ac2ad806/379323096a3df27dd90876",
    },
    {
      id: 65847,
      title: "假日啟動輔選模式？ 侯友宜：期待李四川順利接棒",
      publishAt: "2026/08/17 16:24",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/17/202608176a82c51be54cb.jpg",
      watchUrl: "/video/202608176a82c51be54cb/379323096a3df27dd90876",
    },
  ],
  page: 1,
  nextPage: null,
  hasMore: false,
};
