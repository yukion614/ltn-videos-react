import ShortsFeed from "./ShortsFeed";

// 無 id 入口：從第一則開始播，捲動時網址會自動補上目前這則的 id
export default function ShortsPage() {
  return <ShortsFeed />;
}
