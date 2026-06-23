import { ref, watch, onMounted, onUnmounted } from 'vue';

const STORAGE_KEY = 'teyvat-railways-map-state';

function loadSavedState(fallbackPanX: number, fallbackPanY: number, fallbackScale: number) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      return {
        panX: typeof state.panX === 'number' ? state.panX : fallbackPanX,
        panY: typeof state.panY === 'number' ? state.panY : fallbackPanY,
        scale: typeof state.scale === 'number' ? state.scale : fallbackScale,
      };
    }
  } catch {}
  return { panX: fallbackPanX, panY: fallbackPanY, scale: fallbackScale };
}

export function useMapInteraction(initPanX = 0, initPanY = 0, initScale = 1) {
  const saved = loadSavedState(initPanX, initPanY, initScale);
  const container = ref<HTMLDivElement>();
  const svgEl = ref<SVGSVGElement>();
  const panX = ref(saved.panX);
  const panY = ref(saved.panY);
  const scale = ref(saved.scale);

  watch([panX, panY, scale], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          panX: panX.value,
          panY: panY.value,
          scale: scale.value,
        }),
      );
    } catch {}
  });

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

  function onMouseDown(e: MouseEvent) {
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX.value;
    panStartY = panY.value;
    if (svgEl.value) svgEl.value.style.cursor = 'grabbing';
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    panX.value = panStartX + (e.clientX - dragStartX);
    panY.value = panStartY + (e.clientY - dragStartY);
  }

  function onMouseUp() {
    dragging = false;
    if (svgEl.value) svgEl.value.style.cursor = 'grab';
  }

  function onWheel(e: WheelEvent) {
    const delta = -Math.sign(e.deltaY) * 0.1;
    const ns = Math.max(0.2, Math.min(5, scale.value + delta));
    const rect = container.value!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = ns / scale.value;
    panX.value = mx - (mx - panX.value) * ratio;
    panY.value = my - (my - panY.value) * ratio;
    scale.value = ns;
  }

  let touchPoints: { x: number; y: number }[] = [];
  let savedScale = 1;
  let savedPanX = 0;
  let savedPanY = 0;
  let savedDist = 0;
  let savedCenterX = 0;
  let savedCenterY = 0;

  function onTouchStart(e: TouchEvent) {
    touchPoints = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));
    if (e.touches.length >= 2) {
      savedScale = scale.value;
      savedPanX = panX.value;
      savedPanY = panY.value;
      savedDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      savedCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      savedCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  }

  function onTouchMove(e: TouchEvent) {
    const curPoints = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));

    if (curPoints.length === 1 && touchPoints.length <= 1) {
      const dx = curPoints[0].x - touchPoints[0].x;
      const dy = curPoints[0].y - touchPoints[0].y;
      panX.value += dx;
      panY.value += dy;
    } else if (curPoints.length >= 2) {
      const curDist = Math.hypot(curPoints[1].x - curPoints[0].x, curPoints[1].y - curPoints[0].y);
      const curCenterX = (curPoints[0].x + curPoints[1].x) / 2;
      const curCenterY = (curPoints[0].y + curPoints[1].y) / 2;

      if (touchPoints.length < 2) {
        savedScale = scale.value;
        savedPanX = panX.value;
        savedPanY = panY.value;
        savedDist = curDist;
        savedCenterX = curCenterX;
        savedCenterY = curCenterY;
      }

      const ns = Math.max(0.2, Math.min(5, savedScale * (curDist / savedDist)));
      const rect = container.value!.getBoundingClientRect();
      const mx = savedCenterX - rect.left;
      const my = savedCenterY - rect.top;
      const ratio = ns / savedScale;
      panX.value = mx - (mx - savedPanX) * ratio;
      panY.value = my - (my - savedPanY) * ratio;
      panX.value += curCenterX - savedCenterX;
      panY.value += curCenterY - savedCenterY;
      scale.value = ns;
    }

    touchPoints = curPoints;
  }

  function onTouchEnd(e: TouchEvent) {
    if (e.touches.length === 0) {
      touchPoints = [];
    } else {
      touchPoints = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));
    }
  }

  onMounted(() => {
    const el = container.value;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
  });

  onUnmounted(() => {
    const el = container.value;
    if (!el) return;
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  });

  return {
    container,
    svgEl,
    panX,
    panY,
    scale,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
  };
}
