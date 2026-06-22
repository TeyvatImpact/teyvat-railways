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
          :stroke="seg.color"
          :stroke-width="seg.width"
          :stroke-dasharray="seg.dasharray ?? undefined"
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

        <g v-for="station in visibleStations" :key="station.id">
          <circle
            :cx="station.cx" :cy="station.cy"
            :r="transferStationIds.has(station.id) ? 7 : 5"
            fill="#1f77b4" stroke="#fff" stroke-width="2"
          />
        </g>

          <g v-for="lb in labelBoxes" :key="lb.id">
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
              :x="lb.enX" :y="lb.top + lb.h - pad"
              fill="#555" font-weight="bold" :font-size="lb.fEN"
              :font-family="lb.fontFamily"
            >{{ lb.nameEn }}</text>
          </g>

          <g v-for="lb in lineLabels" :key="lb.id">
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
              :x="lb.enX" :y="lb.top + lb.h - pad"
              fill="#555" font-weight="bold" :font-size="lb.fEN"
              :font-family="lb.fontFamily"
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
import { ref } from 'vue'
import { BLOCK_SIZE, pad, LABEL_BG } from '../config/render.config'
import { svgWidth, svgHeight, lines, transferStationIds, renderSegments, markerPaths, markerTexts, minX, minY } from '../composables/useMapData'
import { useMapInteraction } from '../composables/useMapInteraction'
import { useLabelPlacement } from '../composables/useLabelPlacement'
import LineLegend from './LineLegend.vue'
import ZoomControls from './ZoomControls.vue'

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
</script>

<style scoped>
.map-container { width: 100%; height: 100%; overflow: hidden; background: #f0f0f0; touch-action: none; }
svg { display: block; }
</style>
