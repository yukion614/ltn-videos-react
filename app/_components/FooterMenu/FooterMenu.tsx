import styles from "./FooterMenu.module.scss";
import Image from "next/image";

// footer 上方的黑色區塊：自由影音標題 + 一排節目連結
const programLinks = [
  "政面交鋒",
  "自由說新聞",
  "自由爆新聞",
  "新聞360",
  "官我什麼事",
  "台海情勢簡報室",
  "娛樂後視鏡",
  "名人開講",
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
        {programLinks.map((name) => (
          <a href="#" className={styles.link} key={name}>
            {name}
          </a>
        ))}
      </nav>
    </section>
  );
}
