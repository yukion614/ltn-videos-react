import styles from "./NotFoundPanel.module.scss";

type NotFoundPanelProps = {
  className?: string;
};

export default function NotFoundPanel({ className = "" }: NotFoundPanelProps) {
  return (
    <section
      className={`${styles.panel} ${className}`}
      aria-labelledby="not-found-title"
    >
      <div className={styles.copy}>
        <h1 id="not-found-title">Oops!</h1>
        <p>
          <span>Sorry,the page not found.</span>
          <span>很抱歉！頁面被移除或者是不存在。</span>
        </p>
      </div>

      <img
        className={styles.image}
        src="/not-found/ltn_404.gif"
        alt="找不到網頁"
      />
    </section>
  );
}
