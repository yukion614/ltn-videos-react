"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Crumb from "../_components/Crumb/Crumb";
import type {
  VideoListItem,
  VideoListResponse,
} from "../_interfaces/videoArticle";
import styles from "./page.module.scss";

const basePath = "https://video.ltn.com.tw/brand/api";

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

const programMeta = [
  { name: "政面交鋒", slug: "politics-faceoff" },
  { name: "自由說新聞", slug: "liberty-talks" },
  { name: "自由爆新聞", slug: "liberty-breaking" },
  { name: "新聞360", slug: "news-360" },
  { name: "官我什麼事", slug: "gov-matters" },
  { name: "台海情勢簡報室", slug: "strait-brief" },
  { name: "娛樂後視鏡", slug: "ent-rearview" },
  { name: "名人開講", slug: "celeb-talks" },
];

const episodeTitles = [
  "桃園人為何怒了？黃世杰挑戰張善政揭他「最大弱點」！「市政危機」成選戰變天關鍵【政面交鋒】2",
  "完整版上集／來賓激辯國防特別預算與兩岸關係走向 學者：這一步將牽動整個區域戰略平衡",
  "深度專訪／政壇老將回顧三十年從政路 揭密當年關鍵決策背後不為人知的內幕與掙扎",
  "焦點議題／物價民生政策現場大體檢 專家點名三大盲點 民眾荷包能不能保得住？",
  "獨家解析／最新民調數字背後的真相 藍綠白支持度洗牌 這個族群成決勝關鍵變數",
  "現場直擊／街頭民眾最真實的心聲大公開 對於這次選舉他們最在意的竟然是這件事",
  "完整版下集／攤牌時刻各方立場一次說清楚 火藥味十足的交鋒讓全場氣氛瞬間凝結",
  "幕後花絮／錄影現場的笑料與真情流露 來賓卸下心防暢談從政路上最感動的一刻",
  "重點回顧／本週最受關注的三件大事完整整理 一次掌握政壇風向與下一步可能走向",
  "專家連線／國際變局下台灣的因應之道 從地緣政治到經濟布局 這些風險不能不防",
  "犀利對談／名嘴與學者針鋒相對的一小時 對於爭議政策雙方寸步不讓火花四射",
  "年度特輯／回顧這一年走過的重大時刻 從風暴到轉折 那些改變台灣政局的關鍵畫面",
];

function SectionHeader({ name, href }: { name: string; href: string }) {
  return (
    <div className={styles.sectionHeader}>
      <Link className={styles.name} href={href}>
        {name}
      </Link>
      <Link className={styles.more} href={href}>
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

function toVideoHref(gategory?: string, video?: VideoListItem) {
  return video?.id
    ? `/programs/${gategory}/video/${video.id}`
    : "/programs/video/6399";
}

export default function ProgramsPage() {
  const [thumbnailPool, setThumbnailPool] = useState<VideoListItem[]>([]);

  useEffect(() => {
    let ignore = false;

    async function fetchThumbnails() {
      try {
        const res = await fetch(`${basePath}/list`);

        if (!res.ok) {
          return;
        }

        const data: VideoListResponse = await res.json();

        if (!ignore) {
          setThumbnailPool(data.items || []);
        }
      } catch {
        if (!ignore) {
          setThumbnailPool([]);
        }
      }
    }

    fetchThumbnails();

    return () => {
      ignore = true;
    };
  }, []);

  const sections = useMemo(
    () =>
      programMeta.map((program, sectionIndex) => ({
        ...program,
        items: Array.from({ length: 4 }, (_, cardIndex) => {
          const globalIndex = sectionIndex * 4 + cardIndex;
          const video =
            thumbnailPool.length > 0
              ? thumbnailPool[globalIndex % thumbnailPool.length]
              : undefined;

          return {
            id: `${program.name}-${cardIndex}`,
            title: episodeTitles[globalIndex % episodeTitles.length],
            href: toVideoHref(program.slug, video),
            thumbnailUrl: video?.thumbnailUrl,
          };
        }),
      })),
    [thumbnailPool],
  );

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Crumb crumbs={crumbs} />
        <h1 className={styles.srOnly}>節目</h1>

        <div className={styles.content}>
          {/* 節目清單 */}
          {sections.map((section, sectionIndex) => (
            <section className={styles.section} key={section.name}>
              <SectionHeader
                name={section.name}
                href={`/programs/${section.slug}`}
              />
              {/* 前四個項目 */}
              <div className={styles.grid}>
                {section.items.map((item, cardIndex) => (
                  <Link className={styles.card} href={item.href} key={item.id}>
                    <span className={styles.media}>
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
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
                          programName={section.name}
                          tone={sectionIndex + cardIndex}
                        />
                      )}
                    </span>
                    <span className={styles.cardTitleWrap}>
                      <span className={styles.cardTitle}>{item.title}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
