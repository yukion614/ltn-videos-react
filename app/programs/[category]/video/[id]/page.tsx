import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import VideoPlayer from "@/app/_components/VideoPlayer/VideoPlayer";
import type {
  BrandVideoResponse,
  VideoRelatedItem,
} from "@/app/_interfaces/BrandVideo";
import styles from "@/styles/videopage.module.scss";
import Crumb from "@/app/_components/Crumb/Crumb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "影片詳細頁 | 自由影音",
  description: "自由影音影片詳細頁",
};

const basePath = "https://video.ltn.com.tw/brand/api";

const fallbackVideo: BrandVideoResponse["video"] = {
  id: 0,
  title: "颱風山陀兒逼近！東部風強雨驟慎防災害",
  publishAt: "2026/06/17 12:00",
  publishedAtiso: "2026-06-17T12:00:00+08:00",
  description:
    "中央氣象署最新資料指出，颱風山陀兒持續朝台灣東部海域逐步逼近，東部、東南部地區須嚴防強風暴雨。",
  descriptionHtml:
    "<p>中央氣象署最新資料指出，颱風山陀兒持續朝台灣東部海域逐步逼近，預估今晚至明日清晨影響最劇，東部、東南部地區須嚴防強風暴雨。</p><p>請民眾避免前往山區及海邊活動，並隨時注意最新警報資訊。</p>",
  summary:
    "颱風山陀兒持續朝台灣東部海域逐步逼近，東部、東南部地區須嚴防強風暴雨。",
  orientation: "horizontal",
  canonicalUrl: "/brand/video/0",
  posterUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/maxresdefault.jpg",
  hlsUrl: "",
  spriteUrl: "",
};

const fallbackRelated: VideoRelatedItem[] = [
  {
    id: 1,
    title: "賴清德：台灣會持續走在民主與自由的道路上",
    publishAt: "政治頻道 · 45萬次觀看",
    thumbnailUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/mqdefault.jpg",
    articleUrl: "/brand/video/1",
  },
  {
    id: 2,
    title: "台北收盤漲 300 點 台積電重返千元大關",
    publishAt: "財富自由 · 67萬次觀看",
    thumbnailUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/mqdefault.jpg",
    articleUrl: "/brand/video/2",
  },
  {
    id: 3,
    title: "藍綠白布局分析與最新動向解析",
    publishAt: "政治頻道 · 9萬次觀看",
    thumbnailUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/mqdefault.jpg",
    articleUrl: "/brand/video/3",
  },
  {
    id: 4,
    title: "颱風季來臨注意事項 保命指南看這裡",
    publishAt: "生活頻道 · 6萬次觀看",
    thumbnailUrl: "https://img.youtube.com/vi/cqlHFJMg_0A/mqdefault.jpg",
    articleUrl: "/brand/video/4",
  },
];

const crumbs = [
  {
    href: "/",
    label: "首頁",
  },
  {
    href: "/topic",
    label: "節目",
  },
  {
    href: "/celebrity-talk",
    label: "名人開講",
  },
  {
    href: "/",
    label: "影片標題",
  },
];

async function getVideo(id: string) {
  try {
    const res = await fetch(`${basePath}/video/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as BrandVideoResponse;
  } catch {
    return null;
  }
}

function toProxiedHls(url?: string) {
  if (!url) {
    return undefined;
  }

  return url.replace("https://video.ltn.com.tw/media/", "/hls/");
}

function toLocalVideoHref(category: string, id: string | number) {
  return `/programs/${category}/video/${id}`;
}

function ShareIcon({ type }: { type: "line" | "facebook" | "x" }) {
  if (type === "line") {
    return (
      <Image
        src="/line.jpg"
        height="35"
        width="35"
        alt="分享到line"
        style={{ borderRadius: "50%" }}
      />
    );
  }

  if (type === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.9 2H22l-7.3 8.3L23 22h-6.6l-5.2-6.8L5.3 22H2l7.8-8.9L1.5 2h6.8l4.7 6.2L18.9 2z" />
    </svg>
  );
}

function ShareButton({
  label,
  href,
  type,
}: {
  label: string;
  href?: string;
  type: "line" | "facebook" | "x";
}) {
  return (
    <a
      className={`${styles.shareButton} ${styles[type]}`}
      href={href || "#"}
      aria-label={label}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
    >
      <ShareIcon type={type} />
    </a>
  );
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  const data = await getVideo(id);
  const video = data?.video ?? fallbackVideo;
  const related = data?.related?.length ? data.related : fallbackRelated;
  const currentUrl = data?.seo?.canonicalUrl || video.canonicalUrl || "#";

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        {/* 麵包屑 */}
        <Crumb crumbs={crumbs} />
        {/* 主要影片 */}
        <section className={styles.playerSection} aria-label="影片播放器">
          <VideoPlayer
            src={toProxiedHls(video.hlsUrl)}
            poster={video.posterUrl}
            width="100%"
          />
        </section>

        <section className={styles.detailGrid}>
          <article className={styles.article}>
            <header className={styles.articleHeader}>
              <p className={styles.meta}>{video.publishAt}</p>
              <h1>{video.title}</h1>
              <div className={styles.tags} aria-label="影片標籤">
                <span>#自由影音</span>
                <span>#節目</span>
                <span>#即時影音</span>
              </div>
              <div className={styles.mobileShare}>
                <ShareButton
                  label="分享到 LINE"
                  href={data?.share?.line}
                  type="line"
                />
                <ShareButton
                  label="分享到 Facebook"
                  href={data?.share?.facebook}
                  type="facebook"
                />
                <ShareButton
                  label="分享到 X"
                  href={data?.share?.twitter}
                  type="x"
                />
              </div>
            </header>

            <a className={styles.newsLink} href={currentUrl}>
              新聞超連結：前往原始影片頁
            </a>

            <div
              className={styles.articleContent}
              dangerouslySetInnerHTML={{
                __html: video.descriptionHtml || `<p>${video.description}</p>`,
              }}
            />

            {/* <div className={styles.pageNav} aria-label="上下支影片">
              {data?.navigation?.prev ? (
                <Link href={`/brand/video/${data.navigation.prev.id}`}>
                  上一支：{data.navigation.prev.title}
                </Link>
              ) : null}
              {data?.navigation?.next ? (
                <Link href={`/brand/video/${data.navigation.next.id}`}>
                  下一支：{data.navigation.next.title}
                </Link>
              ) : null}
            </div> */}
          </article>

          <aside className={styles.shareRail} aria-label="分享影片">
            <ShareButton
              label="分享到 LINE"
              href={data?.share?.line}
              type="line"
            />
            <ShareButton
              label="分享到 Facebook"
              href={data?.share?.facebook}
              type="facebook"
            />
            <ShareButton
              label="分享到 X"
              href={data?.share?.twitter}
              type="x"
            />
          </aside>
        </section>

        <section className={styles.recommend} aria-labelledby="recommend-title">
          <h2 id="recommend-title" className={styles.title}>
            你還會想看
          </h2>

          <div className={styles.recommendGrid}>
            {related.slice(0, 8).map((item) => (
              <Link
                className={styles.recommendCard}
                href={toLocalVideoHref(category, item.id)}
                key={item.id}
              >
                <span className={styles.thumb}>
                  <Image
                    src={item.thumbnailUrl || fallbackVideo.posterUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </span>
                <strong>{item.title}</strong>
                <small>{item.publishAt}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
