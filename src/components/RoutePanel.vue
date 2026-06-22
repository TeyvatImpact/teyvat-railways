<template>
  <div class="route-panel">
    <div class="panel-header">路径规划</div>

    <div class="field-group">
      <label class="field-label">起点站</label>
      <div class="input-row">
        <div class="input-wrap">
          <input
            v-model="startInput"
            placeholder="搜索站名或ID"
            @input="onStartInput"
            @focus="startFocused = true; endFocused = false"
            @blur="onStartBlur"
          />
          <ul v-if="startSuggestions.length > 0 && startFocused" class="suggestions">
            <li
              v-for="s in startSuggestions"
              :key="s.id"
              @mousedown.prevent="selectStart(s)"
            >
              <span class="sug-name">{{ s.name }} / {{ s.nameEn }}</span>
              <span class="sug-id">{{ s.id }}</span>
              <span class="sug-lines">{{ s.lines.map(l => l.name).join('、') }}</span>
            </li>
          </ul>
        </div>
        <button
          class="pick-btn"
          :class="{ active: selectTarget === 'start' }"
          @click="togglePick('start')"
        >选</button>
      </div>
      <div v-if="startSelected" class="selected-info">
        已选: {{ startSelected.name }} ({{ startSelected.id }})
      </div>
    </div>

    <div class="field-group">
      <label class="field-label">终点站</label>
      <div class="input-row">
        <div class="input-wrap">
          <input
            v-model="endInput"
            placeholder="搜索站名或ID"
            @input="onEndInput"
            @focus="endFocused = true; startFocused = false"
            @blur="onEndBlur"
          />
          <ul v-if="endSuggestions.length > 0 && endFocused" class="suggestions">
            <li
              v-for="s in endSuggestions"
              :key="s.id"
              @mousedown.prevent="selectEnd(s)"
            >
              <span class="sug-name">{{ s.name }} / {{ s.nameEn }}</span>
              <span class="sug-id">{{ s.id }}</span>
              <span class="sug-lines">{{ s.lines.map(l => l.name).join('、') }}</span>
            </li>
          </ul>
        </div>
        <button
          class="pick-btn"
          :class="{ active: selectTarget === 'end' }"
          @click="togglePick('end')"
        >选</button>
      </div>
      <div v-if="endSelected" class="selected-info">
        已选: {{ endSelected.name }} ({{ endSelected.id }})
      </div>
    </div>

    <button
      class="calc-btn"
      :disabled="!startSelected || !endSelected"
      @click="calculate"
    >计算路线</button>

    <div v-if="routeError" class="result error">{{ routeError }}</div>

    <div v-if="routeResult" class="result">
      <pre class="route-json">{{ routeJson }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouting, type StationSuggestion, type RouteResult } from '../composables/useRouting'

const {
  selectTarget,
  searchStations,
  findRoute,
} = useRouting()

const startInput = ref('')
const endInput = ref('')
const startFocused = ref(false)
const endFocused = ref(false)
const startSuggestions = ref<StationSuggestion[]>([])
const endSuggestions = ref<StationSuggestion[]>([])
const startSelected = ref<StationSuggestion | null>(null)
const endSelected = ref<StationSuggestion | null>(null)
const routeResult = ref<RouteResult | null>(null)
const routeJson = ref('')
const routeError = ref('')

let startTimer: ReturnType<typeof setTimeout> | null = null
let endTimer: ReturnType<typeof setTimeout> | null = null

function togglePick(target: 'start' | 'end') {
  if (selectTarget.value === target) {
    selectTarget.value = null
  } else {
    selectTarget.value = target
  }
}

function onStartInput() {
  if (startTimer) clearTimeout(startTimer)
  startSelected.value = null
  startTimer = setTimeout(() => {
    startSuggestions.value = searchStations(startInput.value)
  }, 150)
}

function onEndInput() {
  if (endTimer) clearTimeout(endTimer)
  endSelected.value = null
  endTimer = setTimeout(() => {
    endSuggestions.value = searchStations(endInput.value)
  }, 150)
}

function selectStart(s: StationSuggestion) {
  startInput.value = `${s.name} (${s.id})`
  startSelected.value = s
  startSuggestions.value = []
  startFocused.value = false
  routeResult.value = null
  routeJson.value = ''
  routeError.value = ''
}

function selectEnd(s: StationSuggestion) {
  endInput.value = `${s.name} (${s.id})`
  endSelected.value = s
  endSuggestions.value = []
  endFocused.value = false
  routeResult.value = null
  routeJson.value = ''
  routeError.value = ''
}

function onStartBlur() {
  setTimeout(() => { startFocused.value = false }, 200)
}

function onEndBlur() {
  setTimeout(() => { endFocused.value = false }, 200)
}

function calculate() {
  if (!startSelected.value || !endSelected.value) return
  routeError.value = ''
  routeResult.value = null
  routeJson.value = ''

  const result = findRoute(startSelected.value.id, endSelected.value.id)

  if (!result) {
    routeError.value = '未找到可行路径'
    return
  }

  routeResult.value = result
  routeJson.value = JSON.stringify(result, null, 2)
}

function onStationClick(stationId: string) {
  const suggestions = searchStations(stationId)
  const match = suggestions.find(s => s.id === stationId)
  if (!match) return

  if (selectTarget.value === 'start') {
    selectStart(match)
    selectTarget.value = null
  } else if (selectTarget.value === 'end') {
    selectEnd(match)
    selectTarget.value = null
  }
}

defineExpose({ onStationClick })
</script>

<style scoped>
.route-panel {
  width: 320px;
  min-width: 320px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  font-size: 16px;
  font-weight: bold;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  color: #333;
}

.field-group {
  padding: 10px 16px 0;
}

.field-label {
  font-size: 13px;
  color: #555;
  display: block;
  margin-bottom: 4px;
}

.input-row {
  display: flex;
  gap: 6px;
}

.input-wrap {
  flex: 1;
  position: relative;
}

.input-wrap input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.input-wrap input:focus {
  border-color: #1f77b4;
}

.pick-btn {
  width: 32px;
  padding: 6px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  flex-shrink: 0;
}

.pick-btn.active {
  background: #1f77b4;
  color: #fff;
  border-color: #1f77b4;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ccc;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 100;
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions li {
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.suggestions li:hover {
  background: #e8f0fe;
}

.sug-name {
  display: block;
  color: #333;
  font-weight: bold;
}

.sug-id {
  display: block;
  color: #888;
  font-size: 11px;
}

.sug-lines {
  display: block;
  color: #666;
  font-size: 11px;
  margin-top: 2px;
}

.selected-info {
  font-size: 11px;
  color: #1f77b4;
  margin-top: 3px;
}

.calc-btn {
  margin: 14px 16px;
  padding: 8px;
  background: #1f77b4;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.calc-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  font-size: 13px;
}

.result.error {
  color: #d32f2f;
}

.route-json {
  white-space: pre;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: #333;
  margin: 0;
}
</style>
