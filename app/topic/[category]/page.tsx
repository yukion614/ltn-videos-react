import type { Metadata } from "next";
import { cache } from "react";

import Crumb from "@/app/_components/Crumb/Crumb";
import NotFoundPanel from "@/app/_components/NotFoundPanel/NotFoundPanel";
import { fetchTopicSection } from "@/app/_lib/topic";
import { watchUrlToSlug } from "@/app/_lib/videoDetail";
import styles from "../page.module.scss";

// 單一話題頁：首頁／話題頁的「看更多」都指到這裡（/topic/{key}）。
// force-static 讓動態路由進入 ISR 路由快取（少了它會被判為純 Dynamic、每次重渲染）。
export const dynamic = "force-static";

// 字面值：route segment config 不吃匯入的常數。需與 _lib/api.ts 的 LIST_REVALIDATE 一致。
export const revalidate = 120;

// generateMetadata 與頁面本體各要一次資料，用 cache 讓同一次請求只打一輪 API
const getTopic = cache(async (category: string) => fetchTopicSection(category));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const topic = await getTopic(category);

  if (!topic) {
    return {
      title: "找不到此話題 - 自由影音",
      description: "這個話題可能不存在、已下架，或網址輸入有誤。",
    };
  }

  const title = `${topic.entry?.title ?? "話題"} - 自由影音`;
  const description = `${topic.entry?.title ?? "話題"}｜自由影音話題影片一覽`;
  const canonicalUrl = `/topic/${category}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { type: "website", title, description, url: canonicalUrl },
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

export default async function TopicCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const topic = await getTopic(category);

  // 話題清單與 playlist 都查無此 key → 顯示 404 版面。
  // 這裡不用 notFound()：話題頁走 ISR，notFound() 會把 404 寫進路由快取，
  // 一次 API 抽風就讓整頁 404 撐到下次 revalidate（同 /topic 的處理）。
  if (!topic) {
    return (
      <main className={styles.page}>
        <div className={styles.wrap}>
          <Crumb
            crumbs={[
              { href: "/", label: "首頁" },
              { href: "/topic", label: "話題" },
              { label: "找不到此話題" },
            ]}
          />
          <NotFoundPanel />
        </div>
      </main>
    );
  }

  const title = topic.entry?.title ?? "話題";

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Crumb
          crumbs={[
            { href: "/", label: "首頁" },
            { href: "/topic", label: "話題" },
            { label: title },
          ]}
        />

        <div className={styles.content}>
          <section>
            {/* 已在該話題內，標題不再是連結，也不需要「看更多」 */}
            <div className={styles.sectionHeader}>
              <h1 className={styles.name}>{title}</h1>
            </div>

            <div className={styles.grid}>
              {topic.items.map((video, index) => (
                <a
                  className={styles.card}
                  // 改用原生 <a>：點擊走整頁重載，不發出 ?_rsc= 導覽請求
                  href={`/topic/${category}/video/${
                    watchUrlToSlug(video.watchUrl) ?? video.id
                  }`}
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
                      <ProgramFallback programName={title} tone={index} />
                    )}
                  </span>
                  <span className={styles.cardTitleWrap}>
                    <span className={styles.cardTitle}>{video.title}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
