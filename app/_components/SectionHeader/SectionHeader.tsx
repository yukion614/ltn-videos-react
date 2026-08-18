import styles from "./SectionHeader.module.scss";

export default function SectionHeader({
  name,
  href,
}: {
  name: string;
  href: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      {/* 改用原生 <a>：點擊走整頁重載，不會發出 Next.js 的 ?_rsc= 導覽請求 */}
      <a className={styles.name} href={href}>
        {name}
      </a>
      <a className={styles.more} href={href}>
        看更多
      </a>
    </div>
  );
}
