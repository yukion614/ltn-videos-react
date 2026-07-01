import ShortsFeed from "../ShortsFeed";
import { watchUrlToSlug } from "@/app/_lib/videoDetail";
// 靜態匯出：列出要預先產生的 shorts id
export async function generateStaticParams() {
  try {
    const res = await fetch("https://video.ltn.com.tw/brand/api/shorts");
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { watchUrl: string }[] };
    return (data.items ?? [])
      .map((item) => watchUrlToSlug(item.watchUrl))
      .filter((slug): slug is string => slug != null)
      .map((slug) => ({ id: slug }));
  } catch {
    return [];
  }
}

// 帶 slug 入口：/shorts/{slug} 直接跳到該則影片，再往下滑會切換到下一則並更新網址
export default async function ShortsByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShortsFeed initialId={id} />;
}
