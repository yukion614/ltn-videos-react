"use client";
import styles from "./page.module.scss";
import { useEffect, useState } from "react";
import VideoPlayer from "./_components/VideoPlayer/VideoPlayer";
import VideoThumbnail from "./_components/VideoThumbnail/VideoThumbnail";
import ShortsRail from "./_components/ShortsRail/ShortsRail";
import type { ShortsApiResponse, ShortsRailItem } from "./_interfaces/shorts";
import type { VideoListItem } from "./_interfaces/videoArticle";
import type { BrandVideoResponse } from "./_interfaces/BrandVideo";
import type {
  PlaylistListResponse,
  PlaylistItemsResponse,
  PlaylistVideoItem,
  PlaylistEntry,
  ProgramListResponse,
  CongressLiveResponse,
  CongressLiveItem,
} from "./_interfaces/playlist";
import { programMeta } from "./_lib/programMeta";
import { toProxiedHls, watchUrlToSlug } from "./_lib/videoDetail";

// 節目卡片：清單資訊 + 首支影片的封面與連結
type ProgramCard = PlaylistEntry & {
  thumbnailUrl?: string;
  watchUrl?: string;
};

// 依節目標題到 programMeta 找出 name === title 的那筆，取其 slug 組出 /programs/[slug] 連結；
// 找不到時退回 /programs
function toProgramHref(key: string | undefined, title: string) {
  const slug = programMeta.find((program) => program.name === title)?.key;
  // return slug ? `/programs/${slug}` : "/programs";
  if (!slug) return "/programs";

  const params = new URLSearchParams();

  if (key) {
    params.set("key", key);
  }

  return params.toString()
    ? `/programs/${slug}?${params.toString()}`
    : `/programs/${slug}`;
}

function SectionHeader({
  category,
  title,
  en,
  more,
  moreUrl,
}: {
  category?: string;
  title: string;
  en?: string;
  more?: string;
  moreUrl?: string;
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
            background: "#e2231a",
            borderRadius: "2px",
            alignSelf: "stretch", // 紅線自動撐滿標題高度，標題多高紅線就多長
            minHeight: "24px", // 最矮也有 24px，避免標題很小時紅線太短
          }}
        />
      )}

      <h3 className="mediaTitle">{title}</h3>
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
  compact = false,
}: {
  title?: string;
  duration?: string;
  tone: number;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.media} ${styles[`tone${tone % 8}`]}`}>
      {duration ? <span className={styles.duration}>{duration}</span> : null}
      {title ? (
        <>
          <span className={styles.gradient} aria-hidden="true" />
          <span className={styles.mediaTitle}>{title}</span>
        </>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [mainVideos, setMainVideos] = useState<VideoListItem[]>([]); //mainVedios
  const [leadVideo, setLeadVideo] = useState<number | 0>(0); //預設第一隻影片
  const [shorts, setShorts] = useState<ShortsRailItem[]>([]); //shorts
  const [topicVideos, setTopicVideos] = useState<PlaylistVideoItem[]>([]); //話題影片
  const [topicTitle, setTopicTitle] = useState("話題"); //話題標題
  const [programCards, setProgramCards] = useState<ProgramCard[]>([]); //節目
  const [programTitle, setProgramTitle] = useState("節目"); //節目區標題
  const [congress, setCongress] = useState<CongressLiveResponse | null>(null); //國會直播
  const basePath = "https://video.ltn.com.tw/brand/api";

  // 國會議程：來自 congress-live 的 items
  const agenda: CongressLiveItem[] = congress?.items ?? [];
  // 目前選中的議程：預設抓第一個 LIVE 的議程；點擊其他 LIVE 議程可切換
  const [activeAgenda, setActiveAgenda] = useState(0);
  const currentAgenda = agenda[activeAgenda];
  // 「其他議程」清單是否展開
  const [agendaOpen, setAgendaOpen] = useState(false);
  // 只有後端標記 visible 且有議程時才顯示整個國會直播區塊
  const showCongress = Boolean(congress?.visible) && agenda.length > 0;

  // 抓首頁播放清單列表（首頁所有區塊的入口）
  async function fetchPlaylistList() {
    const res = await fetch(`${basePath}/playlist-list/home`);
    const data: PlaylistListResponse = await res.json();
    return data;
  }

  // 抓節目清單（節目區專用，扁平 items）
  async function fetchProgramList() {
    const res = await fetch(`${basePath}/playlist-list/program`);
    const data: ProgramListResponse = await res.json();
    return data;
  }

  // 取得某份清單的影片項目
  async function fetchPlaylistItems(apiUrl: string) {
    const res = await fetch(apiUrl);
    const data: PlaylistItemsResponse = await res.json();
    return data.items;
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
          // 上游只對 *.ltn.com.tw 開 CORS：正式環境直接用原始網址；
          // 本機 dev 才換成同源 proxy 路徑（對應 next.config 的 /hls rewrite）
          hlsUrl: toProxiedHls(rawHlsUrl) ?? "",
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

  async function fetchShorts(moreId = null) {
    const endpoint = moreId ? `/shorts/${moreId}` : "/shorts";
    const url = `${basePath}${endpoint}`;
    const res = await fetch(url);
    const data: ShortsApiResponse = await res.json();
    return { data };
  }

  useEffect(() => {
    fetchShorts().then((res) => {
      if (res.data?.items) setShorts(res.data.items);
    });

    // 抓一次播放清單列表，分別供「影音精選」主播放器與「話題」區使用
    fetchPlaylistList().then((listData) => {
      // 影音精選：取 main 區塊的第一份清單
      const featured = listData.sections.main?.items[0];
      if (featured) {
        fetchFeaturedVideos(featured.apiUrl).then(setMainVideos);
      }

      // 話題：取 topic 區塊的第一份清單
      const topicEntry = listData.sections.topic?.items[0];
      if (topicEntry) {
        setTopicTitle(topicEntry.title);
        fetchPlaylistItems(topicEntry.apiUrl).then(setTopicVideos);
      }

      // 國會直播：取 congress 區塊的第一份清單，依其 apiUrl 抓議程資料
      const congressEntry = listData.sections.congress?.items[0];
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

    // 節目：改用 playlist-list/program，每份清單用首支影片當封面
    fetchProgramList().then((programData) => {
      if (programData.title) {
        setProgramTitle(programData.title);
      }
      const programEntries = programData.items ?? [];
      Promise.all(
        programEntries.map(async (entry) => {
          const items = await fetchPlaylistItems(entry.apiUrl);
          return {
            ...entry,
            thumbnailUrl: items[0]?.thumbnailUrl,
            watchUrl: items[0]?.watchUrl,
          };
        }),
      ).then(setProgramCards);
    });
  }, []);

  useEffect(() => {
    console.log(mainVideos);
  }, [mainVideos]);

  return (
    <main className={styles.home}>
      {/* m版 hero 視窗 */}
      <section className={styles.heroMobile} aria-label="焦點影音">
        {mainVideos[leadVideo] ? (
          <VideoPlayer
            src={mainVideos[leadVideo].hlsUrl}
            poster={""}
            title={mainVideos[leadVideo].title}
          />
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
            {mainVideos[leadVideo] ? (
              <VideoPlayer
                src={mainVideos[leadVideo].hlsUrl}
                poster={""}
                title={mainVideos[leadVideo].title}
              />
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
                  onClick={() => setLeadVideo(index)}
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
        {mainVideos.map((video, index) => (
          <div onClick={() => setLeadVideo(index)} key={index}>
            <VideoThumbnail
              variant="stacked"
              title={video.title}
              src={video.thumbnailUrl}
              className={styles.videoThumb}
            />
          </div>
        ))}
      </section>
      {/* 話題 */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <SectionHeader
            category="話題"
            title={topicTitle}
            // en="Topic"
            more="更多影片 ›"
            moreUrl="/topic"
          />
          <div className={styles.topicGrid}>
            {topicVideos[0] ? (
              <VideoThumbnail
                variant={"overlay"}
                title={topicVideos[0].title}
                src={topicVideos[0].thumbnailUrl}
                slug={`/topic/video/${watchUrlToSlug(topicVideos[0].watchUrl) ?? topicVideos[0].id}`}
                alt={topicVideos[0].title}
              />
            ) : null}
            <div className={styles.topicList}>
              {topicVideos.slice(1, 5).map((video) => (
                <VideoThumbnail
                  key={video.id}
                  variant={"row"}
                  title={video.title}
                  src={video.thumbnailUrl}
                  slug={`/topic/video/${watchUrlToSlug(video.watchUrl) ?? video.id}`}
                  alt={video.title}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/*短影音 shorts */}
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
          <div className={styles.programGrid}>
            {programCards.map((program) => (
              <VideoThumbnail
                key={program.id}
                variant={"overlay"}
                title={program.title}
                meta={`${program.count} 部影片`}
                src={program.thumbnailUrl}
                slug={toProgramHref(program.key, program.title)}
                alt={program.title}
              />
            ))}
          </div>
        </div>
      </section>
      {/* 直播 */}
      {/* <section className={styles.section}>
        <div className={styles.wrap}>
          <SectionHeader title="直播" en="Live" />
          <div className={styles.liveGrid}>
            <a href="#" className={styles.livePlayer}>
              <VideoMedia
                title="藍白別再擋！台灣恐跌出美國優先名單！賴清德親上火線回應軍購、高市早苗大勝、台美關係"
                tone={6}
              />
              <span className={styles.liveBadge}>LIVE</span>
            </a>
            <div className={styles.liveInfo}>
              <span className={styles.liveStatus}>
                <span aria-hidden="true" />
                LIVE · 直播進行中
              </span>
              <h3>
                藍白別再擋！台灣恐跌出美國優先名單！賴清德親上火線回應軍購、高市早苗大勝、台美關係
              </h3>
              <a href="#" className={styles.watchButton}>
               <PlayIcon /> 
                觀看直播
              </a>
            </div>
          </div>
        </div>
      </section> */}
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
                {currentAgenda?.url ? (
                  <VideoPlayer
                    key={currentAgenda.url}
                    src={currentAgenda.url}
                    poster=""
                    title={currentAgenda.name}
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
