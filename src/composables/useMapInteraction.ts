import { ref, watch, onMounted, onUnmounted } from 'vue';

const STORAGE_KEY = 'teyvat-railways-map-state';
const ZOOM_DURATION = 500;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

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

  let animFrameId = 0;
  let animStart = 0;
  let scaleFrom = 1;
  let scaleTo = 1;
  let panXFrom = 0;
  let panXTo = 0;
  let panYFrom = 0;
  let panYTo = 0;

  function cancelAnim() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = 0;
    }
  }

  function tick(time: number) {
    if (!animStart) animStart = time;
    const t = Math.min(1, (time - animStart) / ZOOM_DURATION);
    const p = easeOutCubic(t);
    scale.value = scaleFrom + (scaleTo - scaleFrom) * p;
    panX.value = panXFrom + (panXTo - panXFrom) * p;
    panY.value = panYFrom + (panYTo - panYFrom) * p;
    if (t < 1) {
      animFrameId = requestAnimationFrame(tick);
    } else {
      animFrameId = 0;
      scale.value = scaleTo;
      panX.value = panXTo;
      panY.value = panYTo;
    }
  }

  function zoomTo(targetScale: number, targetPanX: number, targetPanY: number) {
    cancelAnim();
    scaleFrom = scale.value;
    scaleTo = targetScale;
    panXFrom = panX.value;
    panXTo = targetPanX;
    panYFrom = panY.value;
    panYTo = targetPanY;
    animStart = 0;
    animFrameId = requestAnimationFrame(tick);
  }

  function zoomToCenter(targetScale: number, cx: number, cy: number) {
    const rect = container.value!.getBoundingClientRect();
    const mx = cx - rect.left;
    const my = cy - rect.top;
    const ratio = targetScale / scale.value;
    const tpX = mx - (mx - panX.value) * ratio;
    const tpY = my - (my - panY.value) * ratio;
    zoomTo(targetScale, tpX, tpY);
  }

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
    cancelAnim();
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
    const factor = e.deltaY > 0 ? 1 / 1.5 : 1.5;
    const ns = Math.max(0.2, Math.min(5, scale.value * factor));
    zoomToCenter(ns, e.clientX, e.clientY);
  }

  let touchPoints: { x: number; y: number }[] = [];
  let savedScale = 1;
  let savedPanX = 0;
  let savedPanY = 0;
  let savedDist = 0;
  let savedCenterX = 0;
  let savedCenterY = 0;

  function onTouchStart(e: TouchEvent) {
    cancelAnim();
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
    zoomTo,
    zoomToCenter,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
  };
}
