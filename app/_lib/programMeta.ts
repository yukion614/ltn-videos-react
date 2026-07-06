// 節目清單改由後端 /playlist-list/program 提供（key/title/count 皆為後端欄位）。
// 首頁節目卡、/programs 清單、[category] 分類頁與其 generateStaticParams、FooterMenu
// 都改呼叫 getPrograms()；下方的後備清單只在 API 取不到時使用，
// 同時也是元件首次 render 的初值（避免閃爍），以及 build 時 generateStaticParams
// 至少要有一筆（output:"export" 不接受空的動態參數清單）。
import { API_BASE } from "./api";

export interface ProgramMeta {
  name: string; // 節目名稱（後端 title）
  key: string; // 後端 playlist key，直接作為 /programs/[category] 的路由參數
  ep: number; // 目前集數（後端 count）
}

const basePath = API_BASE;

// 後備清單：刻意留空——節目清單以後端為唯一來源，不再放會過時的寫死資料。
// 也是各元件的初值（首次 render 先空、後端回來再填）。
// build 時若 API 掛掉會退回這個空清單，但 generateStaticParams 一定會補 "_shell"，
// 所以 output:"export" 不會因空清單失敗；屆時節目頁全靠 fallback 外殼即時渲染。
export const programMeta: ProgramMeta[] = [];

// 後端節目 entry 的最小結構（只取用得到的欄位）
interface ProgramApiItem {
  id?: number;
  key?: string;
  title?: string;
  count?: number;
}

/**
 * 從後端取節目清單。可在 server（generateStaticParams）與 client（各頁）共用（純 fetch）。
 * key 優先用後端 key，退回數字 id；失敗或空時回後備清單，
 * 確保 build 與畫面都不致空白。
 */
export async function getPrograms(): Promise<ProgramMeta[]> {
  try {
    const res = await fetch(`${basePath}/playlist-list/program`);
    if (!res.ok) return programMeta;
    const data = (await res.json()) as { items?: ProgramApiItem[] };
    const items = (data.items ?? [])
      .map((it) => ({
        name: it.title ?? "",
        key: it.key || (it.id != null ? String(it.id) : ""),
        ep: it.count ?? 0,
      }))
      .filter((p) => p.key);
    return items.length ? items : programMeta;
  } catch {
    return programMeta;
  }
}
