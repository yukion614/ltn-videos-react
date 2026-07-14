// 節目清單改由後端 /playlist-list/program 提供（key/title/count 皆為後端欄位）。
// 首頁節目卡、/programs 清單、[category] 分類頁、FooterMenu 都呼叫 getPrograms()；
// 下方的後備清單只在 API 取不到時使用。
import { API_BASE, LIST_REVALIDATE } from "./api";

export interface ProgramMeta {
  name: string; // 節目名稱（後端 title）
  key: string; // 後端 playlist key，直接作為 /programs/[category] 的路由參數
  ep: number; // 目前集數（後端 count）
}

const basePath = API_BASE;

// 後備清單：刻意留空——節目清單以後端為唯一來源，不再放會過時的寫死資料。
// API 掛掉時各處會退回這個空清單（節目 tabs 空著），不致整頁壞掉。
export const programMeta: ProgramMeta[] = [];

// 後端節目 entry 的最小結構（只取用得到的欄位）
interface ProgramApiItem {
  id?: number;
  key?: string;
  title?: string;
  count?: number;
}

/**
 * 從後端取節目清單。可在 server 與 client 共用（純 fetch）。
 * key 優先用後端 key，退回數字 id；失敗或空時回後備清單，確保畫面不致空白。
 */
export async function getPrograms(): Promise<ProgramMeta[]> {
  try {
    // next.revalidate 只在 server 端生效；client 呼叫時瀏覽器會忽略，無副作用。
    const res = await fetch(`${basePath}/playlist-list/program`, {
      next: { revalidate: LIST_REVALIDATE },
    });
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
