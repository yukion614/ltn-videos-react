// 節目清單的單一資料來源（slug 對應節目名稱）。
// 首頁節目卡片、節目頁、[category] 頁與其 generateStaticParams 都引用這份，
// 之後新增/修改節目只要改這裡一處即可。
export interface ProgramMeta {
  name: string; // 節目名稱（首頁卡片以此比對取得 key）
  // 後端 playlist key，直接作為 /programs/[category] 的路由參數；
  // 與 API breadcrumb 的 /programs/{key} 一致，麵包屑不需再做對照轉換。
  key: string;
  update: string; // 更新頻率（分類頁顯示用）
  ep: number; // 目前集數（分類頁集數編號用）
}

export const programMeta: ProgramMeta[] = [
  { name: "政治風向球", key: "994299396a3df294c04506", update: "每週二更新", ep: 51 },
  { name: "生活指南針", key: "781481596a3df2ac3fe093", update: "每週四更新", ep: 72 },
  { name: "驚爆新聞線", key: "880877636a3df29b04ea54", update: "每週三更新", ep: 73 },
];

// 節目分類的所有 key，給靜態匯出的 generateStaticParams 使用
export const programKeys = programMeta.map((program) => program.key);
