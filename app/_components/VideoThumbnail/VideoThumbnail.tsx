import styles from "./VideoThumbnail.module.scss";
import Link from "next/link";

export default function VideoPlayer({
  isLoaded = false,
  variant = "overlay",
  title,
  duration,
  meta,
  slug = "#",
  src = "https://img.youtube.com/vi/cqlHFJMg_0A/mqdefault.jpg",
  alt = "標題",
  fill = false,
  className,
}: {
  isLoaded: boolean;
  variant: "overlay" | "stacked" | "row";
  title?: string;
  duration?: string;
  meta?: string;
  slug?: string; //網址連結
  src?: string; //圖片連結
  alt?: string;
  /** 讓圖片填滿父層格子高度（用於跨多列的大圖／中圖） */
  fill?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={slug}
      // slug 多半指向影片詳情頁（ISR）；prefetch 會讓每個縮圖連結都在伺服器
      // 渲染一次，一頁縮圖很多、成本不划算，關掉。
      prefetch={false}
      className={[
        variant === "row" ? styles.topicRow : styles.topicLead,
        fill ? styles.fill : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={variant === "overlay" ? styles.Image : styles.topicMini}>
        {isLoaded ? (
          <img
            src={src}
            alt={alt}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "100%",
              backgroundColor: "#D0D0D0",
            }}
          >
            載入中...
          </div>
        )}

        {duration ? <span className={styles.duration}>{duration}</span> : null}
        {variant === "overlay" && (title || meta) && (
          <>
            {isLoaded ? (
              <span className={styles.gradient} aria-hidden="true" />
            ) : null}

            <span className={styles.overlayContent}>
              {isLoaded && title ? (
                <span className={styles.mediaTitle}>{title}</span>
              ) : null}
              {isLoaded && meta ? (
                <span className={styles.meta}>{meta}</span>
              ) : null}
            </span>
          </>
        )}
      </div>
      {isLoaded && title && variant !== "overlay" ? (
        <strong className={styles.topicTitle}>{title}</strong>
      ) : null}
    </Link>
  );
}
