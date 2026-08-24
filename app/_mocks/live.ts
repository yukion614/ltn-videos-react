// YT 直播區塊的假資料。後端 /live 還沒上線前，前端先照 LiveResponse 的形狀開發。
//
// 真的 API 好了之後：把 .env.development 的 NEXT_PUBLIC_API_MOCK 拿掉（或設成 false），
// 這份檔案可以整包刪掉，呼叫端不用改。
import type {
  LiveResponse,
  TopicListResponse,
  PlaylistItemsResponse,
  PlaylistListResponse,
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
      // apiUrl 的最後一段要跟自己的 key 相同：/topic/[category] 是用 key 找 entry，
      // 再用 entry.apiUrl 取影片，兩邊對不起來就會抓到別的話題的清單
      apiUrl:
        "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90876/1",
    },
    {
      id: 47,
      key: "379323096a3df27dd90877",
      title: "2026世界盃棒球",
      count: 297,
      apiUrl:
        "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90877/1",
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

//topic playlist：第二個話題（key 379323096a3df27dd90877）
//
// 影片本身沿用同一批 slug：影片詳情頁（/topic/{key}/video/{slug}）沒有 mock，
// 會 passthrough 打真的 API，換成不存在的 slug 點進去只會拿到 404。
// 這份的用途是驗證「不同話題吃到自己那份清單」，所以差異放在 playlist 資訊與排序。
export const topicPlaylistBaseballMock: PlaylistItemsResponse = {
  playlist: {
    id: 47,
    key: "379323096a3df27dd90877",
    title: "2026世界盃棒球",
  },
  items: [
    {
      id: 65847,
      title: "假日啟動輔選模式？ 侯友宜：期待李四川順利接棒",
      publishAt: "2026/08/17 16:24",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/17/202608176a82c51be54cb.jpg",
      watchUrl: "/video/202608176a82c51be54cb/379323096a3df27dd90877",
    },
    {
      id: 65864,
      title: "盧秀燕願幫民眾黨議員站台 江和樹：有2028總統格局",
      publishAt: "2026/08/17 21:22",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/17/202608176a830ac2ad806.jpg",
      watchUrl: "/video/202608176a830ac2ad806/379323096a3df27dd90877",
    },
    {
      id: 65866,
      title: "民調輸江啟臣6個百分點  何欣純：內參民調差更少將「黃金交叉」",
      publishAt: "2026/08/17 21:44",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/17/202608176a830ff5b0287.jpg",
      watchUrl: "/video/202608176a830ff5b0287/379323096a3df27dd90877",
    },
    {
      id: 65867,
      title: "巡訪高雄世運主場館    賴瑞隆拋「五大升級」方案",
      publishAt: "2026/08/18 09:18",
      thumbnailUrl:
        "https://img.ltn.com.tw/Upload/video/2026/08/18/202608186a83b29aef41b.jpg",
      watchUrl: "/video/202608186a83b29aef41b/379323096a3df27dd90877",
    },
  ],
  page: 1,
  nextPage: null,
  hasMore: false,
};

// 首頁清單入口：GET /playlist-list/home
// 首頁所有區塊（main / youtubeLive / topic / shorts / program / congress）都由這一支派生，
// 每個 item 的 apiUrl 再各自去打 playlist-items / youtube-live / congress-live。
export const homeListMock: PlaylistListResponse = {
  title: "首頁",
  updatedAt: "2026-08-24T09:11:02+00:00",
  sections: {
    main: {
      title: "主要",
      items: [
        {
          title: "小編精選",
          apiUrl: "https://data.ltn.com.tw/brand/api/module-videos/139",
        },
      ],
    },
    youtubeLive: {
      title: "直播 Live",
      items: [
        {
          title: "YouTube 直播",
          apiUrl: "https://data.ltn.com.tw/brand/api/youtube-live",
        },
      ],
    },
    topic: {
      title: "話題",
      items: [
        {
          id: 46,
          key: "379323096a3df27dd90876",
          title: "2026九合一選舉",
          count: 339,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90876/1",
        },
        {
          id: 47,
          key: "379323096a3df27dd90877",
          title: "2026世界盃棒球",
          count: 128,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/379323096a3df27dd90877/1",
        },
      ],
    },
    shorts: {
      title: "Shorts",
      items: [
        {
          id: 45,
          key: "519532776a3df1f4e42fe6",
          title: "自由短影音",
          count: 902,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/519532776a3df1f4e42fe6/1",
        },
      ],
    },
    program: {
      title: "節目",
      items: [
        {
          id: 54,
          key: "294082016a3dfe9ef161b6",
          title: "政面交鋒",
          count: 14,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/294082016a3dfe9ef161b6/1",
        },
        {
          id: 63,
          key: "310622106a4c6d4133add9",
          title: "自由說新聞",
          count: 125,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/310622106a4c6d4133add9/1",
        },
        {
          id: 58,
          key: "591907276a4b8b47d310e1",
          title: "自由爆新聞",
          count: 59,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/591907276a4b8b47d310e1/1",
        },
        {
          id: 59,
          key: "236873586a4b994e658940",
          title: "新聞360",
          count: 58,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/236873586a4b994e658940/1",
        },
        {
          id: 50,
          key: "224072336a3df2b81a05b2",
          title: "官我什麼事",
          count: 33,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/224072336a3df2b81a05b2/1",
        },
        {
          id: 60,
          key: "165748786a4b9acfb9b490",
          title: "台海情勢簡報室",
          count: 32,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/165748786a4b9acfb9b490/1",
        },
        {
          id: 61,
          key: "550020776a4b9dccf27558",
          title: "名人開講",
          count: 28,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/550020776a4b9dccf27558/1",
        },
        {
          id: 65,
          key: "305467306a72fcd8456902",
          title: "娛樂轟轟轟",
          count: 67,
          apiUrl:
            "https://video.ltn.com.tw/brand/api/playlist-items/305467306a72fcd8456902/1",
        },
      ],
    },
    congress: {
      title: "國會直播",
      items: [
        {
          title: "國會直播",
          apiUrl: "https://video.ltn.com.tw/brand/api/congress-live",
        },
      ],
    },
  },
};
