import { getPrograms } from "@/app/_lib/programMeta";
import FooterMenuClient from "./FooterMenuClient";

// footer 上方的黑色區塊：自由影音標題 + 一排節目連結。
//
// 節目清單在 server 端抓（結果進 ISR 快取，見 getPrograms 的 next.revalidate）。
// 原本是 client 元件、在 useEffect 裡打 /playlist-list/program——但本元件掛在
// root layout 裡、每一頁都會渲染，等於每位訪客每開一頁就白打一支 API。
// 改成 server 端後，瀏覽器一支都不用打，節目連結也直接進 HTML（爬蟲讀得到）。
export default async function FooterMenu() {
  const programs = await getPrograms();
  return <FooterMenuClient programs={programs} />;
}
