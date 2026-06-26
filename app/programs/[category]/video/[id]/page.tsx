import Link from "next/link";
import type { Metadata } from "next";
import VideoPlayer from "@/app/_components/VideoPlayer/VideoPlayer";
import styles from "@/styles/videopage.module.scss";
import Crumb from "@/app/_components/Crumb/Crumb";
import { notFound } from "next/navigation";
import {
  buildVideoMetadata,
  fallbackVideo,
  getVideo,
  getVideoIds,
  toProxiedHls,
} from "@/app/_lib/videoDetail";

// 靜態匯出：列出要預先產生的影片 id（category 由上層 layout 提供）
export async function generateStaticParams() {
  const ids = await getVideoIds();
  return ids.map((id) => ({ id }));
}

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
//  設定meta
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getVideo(id);
  if (!data?.video) notFound();
  return buildVideoMetadata(data);
}

function toLocalVideoHref(category: string, id: string | number) {
  return `/programs/${category}/video/${id}`;
}

function ShareIcon({ type }: { type: "line" | "facebook" | "x" }) {
  if (type === "line") {
    return (
      <img
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
  if (!data?.video) notFound();
  const video = data.video;
  const related = data.related ?? [];
  const currentUrl = data.seo?.canonicalUrl || video.canonicalUrl || "#";

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
                  <img
                    src={item.thumbnailUrl || fallbackVideo.posterUrl}
                    alt={item.title}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
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
