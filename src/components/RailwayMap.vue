<template>
  <div ref="container" class="map-container" @wheel.prevent="onWheel">
    <LineLegend :mouse-coord="mouseCoord" />
    <ZoomControls v-model:scale="scale" />
    <svg
      ref="svgEl"
      :width="svgWidth"
      :height="svgHeight"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      font-family="sans-serif"
      font-size="12"
      @mousedown.prevent="onMouseDown"
      @mousemove="onSvgMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onSvgMouseLeave"
      style="cursor: grab; user-select: none"
    >
      <rect width="100%" height="100%" fill="#f8f9fa" />

      <g :transform="`translate(${panX}, ${panY}) scale(${scale})`">
        <g v-for="(gx, i) in gridX" :key="'gx' + i">
          <line :x1="gx" y1="0" :x2="gx" :y2="svgHeight" stroke="#e0e0e0" stroke-width="0.5" />
        </g>
        <g v-for="(gy, i) in gridY" :key="'gy' + i">
          <line x1="0" :y1="gy" :x2="svgWidth" :y2="gy" stroke="#e0e0e0" stroke-width="0.5" />
        </g>

        <line
          v-for="seg in renderSegments"
          :key="`${seg.lineId}-${seg.id}`"
          :x1="seg.x1" :y1="seg.y1"
          :x2="seg.x2" :y2="seg.y2"
          :stroke="segStroke(seg)"
          :stroke-width="seg.width"
          :stroke-dasharray="seg.dasharray ?? undefined"
          :opacity="segOpacity(seg)"
          stroke-linecap="round"
        />

        <line
          v-for="ll in leaderLines"
          :key="ll.id"
          :x1="ll.x1" :y1="ll.y1" :x2="ll.x2" :y2="ll.y2"
          stroke="#999" stroke-width="1" stroke-dasharray="4,3"
        />

        <line
          v-for="ll in lineLeaderLines"
          :key="ll.id"
          :x1="ll.x1" :y1="ll.y1" :x2="ll.x2" :y2="ll.y2"
          stroke="#999" stroke-width="1" stroke-dasharray="4,3"
        />

        <g v-for="station in visibleStations" :key="station.id"
          :opacity="routeStationIds.size && !routeStationIds.has(station.id) ? DIM_OPACITY : 1"
        >
          <circle
            :cx="station.cx" :cy="station.cy"
            :r="transferStationIds.has(station.id) ? 7 : 5"
            fill="#1f77b4" stroke="#fff" stroke-width="2"
            style="cursor: pointer"
            @click.stop="onStationClick(station.id)"
          />
        </g>

          <g v-for="lb in labelBoxes" :key="lb.id" :opacity="stationOpacity(lb.id)">
            <rect
              :x="lb.left" :y="lb.top"
              :width="lb.w" :height="lb.h"
              :fill="LABEL_BG" rx="4"
            />
            <text
              :x="lb.cnX" :y="lb.top + lb.fCN * 1.1"
              fill="#333" font-weight="bold" :font-size="lb.fCN"
              :font-family="lb.fontFamily"
            >{{ lb.name }}</text>
            <text
              v-if="lb.nameZh"
              :x="lb.zhX" :y="lb.top + lb.fCN * 1.2 + textGap + lb.fEN * 1.1"
              fill="#555" font-weight="bold" :font-size="lb.fEN"
              :font-family="lb.fontFamilyZh"
            >{{ lb.nameZh }}</text>
            <text
              :x="lb.enX" :y="lb.top + lb.h - pad"
              fill="#555" font-weight="bold" :font-size="lb.fEN"
              :font-family="lb.fontFamilyEn"
            >{{ lb.nameEn }}</text>
          </g>

          <g v-for="lb in lineLabels" :key="lb.id" :opacity="lineLabelOpacity(lb.id)">
            <rect
              :x="lb.left" :y="lb.top"
              :width="lb.w" :height="lb.h"
              :fill="LABEL_BG" rx="4"
            />
            <rect
              :x="lb.left" :y="lb.top"
              :width="4" :height="lb.h"
              :fill="lb.color" rx="2"
            />
            <text
              :x="lb.cnX" :y="lb.top + lb.fCN * 1.1"
              fill="#333" font-weight="bold" :font-size="lb.fCN"
              :font-family="lb.fontFamily"
            >{{ lb.name }}</text>
            <text
              v-if="lb.nameZh"
              :x="lb.zhX" :y="lb.top + lb.fCN * 1.2 + textGap + lb.fEN * 1.1"
              fill="#555" font-weight="bold" :font-size="lb.fEN"
              :font-family="lb.fontFamilyZh"
            >{{ lb.nameZh }}</text>
            <text
              :x="lb.enX" :y="lb.top + lb.h - pad"
              fill="#555" font-weight="bold" :font-size="lb.fEN"
              :font-family="lb.fontFamilyEn"
            >{{ lb.nameEn }}</text>
          </g>

          <path
            v-for="mp in markerPaths" :key="mp.id"
            :d="mp.d" :stroke="mp.stroke"
            :stroke-width="mp.strokeWidth" :fill="mp.fill"
            stroke-linecap="round" stroke-linejoin="round"
          />
          <text
            v-for="mt in markerTexts" :key="mt.id"
            :x="mt.x" :y="mt.y" :font-size="mt.fontSize"
            :fill="mt.fill" :font-family="mt.fontFamily"
          >{{ mt.content }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BLOCK_SIZE, pad, textGap, LABEL_BG, FERRY_COLOR_HIGHLIGHT } from '../config/render.config'
import { svgWidth, svgHeight, stations, stationMap, transferStationIds, renderSegments, markerPaths, markerTexts, minX, minY } from '../composables/useMapData'
import { useMapInteraction } from '../composables/useMapInteraction'
import { useLabelPlacement } from '../composables/useLabelPlacement'
import LineLegend from './LineLegend.vue'
import ZoomControls from './ZoomControls.vue'
import type { RouteResult } from '../composables/useRouting'

const props = defineProps<{
  routeResult: RouteResult | null
}>()

const emit = defineEmits<{
  (e: 'station-click', stationId: string): void
}>()

const routeStationIds = computed(() => {
  if (!props.routeResult) return new Set<string>()
  const ids = new Set<string>()
  for (const seg of props.routeResult.segments) {
    for (const node of seg.nodes) {
      ids.add(node.stationId)
    }
  }
  return ids
})

function normPathId(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 < x2 || (x1 === x2 && y1 < y2)) {
    return `${x1},${y1}|${x2},${y2}`
  }
  return `${x2},${y2}|${x1},${y1}`
}

function addSubSegs(ids: Set<string>, ax: number, ay: number, bx: number, by: number) {
  ids.add(normPathId(ax, ay, bx, by))
  const dx = bx - ax, dy = by - ay
  if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) return
  const sx = Math.sign(dx), sy = Math.sign(dy)
  const adx = Math.abs(dx), ady = Math.abs(dy)
  // diagFirst=true waypoint
  const cx1 = adx > ady ? ax + sx * ady : bx
  const cy1 = adx > ady ? by : ay + sy * adx
  ids.add(normPathId(ax, ay, cx1, cy1))
  ids.add(normPathId(cx1, cy1, bx, by))
  // diagFirst=false waypoint
  const cx2 = adx > ady ? bx - sx * ady : ax
  const cy2 = adx > ady ? ay : by - sy * adx
  ids.add(normPathId(ax, ay, cx2, cy2))
  ids.add(normPathId(cx2, cy2, bx, by))
}

const routeLineIds = computed(() => {
  if (!props.routeResult) return new Set<string>()
  return new Set(props.routeResult.segments.map(s => s.lineId))
})

const traveledSegIds = computed(() => {
  const ids = new Set<string>()
  if (!props.routeResult) return ids
  for (const seg of props.routeResult.segments) {
    for (let i = 0; i < seg.nodes.length - 1; i++) {
      const a = stationMap.get(seg.nodes[i].stationId)
      const b = stationMap.get(seg.nodes[i + 1].stationId)
      if (!a || !b) continue
      addSubSegs(ids, a.cx, a.cy, b.cx, b.cy)
    }
  }
  return ids
})

const sameStationSegIds = computed(() => {
  const ids = new Set<string>()
  if (!props.routeResult) return ids
  const c2s = new Map<string, string>()
  for (const st of stations) {
    c2s.set(`${st.cx},${st.cy}`, st.id)
  }
  for (const seg of renderSegments) {
    if (!seg.lineId.startsWith('same-')) continue
    const sa = c2s.get(`${seg.x1},${seg.y1}`)
    const sb = c2s.get(`${seg.x2},${seg.y2}`)
    if (sa && sb && routeStationIds.value.has(sa) && routeStationIds.value.has(sb)) {
      ids.add(seg.id)
    }
  }
  return ids
})

function segOpacity(seg: { id: string; lineId: string }): number {
  if (!props.routeResult) return 1
  return traveledSegIds.value.has(seg.id) || sameStationSegIds.value.has(seg.id) ? 1 : DIM_OPACITY
}

function segStroke(seg: { id: string; lineId: string; color: string }): string {
  if (!props.routeResult) return seg.color
  const isTraveled = traveledSegIds.value.has(seg.id) || sameStationSegIds.value.has(seg.id)
  if (isTraveled && seg.lineId.startsWith('ferry-')) {
    return FERRY_COLOR_HIGHLIGHT
  }
  return seg.color
}

const DIM_OPACITY = 0.12

function stationOpacity(id: string): number {
  return !routeStationIds.value.size || routeStationIds.value.has(id) ? 1 : DIM_OPACITY
}

function lineLabelOpacity(id: string): number {
  if (!routeLineIds.value.size) return 1
  const m = id.match(/^line-label-(.+?)-/)
  return m && routeLineIds.value.has(m[1]) ? 1 : DIM_OPACITY
}

const mouseCoord = ref<string | null>(null)

const cx0 = (0 - minX) * BLOCK_SIZE
const cy0 = (0 - minY) * BLOCK_SIZE
const initPanX = svgWidth / 2 - cx0
const initPanY = svgHeight / 2 - cy0

const {
  container, svgEl, panX, panY, scale, showAll,
  onMouseDown, onMouseMove, onMouseUp, onWheel,
} = useMapInteraction(initPanX, initPanY, 1)

const {
  visibleStations, labelBoxes, leaderLines, lineLabels, lineLeaderLines, gridX, gridY,
} = useLabelPlacement(showAll)

function onSvgMouseMove(e: MouseEvent) {
  onMouseMove(e)
  const svg = svgEl.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const svgX = (e.clientX - rect.left) * (svgWidth / rect.width)
  const svgY = (e.clientY - rect.top) * (svgHeight / rect.height)
  const dataX = (svgX - panX.value) / scale.value / BLOCK_SIZE + minX
  const dataY = (svgY - panY.value) / scale.value / BLOCK_SIZE + minY
  mouseCoord.value = `${dataX.toFixed(1)}, ${dataY.toFixed(1)}`
}

function onSvgMouseLeave() {
  onMouseUp()
  mouseCoord.value = null
}

function onStationClick(stationId: string) {
  emit('station-click', stationId)
}
</script>

<style scoped>
.map-container { width: 100%; height: 100%; overflow: hidden; background: #f0f0f0; touch-action: none; }
svg { display: block; }
</style>
