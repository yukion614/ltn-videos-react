import { getPrograms } from "@/app/_lib/programMeta";
import FooterMenuClient from "./FooterMenuClient";

// 節目清單在 server 端抓（結果進 ISR 快取，見 getPrograms 的 next.revalidate）。
export default async function FooterMenu() {
  const programs = await getPrograms();
  return <FooterMenuClient programs={programs} />;
}
