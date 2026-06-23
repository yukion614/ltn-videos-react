import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 讓水平捲動容器可以用滑鼠「按住拖曳」來滑動。
 * 回傳要掛在容器上的 ref，以及 isDragging（拖曳中），
 * 方便在拖曳時暫停 hover 自動播放、避免誤觸點擊。
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 用 ref 記錄拖曳狀態，避免事件處理頻繁觸發 re-render
  const state = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      // 只處理滑鼠左鍵；觸控／觸控筆交給原生捲動
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.pointerType !== "mouse") return;
      state.current = {
        down: true,
        moved: false,
        startX: e.clientX,
        startScroll: el.scrollLeft,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.down) return;
      const dx = e.clientX - s.startX;
      // 超過門檻才視為拖曳，避免影響一般點擊
      if (!s.moved && Math.abs(dx) < 5) return;
      if (!s.moved) {
        s.moved = true;
        setIsDragging(true);
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = s.startScroll - dx;
    };

    const endDrag = () => {
      if (!state.current.down) return;
      state.current.down = false;
      if (state.current.moved) setIsDragging(false);
    };

    // 拖曳後攔截點擊，避免放開時誤觸卡片連結
    const onClickCapture = (e: MouseEvent) => {
      if (state.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        state.current.moved = false;
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return { ref, isDragging } as const;
}
