import Image from "next/image";
import styles from "./VideoThumbnail.module.scss";
import Link from "next/link";

export default function VideoPlayer({
  variant = "overlay",
  title,
  duration,
  meta,
  slug = "#",
  src = "https://img.youtube.com/vi/cqlHFJMg_0A/mqdefault.jpg",
  alt = "2026 九合一選舉",
  fill = false,
  className,
}: {
  variant: "overlay" | "stacked";
  title: string;
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
      className={[styles.topicLead, fill ? styles.fill : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={variant === "overlay" ? styles.Image : styles.topicMini}>
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: "cover" }}
          sizes="(max-width: 768px) 100vw,600px"
        />
        {duration ? <span className={styles.duration}>{duration}</span> : null}
        {variant === "overlay" && (title || meta) && (
          <>
            <span className={styles.gradient} aria-hidden="true" />
            <span className={styles.overlayContent}>
              {title ? (
                <span className={styles.mediaTitle}>{title}</span>
              ) : null}
              {meta ? <span className={styles.meta}>{meta}</span> : null}
            </span>
          </>
        )}
      </div>
      {title && variant === "stacked" && (
        <strong className={styles.topicTitle}>{title}</strong>
      )}
    </Link>
  );
}
