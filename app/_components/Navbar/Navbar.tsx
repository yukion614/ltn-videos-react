"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import styles from "./Navbar.module.scss";
import type {
  VideoListResponse,
  VideoListItem,
} from "@/app/_interfaces/videoArticle";
import type { BrandVideoResponse } from "@/app/_interfaces/BrandVideo";

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

export default function Navbar() {
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  //當網頁在瀏覽器開機（Mounted）後，next-themes 會跑去偵測瀏覽器底層的 window.matchMedia('(prefers-color-scheme: dark)')。
  const { resolvedTheme, setTheme } = useTheme();
  const [latestVideo, setLatestVideo] = useState<VideoListItem[]>([]);

  const mainLinks = [
    { name: "最新", link: "latest" },
    { name: "shorts", link: "shorts" },
    {
      name: "話題",
      link: `topic/video/${latestVideo[0] ? latestVideo[0].id : null}`,
    },
    { name: "節目", link: "programs" },
  ];

  // next-themes 在 client 端 mount 後才知道實際主題，
  // 用 mounted 避免 server/client 不一致造成 hydration 警告
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetchLatestVideo();
  }, []);

  useEffect(() => {
    console.log("latestVideo updated:", latestVideo[0]?.id);
  }, [latestVideo]);
  const isDarkMode = mounted && resolvedTheme === "dark";

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  };

  const basePath = "https://video.ltn.com.tw/brand/api";
  async function fetchLatestVideo() {
    const url = `${basePath}/list`;
    const limit = 1;
    const res = await fetch(url);
    const data: VideoListResponse = await res.json();

    const items = await Promise.all(
      data.items.slice(0, limit).map(async (item) => {
        const detailUrl = `${basePath}/video/${item.id}`;
        const detailRes = await fetch(detailUrl);
        const detailData: BrandVideoResponse = await detailRes.json();

        return {
          ...item,
          // 換成同源 proxy 路徑，繞過來源未開 CORS 的限制（對應 next.config 的 /hls rewrite）
          hlsUrl: detailData.video.hlsUrl.replace(
            "https://video.ltn.com.tw/media/",
            "/hls/",
          ),
        };
      }),
    );
    setLatestVideo(items);
  }

  return (
    <div
      className={styles.nav}
      onMouseLeave={() => setIsProgramOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsProgramOpen(false);
        }
      }}
    >
      <div className={styles.wrap}>
        <Link href="/">
          <Image
            className={styles.navLogo}
            src={"/ltn-vedio.png"}
            alt="自由影音"
            title="自由影音"
            width={95}
            height={24}
          />
        </Link>

        <nav className={styles.navLinks}>
          {mainLinks.map((link, index) => (
            <Link href={`/${link.link}`} key={index}>
              {link.name}
            </Link>
          ))}
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

          <button
            type="button"
            className={`${styles.navIcon} ${styles.icFacebook}`}
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"
                fill="currentColor"
              ></path>
            </svg>
          </button>

          <button
            type="button"
            className={`${styles.navIcon} ${styles.icYoutube}`}
            aria-label="Youtube"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M23 12s0-3.8-.5-5.6a2.9 2.9 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.9 2.9 0 0 0-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6a2.9 2.9 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.9 2.9 0 0 0 2-2C23 15.8 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z"
                fill="currentColor"
              ></path>
            </svg>
          </button>
        </div>
      </div>
      <div
        className={`${styles.subnav} ${isProgramOpen ? styles.open : ""}`}
        onMouseEnter={() => setIsProgramOpen(true)}
      >
        <div className={styles.subnavWrap}>
          {programLinks.map((link) => (
            <Link href="#" key={link} onClick={handleLinkClick}>
              {link}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
