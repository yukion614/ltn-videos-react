// 使用者的播放偏好（音量／靜音），跨影片與跨造訪記住，存在 localStorage。
// 只在使用者實際操作（音量滑桿、靜音鍵）時寫入，讀取一律做防呆與 SSR 保護。

const KEY = "ltn-video-prefs";

export interface PlayerPrefs {
  volume: number; // 0~1
  muted: boolean;
}

// 讀取偏好；無資料 / 格式不符 / 讀取失敗（隱私模式等）一律回傳 null，交由呼叫端用預設值。
export function loadPlayerPrefs(): PlayerPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    if (typeof parsed.volume !== "number" || typeof parsed.muted !== "boolean") {
      return null;
    }
    // 夾在 0~1，擋掉被外部竄改的異常值
    const volume = Math.min(1, Math.max(0, parsed.volume));
    return { volume, muted: parsed.muted };
  } catch {
    return null;
  }
}

// 寫入偏好；隱私模式 / 容量滿等失敗直接忽略，不影響播放。
export function savePlayerPrefs(prefs: PlayerPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 忽略
  }
}
