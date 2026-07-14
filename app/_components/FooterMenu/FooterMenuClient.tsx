"use client";

import { usePathname } from "next/navigation";
import styles from "./FooterMenu.module.scss";
import type { ProgramMeta } from "@/app/_lib/programMeta";

// FooterMenu 的畫面。節目清單由 server 端（FooterMenu.tsx）抓好傳進來，
// 這裡只負責「短影音頁不顯示」這個需要知道當前網址的判斷。
export default function FooterMenuClient({
  programs,
}: {
  programs: ProgramMeta[];
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/shorts")) return null;

  return (
    <section className={styles.footerMenu} aria-label="自由影音節目選單">
      <div className={styles.brand}>
        <img
          className={styles.navLogo}
          src={"/ltn-vedio.png"}
          alt="自由影音"
          title="自由影音"
          width={110}
          height={22}
        />
      </div>

      <nav className={styles.links}>
        {programs.map((item) => (
          <a href={`/programs/${item.key}`} className={styles.link} key={item.key}>
            {item.name}
          </a>
        ))}
      </nav>
    </section>
  );
}
