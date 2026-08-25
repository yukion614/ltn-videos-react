"use client";
import styles from "./page.module.scss";
import { useEffect, useState } from "react";
import VideoPlayer from "./_components/VideoPlayer/VideoPlayerClient";
import VideoThumbnail from "./_components/VideoThumbnail/VideoThumbnail";
import ShortsRail from "./_components/ShortsRail/ShortsRail";
import type { ShortsRailItem } from "./_interfaces/shorts";
import type { VideoListItem } from "./_interfaces/videoArticle";
import type { BrandVideoResponse } from "./_interfaces/BrandVideo";
import type {
  PlaylistVideoItem,
  PlaylistEntry,
  CongressLiveResponse,
  CongressLiveItem,
  LiveResponse,
} from "./_interfaces/playlist";
import { watchUrlToSlug } from "./_lib/videoDetail";
import { API_BASE } from "./_lib/api";
import { useIsMobile } from "./hooks/useIsMobile";
import { fetchLive } from "./_lib/live";
import { fetchHomeList } from "./_lib/home";
import { fetchPlaylistItems as fetchPlaylistItemsApi } from "./_lib/topic";

// 節目卡片：清單資訊 + 首支影片的封面與連結
type ProgramCard = PlaylistEntry & {
  thumbnailUrl?: string;
  watchUrl?: string;
};

// 節目卡連結：後端 entry 自帶 key，就是 /programs/[category] 的路由參數，直接用；
// 沒有 key 時退回 /programs
function toProgramHref(key: string | undefined) {
  return key ? `/programs/${key}` : "/programs";
}

function SectionHeader({
  category,
  title,
  en,
  more,
  moreUrl,
  barColor = "var(--red)",
  titleColor,
}: {
  category?: string;
  title: string;
  en?: string;
  more?: string;
  moreUrl?: string;
  // 標題左邊那條直線的顏色。多話題時外層已有紅色大標，各塊改灰色不搶焦點
  barColor?: string;
  // 標題文字顏色；不給就沿用 CSS 的預設色
  titleColor?: string;
}) {
  return (
    <div
      className={styles.sectionHeader}
      // style={{ display: "flex", gap: "1rem", alignItems: "center" }}
    >
      {category ? (
        <div
          style={{
            background: "#e2231a",
            display: "inline-block",
            lineHeight: 1,
            color: "#fff",
            padding: "8px 12px 6px 12px",
            borderRadius: "4px",
          }}
        >
          {category}
        </div>
      ) : (
        <span
          style={{
            display: "inline-block",
            width: "4px",
            background: barColor,
            borderRadius: "2px",
            alignSelf: "stretch", // 紅線自動撐滿標題高度，標題多高紅線就多長
            minHeight: "24px", // 最矮也有 24px，避免標題很小時紅線太短
          }}
        />
      )}

      <h3
        className="mediaTitle"
        style={titleColor ? { color: titleColor } : undefined}
      >
        {title}
      </h3>
      {en ? <span> {en} </span> : null}

      {/* 更多 */}
      {more ? (
        <a href={moreUrl} target="_blank" className={styles.more}>
          {more}
        </a>
      ) : null}
    </div>
  );
}

function VideoMedia({
  title,
  duration,
  tone,
}: {
  title?: string;
  duration?: string;
  tone: number;
}) {
  return (
    <div className={`${styles.media} ${styles[`tone${tone % 8}`]}`}>
      {duration ? <span className={styles.duration}>{duration}</span> : null}
      {title ? (
        <>
          <span aria-hidden="true" />
          <span className={styles.mediaTitle}>{title}</span>
        </>
      ) : null}
    </div>
  );
}

// 話題區塊：清單資訊 + 話題頁路由用的 slug + 該清單的影片
type TopicCard = PlaylistEntry & {
  slug: string;
  videos: PlaylistVideoItem[];
};

// 話題頁路由參數：後端 entry 自帶 key，就是 /topic/[category] 的參數；沒有 key 才退回數字 id
function toTopicSlug(entry: PlaylistEntry) {
  return entry.key || (entry.id != null ? String(entry.id) : "");
}

function toTopicHref(slug: string) {
  return slug ? `/topic/${slug}` : "/topic";
}

// 影片頁路由是 /topic/{category}/video/{id}（見 app/topic/[category]/video/[id]）。
// 沒有話題 slug 就退回話題列表頁，不要組出不存在的網址
function toTopicVideoHref(slug: string, video: PlaylistVideoItem) {
  const videoKey = watchUrlToSlug(video.watchUrl) ?? video.id;
  return slug ? `/topic/${slug}/video/${videoKey}` : "/topic";
}

// 單一話題區塊：左邊一支大的 + 右邊四支列表。videos 為空時整塊出骨架（載入中）
// showCategory：是否在標題前掛「話題」紅標。多話題時外層已有一個「話題」大標，
// 各塊就傳 false 不要重複
function TopicBlock({
  topic,
  showCategory = true,
  barColor,
  titleColor,
}: {
  topic: TopicCard;
  showCategory?: boolean;
  // 傳給 SectionHeader 的直線顏色；不給就用 SectionHeader 的預設紅色
  barColor?: string;
  // 傳給 SectionHeader 的標題文字顏色；不給就用 CSS 預設色
  titleColor?: string;
}) {
  const [lead, ...rest] = topic.videos;

  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader
          category={showCategory ? "話題" : undefined}
          title={topic.title}
          // en="Topic"
          more="更多影片 ›"
          moreUrl={toTopicHref(topic.slug)}
          barColor={barColor}
          titleColor={titleColor}
        />

        <div className={styles.topicGrid}>
          {lead ? (
            <VideoThumbnail
              isLoaded={true}
              variant={"overlay"}
              title={lead.title}
              src={lead.thumbnailUrl}
              slug={toTopicVideoHref(topic.slug, lead)}
              alt={lead.title}
            />
          ) : (
            <VideoThumbnail isLoaded={false} variant={"overlay"} />
          )}

          <div className={styles.topicList}>
            {lead
              ? rest
                  .slice(0, 4)
                  .map((video) => (
                    <VideoThumbnail
                      key={video.id}
                      isLoaded={true}
                      variant={"row"}
                      title={video.title}
                      src={video.thumbnailUrl}
                      slug={toTopicVideoHref(topic.slug, video)}
                      alt={video.title}
                    />
                  ))
              : Array.from({ length: 4 }).map((_, index) => (
                  <VideoThumbnail
                    key={index}
                    isLoaded={false}
                    variant={"row"}
                  />
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [mainVideos, setMainVideos] = useState<VideoListItem[]>([]); //mainVedios
  const [leadVideo, setLeadVideo] = useState<number | 0>(0); //預設第一隻影片
  const [shorts, setShorts] = useState<ShortsRailItem[]>([]); //shorts
  const [topicSections, setTopicSections] = useState<TopicCard[]>([]); //話題（可能多份清單）
  const [programCards, setProgramCards] = useState<ProgramCard[]>([]); //節目
  const [programTitle, setProgramTitle] = useState("節目"); //節目區標題
  const [live, setLive] = useState<LiveResponse | null>(null); //youtube 直播
  const [congress, setCongress] = useState<CongressLiveResponse | null>(null); //國會直播
  const basePath = API_BASE;
  // 首頁同時有 heroMobile 與桌機 .a1 兩個版位，各自掛一個 VideoPlayer。
  // 兩個 <video> 同時對同一支 HLS 自動播放時，iOS 只允許一個真正呈現畫面，
  // 可見的那個可能被藏起來的搶走 → 全黑（狀態仍是「播放中」）。這裡依斷點
  // （對應 SCSS 的 920px：<920 顯示 heroMobile、≥920 顯示 .a1）只掛「看得到」
  // 的那一個播放器，避免兩個搶播。
  const isMobile = useIsMobile(919);

  // 國會議程：來自 congress-live 的 items
  const agenda: CongressLiveItem[] = congress?.items ?? [];
  // 目前選中的議程：預設抓第一個 LIVE 的議程；點擊其他 LIVE 議程可切換
  const [activeAgenda, setActiveAgenda] = useState(0);
  const currentAgenda = agenda[activeAgenda];
  // 「其他議程」清單是否展開
  const [agendaOpen, setAgendaOpen] = useState(false);
  // 只有後端標記 visible 且有議程時才顯示整個國會直播區塊
  const showCongress = Boolean(congress?.visible) && agenda.length > 0;

  // 取得某份清單的影片項目
  // 走 _lib/topic 的 http（axios instance）版本，理由有二：
  //  1. 原生 fetch 攔不到 _mocks/setupMock 的假資料，後端還沒好的清單永遠是空的
  //  2. 原生 fetch 遇到 404 不會 throw，但接著 res.json() 會炸；這裡由 lib 統一 try/catch
  //     回 null，單一清單掛掉不會讓 Promise.all 整批 reject、把區塊卡在骨架
  async function fetchPlaylistItems(apiUrl: string) {
    const data = await fetchPlaylistItemsApi(apiUrl);
    return data?.items ?? [];
  }

  // 「影音精選」主播放器：取前 limit 隻並補上 hlsUrl（播放器需要）
  async function fetchFeaturedVideos(apiUrl: string, limit = 10) {
    const items = await fetchPlaylistItems(apiUrl);

    return Promise.all(
      items.slice(0, limit).map(async (item) => {
        // 詳情 API 以 watchUrl 內的 slug 為 key，用數字 id 會得到空陣列
        const slug = watchUrlToSlug(item.watchUrl);
        const detailData: BrandVideoResponse | null = slug
          ? await fetch(`${basePath}/video/${slug}`).then((r) => r.json())
          : null;
        // 詳情可能取不到 video（影片下架／回應異常）：補上空 hlsUrl 不讓整頁崩潰
        const rawHlsUrl = detailData?.video?.hlsUrl ?? "";

        return {
          ...item,
          hlsUrl: rawHlsUrl,
          // sprite 縮圖是用 CSS background 顯示（非 fetch），不受 CORS 限制，直接用原始網址
          spriteUrl: detailData?.video?.spriteUrl ?? "",
        };
      }),
    );
  }

  // 取得國會直播議程資料（visible / onplay / items）
  async function fetchCongressLive(apiUrl: string) {
    const res = await fetch(apiUrl);
    const data: CongressLiveResponse = await res.json();
    return data;
  }

  // 短影音區：清單來源同樣是 playlist-list/home 的 shorts 區塊。
  // playlist-items 只回 id/title/publishAt/thumbnailUrl/watchUrl，沒有 ShortsRail
  // hover 播放要用的 hlsUrl，故每支再打一次詳情 API 補齊（同 fetchFeaturedVideos 的做法）。
  async function fetchShortsVideos(apiUrl: string, limit = 10) {
    const items = await fetchPlaylistItems(apiUrl);

    return Promise.all(
      items.slice(0, limit).map(async (item): Promise<ShortsRailItem> => {
        const slug = watchUrlToSlug(item.watchUrl);
        const detailData: BrandVideoResponse | null = slug
          ? await fetch(`${basePath}/video/${slug}`).then((r) => r.json())
          : null;

        return {
          id: item.id,
          title: item.title,
          publishAt: item.publishAt,
          watchUrl: item.watchUrl,
          // 詳情的 posterUrl 與列表的 thumbnailUrl 是同一張圖；詳情取不到就退回列表縮圖，
          // 至少卡片有封面不會黑掉
          posterUrl: detailData?.video?.posterUrl ?? item.thumbnailUrl,
          // 影片下架／回應異常時補空字串，ShortsRail 只是 hover 播不出來，不會整頁崩潰
          hlsUrl: detailData?.video?.hlsUrl ?? "",
        };
      }),
    );
  }

  // 話題卡：topic 區塊底下每份清單各自抓自己的影片
  async function fetchTopicSections(
    entries: PlaylistEntry[],
  ): Promise<TopicCard[]> {
    return Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        slug: toTopicSlug(entry),
        videos: await fetchPlaylistItems(entry.apiUrl),
      })),
    );
  }

  // 節目卡：每份清單用首支影片當封面
  async function fetchProgramCards(entries: PlaylistEntry[]) {
    return Promise.all(
      entries.map(async (entry) => {
        const items = await fetchPlaylistItems(entry.apiUrl);
        return {
          ...entry,
          thumbnailUrl: items[0]?.thumbnailUrl,
          watchUrl: items[0]?.watchUrl,
        };
      }),
    );
  }

  useEffect(() => {
    // 首頁所有區塊都由這一支 playlist-list/home 派生，不再各自打自己的清單 API
    fetchHomeList().then((listData) => {
      // 清單入口拿不到就整頁維持空狀態（各區塊自己的 fallback 已在下方 render 處理）
      if (!listData) return;

      // API 換結構或回空資料時 sections 可能不存在，統一在這裡收斂成空物件，
      // 底下各區塊就只會少渲染，不會整頁崩潰
      const sections = listData.sections ?? {};

      // 影音精選：取 main 區塊的第一份清單
      const featured = sections.main?.items?.[0];
      if (featured) {
        fetchFeaturedVideos(featured.apiUrl).then(setMainVideos);
      }

      // 話題：topic 區塊底下有幾份清單就渲染幾塊
      const topicEntries = sections.topic?.items ?? [];
      if (topicEntries.length > 0) {
        fetchTopicSections(topicEntries).then(setTopicSections);
      }

      // 短影音：取 shorts 區塊的第一份清單
      const shortsEntry = sections.shorts?.items?.[0];
      if (shortsEntry) {
        fetchShortsVideos(shortsEntry.apiUrl).then(setShorts);
      }

      // 節目：取 program 區塊的所有清單（內容與 playlist-list/program 相同，不必再打一次）
      const programSection = sections.program;
      if (programSection) {
        if (programSection.title) {
          setProgramTitle(programSection.title);
        }
        fetchProgramCards(programSection.items ?? []).then(setProgramCards);
      }

      // youtube 直播：取 live 區塊的第一份清單，依其 apiUrl 抓直播資料
      const liveEntry = sections.youtubeLive?.items?.[0];
      if (liveEntry) fetchLive().then(setLive);

      // 國會直播：取 congress 區塊的第一份清單，依其 apiUrl 抓議程資料
      const congressEntry = sections.congress?.items?.[0];
      if (congressEntry) {
        fetchCongressLive(congressEntry.apiUrl).then((data) => {
          setCongress(data);
          // 預設選中直播中的議程：優先 onplay，其次任一非 off，都沒有才退回第一筆
          const onplayIndex = data.items.findIndex(
            (item) => item.status === "onplay",
          );
          const firstLive =
            onplayIndex >= 0
              ? onplayIndex
              : data.items.findIndex((item) => item.status !== "off");
          setActiveAgenda(firstLive >= 0 ? firstLive : 0);
        });
      }
    });
  }, []);

  return (
    <main className={styles.home}>
      {/* m版 hero 視窗 */}
      <section className={styles.heroMobile} aria-label="焦點影音">
        {isMobile ? (
          mainVideos[leadVideo] ? (
            <VideoPlayer
              src={mainVideos[leadVideo].hlsUrl}
              poster={""}
              title={mainVideos[leadVideo].title}
              spriteUrl={mainVideos[leadVideo].spriteUrl}
              allowFullscreen
            />
          ) : (
            // 載入中：先撐 16:9 佔位，避免影片進來時畫面往下跳
            <div className={styles.playerPlaceholder}>載入中...</div>
          )
        ) : null}
        {/* <VideoMedia
            title={mainVideos[leadVideo]?.title}
            // duration={leadVideo?.duration}
            tone={0}
          /> */}
      </section>
      {/* 桌面 */}
      <section className={styles.a1} aria-label="影音精選">
        <div className={styles.wrap}>
          {/* MAIN畫面 */}
          <article className={styles.lead}>
            {!isMobile ? (
              mainVideos[leadVideo] ? (
                <VideoPlayer
                  src={mainVideos[leadVideo].hlsUrl}
                  poster={""}
                  title={mainVideos[leadVideo].title}
                  spriteUrl={mainVideos[leadVideo].spriteUrl}
                  allowFullscreen
                />
              ) : (
                // 載入中：先撐 16:9 佔位，避免影片進來時畫面往下跳
                <div className={styles.playerPlaceholder}>載入中...</div>
              )
            ) : null}
          </article>
          {/* 列表 */}
          <aside className={styles.playlist} aria-label="影音精選列表">
            <div className={styles.playlistHeader}>
              <div className={styles.playlistIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              影音精選
            </div>
            <div className={styles.playlistScroll}>
              {mainVideos.map((video, index) => (
                <a
                  href="#"
                  className={`${styles.playlistItem} ${
                    index === leadVideo ? styles.playlistItemActive : ""
                  }`}
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    setLeadVideo(index);
                  }}
                >
                  <div
                    className={styles.media}
                    style={{ position: "relative" }}
                  >
                    <img
                      src={video.thumbnailUrl}
                      width={116}
                      height={65}
                      alt={video.title}
                      style={{ borderRadius: "10px" }}
                    />
                    {/* 時間長度 */}
                    {/* {video.duration ? (
                      <span className={styles.duration}>{video.duration}</span>
                    ) : null} */}
                  </div>
                  <span>
                    <strong>{video.title}</strong>
                    {/* <small>{video.meta}</small> */}
                  </span>
                </a>
              ))}
            </div>
          </aside>
        </div>
      </section>
      {/* m版 影音清單 */}
      <section className={` ${styles.mobileList}`} aria-label="最新影音">
        {mainVideos.length > 0
          ? mainVideos.map((video, index) => (
              <div onClick={() => setLeadVideo(index)} key={index}>
                <VideoThumbnail
                  isLoaded={true}
                  variant="stacked"
                  title={video.title}
                  src={video.thumbnailUrl}
                  className={styles.videoThumb}
                />
              </div>
            ))
          : Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <VideoThumbnail
                  isLoaded={false}
                  variant="stacked"
                  className={styles.videoThumb}
                />
              </div>
            ))}
        {/* {mainVideos.map((video, index) => (
          <div onClick={() => setLeadVideo(index)} key={index}>
            <VideoThumbnail
              variant="stacked"
              title={video.title}
              src={video.thumbnailUrl}
              className={styles.videoThumb}
            />
          </div>
        ))} */}
      </section>

      {/* 直播 */}
      {live && live.visible && live.items.length > 0 && (
        <section className={styles.section}>
          <div className={styles.wrap}>
            <SectionHeader title="直播" en="Live" />
            <div className={styles.liveGrid}>
              {/* iframe 外面要包一層 .livePlayer：.liveGrid 有 align-items: center，
                  iframe 直接當 grid item 時算不到高度（同國會直播的 .parliamentPlayer） */}
              <div className={styles.livePlayer}>
                <iframe
                  key={live.items[0].url}
                  className={styles.parliamentFrame}
                  // autoplay 必須配 mute，否則瀏覽器會擋掉自動播放。
                  src={`${live.items[0].url}${live.items[0].url.includes("?") ? "&" : "?"}autoplay=1&mute=1&fs=1&playsinline=1`}
                  title={live.items[0].name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              </div>

              <div className={styles.liveInfo}>
                <span className={styles.liveStatus}>
                  <span aria-hidden="true" />
                  LIVE · 直播進行中
                </span>
                <h3>{live.items[0].name}</h3>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 話題：後端 topic 區塊有幾份清單就出幾塊；還沒載完先出一塊骨架 */}
      {topicSections.length === 0 && (
        <TopicBlock
          topic={{ title: "話題", apiUrl: "", slug: "", videos: [] }}
        />
      )}
      {topicSections.length > 1 && (
        <section className={`${styles.section} ${styles.topicGroup}`}>
          <div className={styles.wrap}>
            <SectionHeader title="話題" en="Topic" />
          </div>
          {/* 多話題時外層已經有一個「話題」大標，各塊自己的上分隔線由 .topicGroup 移除 */}
          {topicSections.map((topic) => (
            <TopicBlock
              key={topic.id ?? topic.title}
              topic={topic}
              showCategory={false}
              barColor="var(--text-mute)"
            />
          ))}
        </section>
      )}
      {topicSections.length === 1 &&
        topicSections.map((topic) => (
          <TopicBlock key={topic.id ?? topic.title} topic={topic} />
        ))}

      {/*短影音 shorts：載入中顯示提示，載入完但為空則整段隱藏 */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <SectionHeader title="短影音" en="Shorts" />
          <ShortsRail items={shorts} />
        </div>
      </section>

      {/* 節目 */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <SectionHeader title={programTitle} en="Programs" />
          {programCards.length > 0 ? (
            <div className={styles.programGrid}>
              {programCards.map((program) => (
                <VideoThumbnail
                  key={program.id}
                  isLoaded={true}
                  variant={"overlay"}
                  title={program.title}
                  meta={`${program.count} 部影片`}
                  src={program.thumbnailUrl}
                  slug={toProgramHref(program.key)}
                  alt={program.title}
                />
              ))}
            </div>
          ) : (
            <div className={styles.programGrid}>
              {Array.from({ length: 8 }).map((_, index) => (
                <VideoThumbnail
                  key={index}
                  isLoaded={false}
                  variant={"overlay"}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 國會直播：congress-live 無資料（visible=false 或 items 為空）時整個區塊不顯示 */}
      {showCongress && (
        <section className={styles.section}>
          <div className={styles.wrap}>
            <SectionHeader
              title="國會直播"
              en="Parliament"
              more="更多影片 ›"
              moreUrl={congress?.moreUrl ?? "https://news.ltn.com.tw/video/ly"}
            />

            <div className={styles.parliamentGrid}>
              {/* 直播畫面 */}
              <div className={styles.parliamentPlayer}>
                {/* congress-live 的 url 是 YouTube embed 網址（youtube.com/embed/xxx，
                    已帶 autoplay=1&mute=1），不是 HLS／mp4 檔，餵給 <video> 播不出來，
                    只能用 iframe 嵌入 */}
                {currentAgenda?.url ? (
                  <iframe
                    key={currentAgenda.url}
                    className={styles.parliamentFrame}
                    src={`${currentAgenda.url}&fs=1&playsinline=1`}
                    title={currentAgenda.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <VideoMedia
                    title={currentAgenda?.name ?? "目前議程 Live"}
                    tone={7}
                  />
                )}
                {currentAgenda && currentAgenda.status !== "off" ? (
                  <span className={styles.liveBadge}>LIVE</span>
                ) : null}
              </div>
              {/* 直播選項：桌機完整列出；行動版收合，只顯示目前議程 + 「其他議程」展開 */}
              <div
                className={`${styles.agenda} ${
                  agendaOpen ? styles.agendaExpanded : ""
                }`}
              >
                <div className={styles.agendaHeader}>
                  目前議程 <span>Live</span>
                </div>
                {agenda.map((item, index) => {
                  // 後端有 onplay(PLAY) 與 p_live(LIVE) 兩種直播狀態，只有 off 才不可點選
                  const isLive = item.status !== "off";
                  return (
                    <a
                      href="#"
                      className={`${styles.agendaItem} ${
                        index === activeAgenda ? styles.agendaItemActive : ""
                      } ${isLive ? "" : styles.agendaItemDisabled}`}
                      key={item.id}
                      aria-disabled={!isLive}
                      onClick={(e) => {
                        e.preventDefault();
                        // 只有直播中的議程可點選播放
                        if (isLive) {
                          setActiveAgenda(index);
                          setAgendaOpen(false);
                        }
                      }}
                    >
                      <span>{item.name}</span>
                      <strong
                        className={
                          isLive ? styles.agendaLive : styles.agendaOff
                        }
                      >
                        {item.statusText}
                      </strong>
                    </a>
                  );
                })}

                {/* 展開 / 收合切換（僅行動版顯示） */}
                {agenda.length > 1 ? (
                  <button
                    type="button"
                    className={styles.agendaToggle}
                    onClick={() => setAgendaOpen((prev) => !prev)}
                    aria-expanded={agendaOpen}
                  >
                    {agendaOpen ? "收合" : "其他議程"}
                    <svg
                      className={`${styles.agendaChevron} ${
                        agendaOpen ? styles.agendaChevronOpen : ""
                      }`}
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
