import ShortsFeed from "../ShortsFeed";

// 帶 id 入口：/shorts/123 直接跳到該則影片，再往下滑會切換到下一則並更新網址
export default async function ShortsByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShortsFeed initialId={id} />;
}
