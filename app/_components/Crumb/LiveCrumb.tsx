"use client";

import { useEffect, useState } from "react";
import Crumb from "./Crumb";
import {
  buildVideoCrumbs,
  getVideo,
  type Crumb as CrumbType,
} from "@/app/_lib/videoDetail";

// 靜態匯出（output:"export"）下，麵包屑在 build 當下就被烤進 HTML，
// 之後後端 API 更新也不會反映到已產生的頁面（要重新 build 才會變）。
//
// 這個 client 元件維持 build 時的 initial 當初值（避免閃爍、讓 SEO/爬蟲仍有內容），
// 於瀏覽器掛載後重新抓 getVideo(slug)，用最新的 breadcrumb 覆蓋顯示。
// 若沒有 slug（如 fallback 外殼，資料本來就是 runtime 抓的、已是最新）則不重抓。
// 重抓失敗（例如本機 dev 遇上游 CORS）就維持 initial，不影響畫面。
export default function LiveCrumb({
  slug,
  initial,
}: {
  slug?: string;
  initial: CrumbType[];
}) {
  const [crumbs, setCrumbs] = useState<CrumbType[]>(initial);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      const data = await getVideo(slug);
      if (cancelled || !data?.video) return;
      setCrumbs(buildVideoCrumbs(data));
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return <Crumb crumbs={crumbs} />;
}
