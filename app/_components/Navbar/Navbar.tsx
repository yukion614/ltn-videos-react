"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import styles from "./Navbar.module.scss";

export default function Navbar() {
  //當網頁在瀏覽器開機（Mounted）後，next-themes 會跑去偵測瀏覽器底層的 window.matchMedia('(prefers-color-scheme: dark)')。
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  // 「話題」直接連 /topic，由該頁在 server 端轉址到第一支話題影片。
  // 不在這裡預抓 watchUrl：Navbar 在 root layout 裡、每一頁都會渲染，
  // 為了算這一個 href 而預抓，等於全站每次頁面載入都白打兩支 API
  // （playlist-list/topic + 該清單的 playlist-items），即使訪客不會點「話題」。
  const mainLinks = [
    { name: "最新", link: "latest" },
    { name: "Shorts", link: "shorts" },
    { name: "話題", link: "topic" },
    { name: "節目", link: "programs" },
  ];

  // next-themes 在 client 端 mount 後才知道實際主題，
  // 用 mounted 避免 server/client 不一致造成 hydration 警告
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && resolvedTheme === "dark";

  return (
    <div className={styles.nav}>
      <div className={styles.wrap}>
        <Link href="/">
          <img
            className={styles.navLogo}
            src={"/ltn-vedio.png"}
            alt="自由影音"
            title="自由影音"
            width={95}
            height={24}
          />
        </Link>

        <nav className={styles.navLinks}>
          {mainLinks.map((link, index) => {
            const className = pathname.includes(`/${link.link}`)
              ? styles.active
              : "";

            // 「話題」用原生 <a>，不走 client 端換頁。
            if (link.link === "topic") {
              return (
                <a href={`/${link.link}`} key={index} className={className}>
                  {link.name}
                </a>
              );
            }

            return (
              <Link href={`/${link.link}`} key={index} className={className}>
                {link.name}
              </Link>
            );
          })}
        </nav>
        <span className={styles.navSpacer}></span>
        <div className={styles.navIcons}>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={() => {
              setTheme(isDarkMode ? "light" : "dark");
            }}
            aria-label="切換深色／淺色模式"
            title="深色 / 淺色模式"
            aria-pressed={isDarkMode}
          >
            {isDarkMode ? (
              <svg className={styles.icSun} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4.4" fill="currentColor"></circle>
                <g
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="1.8" x2="12" y2="4.2"></line>
                  <line x1="12" y1="19.8" x2="12" y2="22.2"></line>
                  <line x1="1.8" y1="12" x2="4.2" y2="12"></line>
                  <line x1="19.8" y1="12" x2="22.2" y2="12"></line>
                  <line x1="4.7" y1="4.7" x2="6.4" y2="6.4"></line>
                  <line x1="17.6" y1="17.6" x2="19.3" y2="19.3"></line>
                  <line x1="4.7" y1="19.3" x2="6.4" y2="17.6"></line>
                  <line x1="17.6" y1="6.4" x2="19.3" y2="4.7"></line>
                </g>
              </svg>
            ) : (
              <svg
                className={styles.icMoon}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path>
              </svg>
            )}
          </button>

          <a
            href="https://www.facebook.com/m.ltn.tw"
            target="_blank"
            className={`${styles.navIcon} ${styles.icFacebook}`}
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"
                fill="currentColor"
              ></path>
            </svg>
          </a>
          {/* yt */}
          <a
            href="https://www.youtube.com/@LtnTw"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.navIcon} ${styles.icYoutube}`}
            aria-label="Youtube"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M23 12s0-3.8-.5-5.6a2.9 2.9 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.9 2.9 0 0 0-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6a2.9 2.9 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.9 2.9 0 0 0 2-2C23 15.8 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z"
                fill="currentColor"
              ></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
