import type { Metadata } from "next";
import { cache } from "react";

import Crumb from "@/app/_components/Crumb/Crumb";
import SectionHeader from "@/app/_components/SectionHeader/SectionHeader";
import VideoDetail from "@/app/_components/VideoDetail/VideoDetail";
import TopicUrlSync from "./TopicUrlSync";
import type {
  PlaylistEntry,
  PlaylistVideoItem,
} from "@/app/_interfaces/playlist";
import { fetchPlaylistItems, fetchTopicList } from "@/app/_lib/topic";
import {
  buildVideoMetadata,
  getVideoPageData,
  watchUrlToSlug,
} from "@/app/_lib/videoDetail";
import styles from "./page.module.scss";

// force-static 讓這頁進入 ISR 路由快取（少了它會被判為純 Dynamic、每次重渲染）。
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 _lib/api.ts 的 LIST_REVALIDATE 一致。
export const revalidate = 120;

const crumbs = [
  { href: "/", label: "首頁" },
  { href: "/topic", label: "話題" },
];

// 一個話題區塊：清單資訊 + 對應 slug + 前四支影片
interface TopicSection extends PlaylistEntry {
  slug: string;
  videos: PlaylistVideoItem[];
}

// 話題清單有兩種呈現：
//  - lead：只有一個話題清單，不顯示列表，直接原地呈現該清單的第一支影片
//  - list：多個話題清單，每塊顯示前四支影片
type TopicLead = NonNullable<Awaited<ReturnType<typeof getLeadVideo>>>;
type TopicPageData = TopicLead | { mode: "list"; sections: TopicSection[] };

function toTopicSlug(entry: PlaylistEntry) {
  return entry.key || (entry.id != null ? String(entry.id) : "");
}

function toTopicHref(slug: string) {
  return slug ? `/topic/${slug}` : "/topic";
}

// 單支影片連結；沒有對應 slug 時退回不分類的影片頁。
// videoKey 應為 watchUrl 內的 slug（詳情 API 的 key），不是數字 id
function toVideoHref(slug: string, videoKey: string | number) {
  return slug ? `/topic/${slug}/video/${videoKey}` : `/topic/video/${videoKey}`;
}

// 某個話題清單的第一支影片完整頁面資料。抓不到就回 null，由呼叫端退回列表呈現。
async function getLeadVideo(entry: PlaylistEntry) {
  const items = await fetchPlaylistItems(entry.apiUrl);
  const first = items?.items?.[0];
  if (!first) return null;

  const videoSlug = watchUrlToSlug(first.watchUrl) ?? String(first.id);
  const pageData = await getVideoPageData(videoSlug);
  if (!pageData) return null;

  return {
    mode: "lead" as const,
    slug: toTopicSlug(entry),
    videoSlug,
    ...pageData,
  };
}

const getTopicPageData = cache(async (): Promise<TopicPageData> => {
  const list = await fetchTopicList();
  const entries = list?.items ?? [];

  // 話題清單抓不到（API 異常／目前沒有話題）：回空列表，不報錯也不 notFound()。
  // notFound() 會把 404 寫進 ISR 快取，一次 API 抽風就讓整頁 404 撐到下次 revalidate。
  if (entries.length === 0) return { mode: "list", sections: [] };

  if (entries.length === 1) {
    const lead = await getLeadVideo(entries[0]);
    if (lead) return lead;
    // 影片抓不到就往下走列表呈現，至少還留著該話題的入口
  }

  const sections = await Promise.all(
    entries.map(async (entry) => {
      const items = await fetchPlaylistItems(entry.apiUrl);
      return {
        ...entry,
        slug: toTopicSlug(entry),
        videos: (items?.items ?? []).slice(0, 4),
      };
    }),
  );

  return { mode: "list", sections };
});

export async function generateMetadata(): Promise<Metadata> {
  const page = await getTopicPageData();

  // 只有一支影片時，這頁實際呈現的就是該影片，metadata 也跟著它走
  if (page.mode === "lead") return buildVideoMetadata(page.data);

  const title = "話題 - 自由影音";
  const description = "自由影音話題影片一覽";

  return {
    title,
    description,
    alternates: { canonical: "/topic" },
    openGraph: { type: "website", title, description, url: "/topic" },
    twitter: { card: "summary", title, description },
  };
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

export default async function TopicPage() {
  const page = await getTopicPageData();

  if (page.mode === "lead") {
    const videoBasePath = `/topic/${page.slug}/video`;

    return (
      <>
        <TopicUrlSync href={`${videoBasePath}/${page.videoSlug}`} />
        <VideoDetail
          data={page.data}
          videoBasePath={videoBasePath}
          relatedFallback={page.relatedFallback}
          videoSlug={page.videoSlug}
        />
      </>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Crumb crumbs={crumbs} />
        <h1 className={styles.srOnly}>話題</h1>

        <div className={styles.content}>
          {page.sections.map((section, sectionIndex) => (
            <section key={section.id ?? section.title}>
              <SectionHeader
                name={section.title}
                href={toTopicHref(section.slug)}
              />
              {/* 前四支影片 */}
              <div className={styles.grid}>
                {section.videos.map((video, cardIndex) => (
                  <a
                    className={styles.card}
                    href={toVideoHref(
                      section.slug,
                      watchUrlToSlug(video.watchUrl) ?? video.id,
                    )}
                    // 改用原生 <a>：點擊走整頁重載，不發出 ?_rsc= 導覽請求
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
                      <span className={styles.cardTitle}>{video.title}</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
