// 播放器走 client-only 版（ssr: false）：它的畫面依賴 window 與自動播放結果，
// 在 server 渲染會先畫出猜錯的一幀、JS 再更正，造成控制列閃動。詳見 VideoPlayerClient。
import VideoPlayer from "@/app/_components/VideoPlayer/VideoPlayerClient";
import styles from "@/styles/videopage.module.scss";
import LiveCrumb from "@/app/_components/Crumb/LiveCrumb";
import ExpandableContent from "@/app/_components/VideoDetail/ExpandableContent";
import RelatedVideos from "@/app/_components/RelatedVideos/RelatedVideos";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";
import type { PlaylistVideoItem } from "@/app/_interfaces/playlist";
import { buildVideoCrumbs } from "@/app/_lib/videoDetail";

// 影片詳細頁的共用畫面。
// 兩個 server 路由（programs / topic，build 時預抓）與 client fallback 外殼
// （新影片 runtime 抓）都渲染這個元件，避免版面重複。純渲染、不自己抓資料。
export interface VideoDetailProps {
  data: BrandVideoResponse; // 影片詳情（含 video / share / seo / breadcrumb）
  videoBasePath: string; // 相關影片連結前綴，如 /programs/{category}/video 或 /topic/video
  // 「你還會想看」的 related 後備清單（已排除自己）。第 1 頁改由 client 端自己抓，
  // server 不預帶，避免其他影片標題進到 SSR HTML 影響本頁 SEO；後備只在 fallback 時用。
  relatedFallback: PlaylistVideoItem[];
  // 影片 slug。build 時預抓的路由（programs / topic）帶入後，client 端會重抓
  // 最新麵包屑覆蓋 build 時烤死的內容；fallback 外殼資料已是 runtime 最新，可省略。
  videoSlug?: string;
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

export default function VideoDetail({
  data,
  videoBasePath,
  relatedFallback,
  videoSlug,
}: VideoDetailProps) {
  const video = data.video;
  const playlistKey = data.playlist?.key ?? "";
  // 從 topic 進來（videoBasePath 為 /topic/video）時，麵包屑只顯示到「話題」；
  // 從最新進來（/latest/video）時只顯示到「最新」。
  const isTopic = videoBasePath.startsWith("/topic");
  const isLatest = videoBasePath.startsWith("/latest");
  const crumbs = buildVideoCrumbs(data, { isTopic, isLatest });

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        {/* 麵包屑：build 時的 crumbs 當初值，client 端再以最新 API 覆蓋 */}
        <LiveCrumb
          slug={videoSlug}
          initial={crumbs}
          isTopic={isTopic}
          isLatest={isLatest}
        />

        {/* 主要影片 */}
        <section className={styles.playerSection} aria-label="影片播放器">
          <VideoPlayer
            src={video.hlsUrl}
            //poster={video.posterUrl}//想要自動撥放 就不要傳入poster
            poster=""
            spriteUrl={video.spriteUrl}
            width="100%"
            allowFullscreen
          />
        </section>

        <section className={styles.detailGrid}>
          <article className={styles.article}>
            <header className={styles.articleHeader}>
              <p className={styles.meta}>{video.publishAt}</p>
              <h1>{video.title}</h1>
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

            {video.newsUrl ? (
              <a className={styles.newsLink} href={video.newsUrl}>
                新聞超連結：前往新聞文章頁
              </a>
            ) : null}

            <ExpandableContent
              html={video.descriptionHtml || `<p>${video.description}</p>`}
            />
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

          <RelatedVideos
            videoBasePath={videoBasePath}
            playlistKey={playlistKey}
            currentVideoId={video.id}
            relatedFallback={relatedFallback}
          />
        </section>
      </div>
    </main>
  );
}
