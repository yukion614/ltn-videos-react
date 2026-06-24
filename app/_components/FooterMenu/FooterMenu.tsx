import styles from "./FooterMenu.module.scss";
import Image from "next/image";

// footer 上方的黑色區塊：自由影音標題 + 一排節目連結
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

export default function FooterMenu() {
  return (
    <section className={styles.footerMenu} aria-label="自由影音節目選單">
      <div className={styles.brand}>
        <Image
          className={styles.navLogo}
          src={"/ltn-vedio.png"}
          alt="自由影音"
          title="自由影音"
          width={160}
          height={32}
        />
      </div>

      <nav className={styles.links}>
        {programs.map((item, index) => (
          <a href={`/programs/${item[2]}`} className={styles.link} key={index}>
            {item[0]}
          </a>
        ))}
      </nav>
    </section>
  );
}
