"use client";
import styles from "./page.module.scss";
import { useEffect, useState } from "react";
import VideoPlayer from "./_components/VideoPlayer/VideoPlayer";
import Image from "next/image";
import VideoThumbnail from "./_components/VideoThumbnail/VideoThumbnail";
import ShortsRail from "./_components/ShortsRail/ShortsRail";
import type { ShortsApiResponse, ShortsRailItem } from "./_interfaces/shorts";
import type {
  VideoListItem,
  VideoListResponse,
} from "./_interfaces/videoArticle";
import type { BrandVideoResponse } from "./_interfaces/BrandVideo";

const topicVideos = [
  ["12:48", "2026 九合一選舉最新民調出爐 六都選情激烈"],
  ["01:56", "2026 選戰關鍵觀察：年輕族群成最大變數"],
  ["02:08", "地方派系整合進度一次看 藍綠白布局解析"],
  ["03:22", "六都市長候選人政見對決 重點懶人包"],
  ["04:10", "選舉公報數位化 首投族最關心的三件事"],
];

const programs = [
  ["政面交鋒", "每週一更新 · EP.124", "politics-faceoff"],
  ["自由說新聞", "每週一更新 · EP.88", "liberty-talks"],
  ["自由爆新聞", "每週二更新 · EP.96", "liberty-breaking"],
  ["新聞360", "每週三更新 · EP.56", "news-360"],
  ["官我什麼事", "每週四更新 · EP.42", "gov-matters"],
  ["台海情勢簡報室", "每週五更新 · EP.30", "strait-brief"],
  ["娛樂後視鏡", "每週六更新 · EP.18", "ent-rearview"],
  ["名人開講", "每週一更新 · EP.110", "celeb-talks"],
];

const agenda = [
  ["院會", "LIVE", true],
  ["外交及國防", "OFF", false],
  ["內政", "OFF", false],
  ["經濟", "OFF", false],
  ["教育及文化", "LIVE", true],
  ["交通", "OFF", false],
  ["司法及法制", "OFF", false],
  ["社福及衛環", "LIVE", true],
] as const;

function SectionHeader({
  category,
  title,
  en,
  more,
}: {
  category?: string;
  title: string;
  en?: string;
  more?: string;
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
            color: "#fff",
            padding: "6px 12px 6px 12px",
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
            minHeight: "24px",
          }}
        />
      )}

      <h3 className="mediaTitle">{title}</h3>
      {en ? <span> {en} </span> : null}

      {/* 更多 */}
      {more ? (
        <a href="#" className={styles.more}>
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
  const basePath = "https://video.ltn.com.tw/brand/api";

  async function fetchMainVideo() {
    const url = `${basePath}/list`;
    const limit = 7;
    const res = await fetch(url);
    let data: VideoListResponse = await res.json();

    const items = await Promise.all(
      data.items.slice(0, limit).map(async (item) => {
        const detailUrl = `${basePath}/video/${item.id}`;
        const detailRes = await fetch(detailUrl);
        const detailData: BrandVideoResponse = await detailRes.json();

        return {
          ...item,
          // 換成同源 proxy 路徑，繞過來源未開 CORS 的限制（對應 next.config 的 /hls rewrite）
          hlsUrl: detailData.video.hlsUrl.replace(
            "https://video.ltn.com.tw/media/",
            "/hls/",
          ),
        };
      }),
    );

    return {
      data: {
        ...data,
        items,
      },
    };
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

    fetchMainVideo().then((res) => {
      console.log(res.data.items);
      setMainVideos(res.data.items);
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
                    <Image
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
      <section
        className={`${styles.wrap} ${styles.mobileList}`}
        aria-label="最新影音"
      >
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
            title="2026 九合一選舉"
            // en="Topic"
            more="更多 ›"
          />
          <div className={styles.topicGrid}>
            <VideoThumbnail
              variant={"overlay"}
              title={"2026 九合一選舉"}
              duration="12:48"
            />
            <div className={styles.topicList}>
              {topicVideos.slice(1).map(([duration, title], index) => (
                <VideoThumbnail
                  key={index}
                  variant={"stacked"}
                  title={title}
                  duration={duration}
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
          <SectionHeader title="節目" en="Programs" />
          <div className={styles.programGrid}>
            {programs.map(([title, meta, slug], index) => (
              <VideoThumbnail
                key={index}
                variant={"overlay"}
                title={title}
                meta={meta}
              />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
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
                {/* <PlayIcon /> */}
                觀看直播
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* 國會直播 */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <SectionHeader title="國會直播" en="Parliament" />
          <div className={styles.parliamentGrid}>
            <a href="#" className={styles.parliamentPlayer}>
              <VideoMedia title="目前議程 Live" tone={7} />
              <span className={styles.liveBadge}>LIVE</span>
            </a>
            <div className={styles.agenda}>
              <div className={styles.agendaHeader}>
                目前議程 <span>Live</span>
              </div>
              {agenda.map(([name, state, isLive], index) => (
                <a
                  href="#"
                  className={`${styles.agendaItem} ${
                    index === 0 ? styles.agendaItemActive : ""
                  }`}
                  key={name}
                >
                  <span>{name}</span>
                  <strong
                    className={isLive ? styles.agendaLive : styles.agendaOff}
                  >
                    {state}
                  </strong>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
