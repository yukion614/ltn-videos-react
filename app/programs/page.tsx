"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Crumb from "../_components/Crumb/Crumb";
import type {
  PlaylistEntry,
  PlaylistItemsResponse,
  PlaylistVideoItem,
  ProgramListResponse,
} from "../_interfaces/playlist";
import styles from "./page.module.scss";
import { watchUrlToSlug } from "../_lib/videoDetail";
import { API_BASE } from "../_lib/api";

const basePath = API_BASE;

const crumbs = [
  {
    href: "/",
    label: "首頁",
  },
  {
    href: "/programs",
    label: "節目",
  },
];

// 一個節目區塊：節目清單資訊 + 對應 slug + 前四支影片
interface ProgramSection extends PlaylistEntry {
  slug: string;
  videos: PlaylistVideoItem[];
}

// 後端 entry 自帶 key（就是 /programs/[category] 的路由參數），直接用；
// 沒有 key 時退回數字 id，再沒有就回空字串
function toProgramSlug(entry: PlaylistEntry) {
  return entry.key || (entry.id != null ? String(entry.id) : "");
}

// 節目分類頁連結；沒有對應 slug 時退回節目首頁
function toProgramHref(slug: string) {
  return slug ? `/programs/${slug}` : "/programs";
}

// 單支影片連結；沒有對應 slug 時退回不分類的影片頁。
// videoKey 應為 watchUrl 內的 slug（詳情 API 的 key），不是數字 id
function toVideoHref(slug: string, videoKey: string | number) {
  return slug
    ? `/programs/${slug}/video/${videoKey}`
    : `/programs/video/${videoKey}`;
}

function SectionHeader({ name, href }: { name: string; href: string }) {
  return (
    <div className={styles.sectionHeader}>
      {/* /programs/{key} 是導向 _shell 外殼的假路由，沒有靜態 index.txt；關掉 prefetch 避免 404 */}
      <Link className={styles.name} href={href} prefetch={false}>
        {name}
      </Link>
      <Link className={styles.more} href={href} prefetch={false}>
        看更多
      </Link>
    </div>
  );
}

function ProgramFallback({
  programName,
  tone,
}: {
  programName: string;
  tone: number;
}) {
  return (
    <span className={`${styles.fallbackMedia} ${styles[`tone${tone % 8}`]}`}>
      <span>{programName}</span>
    </span>
  );
}

export default function ProgramsPage() {
  const [sections, setSections] = useState<ProgramSection[]>([]);

  useEffect(() => {
    let ignore = false;

    async function fetchPrograms() {
      try {
        // 1. 取得節目清單（每個節目帶 apiUrl）
        const res = await fetch(`${basePath}/playlist-list/program`);

        if (!res.ok) {
          throw new Error(`playlist-list/program 回應失敗：${res.status}`);
        }

        const data: ProgramListResponse = await res.json();
        const entries = data.items ?? [];

        // 2. 每個節目用 apiUrl 抓底下影片，取前四支
        const result = await Promise.all(
          entries.map(async (entry) => {
            const itemsRes = await fetch(entry.apiUrl);
            const itemsData: PlaylistItemsResponse = await itemsRes.json();

            return {
              ...entry,
              slug: toProgramSlug(entry),
              videos: (itemsData.items ?? []).slice(0, 4),
            };
          }),
        );

        if (!ignore) {
          setSections(result);
        }
      } catch {
        if (!ignore) {
          setSections([]);
        }
      }
    }

    fetchPrograms();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Crumb crumbs={crumbs} />
        <h1 className={styles.srOnly}>節目</h1>

        <div className={styles.content}>
          {/* 節目清單 */}
          {sections.length > 0
            ? sections.map((section, sectionIndex) => (
                <section key={section.id ?? section.title}>
                  <SectionHeader
                    name={section.title}
                    href={toProgramHref(section.slug)}
                  />
                  {/* 前四支影片 */}
                  <div className={styles.grid}>
                    {section.videos.map((video, cardIndex) => (
                      <Link
                        className={styles.card}
                        href={toVideoHref(
                          section.slug,
                          watchUrlToSlug(video.watchUrl) ?? video.id,
                        )}
                        // 影片頁是 ISR；prefetch 會讓每個連結都在伺服器渲染一次，關掉省成本
                        prefetch={false}
                        key={video.id}
                      >
                        <span className={styles.media}>
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <ProgramFallback
                              programName={section.title}
                              tone={sectionIndex + cardIndex}
                            />
                          )}
                        </span>
                        <span className={styles.cardTitleWrap}>
                          <span className={styles.cardTitle}>
                            {video.title}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))
            : // 載入中骨架：8 個節目區塊，每塊 4 張灰底卡片
              Array.from({ length: 8 }).map((_, sectionIndex) => (
                <section key={sectionIndex}>
                  <SectionHeader name="" href="#" />
                  {/* 前四支影片 */}
                  <div className={styles.grid}>
                    {Array.from({ length: 4 }).map((_, cardIndex) => (
                      <span className={styles.card} key={cardIndex}>
                        <span className={styles.media}>
                          <span className={styles.mediaLoading}>載入中…</span>
                        </span>
                        <span className={styles.cardTitleWrap}>
                          <span className={styles.cardTitle}>&nbsp;</span>
                        </span>
                      </span>
                    ))}
                  </div>
                </section>
              ))}
        </div>
      </div>
    </main>
  );
}
