"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTopicFirstWatchUrl, watchUrlToSlug } from "../_lib/videoDetail";

// 「話題」不顯示清單頁，直接導向第一支影片的詳細頁
export default function TopicPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const watchUrl = await getTopicFirstWatchUrl();
      const slug = watchUrlToSlug(watchUrl ?? undefined);
      if (!cancelled && slug) {
        router.replace(`/topic/video/${slug}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
