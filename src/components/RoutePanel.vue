<template>
  <div
    class="border-l-(--color-outline) flex overflow-hidden transition-all duration-200"
    :class="collapsed ? 'w-0 border-none' : 'w-80'">
    <button
      class="panel-toggle shrink-0"
      :class="{ collapsed }"
      @click="collapsed = !collapsed"
      :title="collapsed ? '展开面板' : '折叠面板'">
      <span>{{ collapsed ? '◀' : '▶' }}</span>
    </button>
    <div
      v-show="!collapsed"
      class="bg-(--color-body) p-4 flex flex-col gap-2 min-w-0 flex-1 overflow-hidden">
      <div class="flex items-center justify-between mb-2">
        <h2>路径规划</h2>
      </div>
      <template v-if="!selectedRoute">
        <var-input placeholder="起点站" disabled v-model="startInput" variant="outlined" />
        <var-button class="mb-4" @click="togglePick('start')">
          {{ selectTarget === 'start' ? '请点击站点选择' : '选择起点站' }}
        </var-button>
        <var-input placeholder="终点站" disabled v-model="endInput" variant="outlined" />
        <var-button class="mb-4" @click="togglePick('end')">
          {{ selectTarget === 'end' ? '请点击站点选择' : '选择终点站' }}
        </var-button>
        <var-button :disabled="!startSelected || !endSelected" @click="calculate">
          计算路线
        </var-button>

        <var-divider></var-divider>

        <div v-if="routeError" class="result error px-4 py-4">{{ routeError }}</div>

        <div v-else-if="routeOptions.length > 0" class="flex flex-col gap-2">
          <var-card
            v-for="opt in routeOptions"
            :key="opt.metric"
            @click="selectRoute(opt)"
            class="cursor-pointer">
            <div>
              <span>{{ opt.label }}</span>
              <span>{{ opt.result.segments.length }} 段</span>
            </div>
            <div>
              <span>{{ opt.result.totalFare }} 摩拉</span>
              <span>·</span>
              <span>{{ opt.result.totalTime }} 分钟</span>
              <span>·</span>
              <span>{{ opt.result.totalDistance }} 千米</span>
            </div>
          </var-card>
        </div>
      </template>
      <RouteTimeline
        v-if="selectedRoute"
        class="flex-1 overflow-y-hidden"
        :result="selectedRoute.result"
        @close="clearResults" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  useRouting,
  METRIC_LABELS,
  type RouteMetric,
  type StationSuggestion,
  type RouteResult,
} from '../composables/useRouting';
import RouteTimeline from './RouteTimeline.vue';

interface RouteOption {
  metric: RouteMetric;
  label: string;
  result: RouteResult;
}

const emit = defineEmits<{
  (e: 'result-change', v: RouteResult | null): void;
}>();

const { selectTarget, searchStations, findRoutes } = useRouting();

const startInput = ref('');
const endInput = ref('');
const startFocused = ref(false);
const endFocused = ref(false);
const startSuggestions = ref<{ label: string; value: StationSuggestion }[]>([]);
const endSuggestions = ref<{ label: string; value: StationSuggestion }[]>([]);
const startSelected = ref<StationSuggestion | null>(null);
const endSelected = ref<StationSuggestion | null>(null);
const routeOptions = ref<RouteOption[]>([]);
const selectedRoute = ref<RouteOption | null>(null);
const routeError = ref('');
const collapsed = ref(false);

function togglePick(target: 'start' | 'end') {
  if (selectTarget.value === target) {
    selectTarget.value = null;
  } else {
    selectTarget.value = target;
  }
}

function selectStart(s: StationSuggestion) {
  startInput.value = `${s.name} (${s.id})`;
  startSelected.value = s;
  startSuggestions.value = [];
  startFocused.value = false;
  clearResults();
  routeError.value = '';
}

function selectEnd(s: StationSuggestion) {
  endInput.value = `${s.name} (${s.id})`;
  endSelected.value = s;
  endSuggestions.value = [];
  endFocused.value = false;
  clearResults();
  routeError.value = '';
}

function onStartBlur() {
  setTimeout(() => {
    startFocused.value = false;
  }, 200);
}

function onEndBlur() {
  setTimeout(() => {
    endFocused.value = false;
  }, 200);
}

function calculate() {
  if (!startSelected.value || !endSelected.value) return;
  routeError.value = '';
  clearResults();

  const results = findRoutes(startSelected.value.id, endSelected.value.id);

  if (results.length === 0) {
    routeError.value = '未找到可行路径';
    return;
  }

  const metrics: RouteMetric[] = ['fare', 'time', 'distance'];
  routeOptions.value = results.map((r, i) => ({
    metric: metrics[i],
    label: METRIC_LABELS[metrics[i]],
    result: r,
  }));
}

function selectRoute(opt: RouteOption) {
  selectedRoute.value = opt;
  emit('result-change', opt.result);
}

function clearResults() {
  routeOptions.value = [];
  selectedRoute.value = null;
  emit('result-change', null);
}

function onStationClick(stationId: string) {
  const suggestions = searchStations(stationId);
  const match = suggestions.find((s) => s.id === stationId);
  if (!match) return;

  if (selectTarget.value === 'start') {
    selectStart(match);
    selectTarget.value = null;
  } else if (selectTarget.value === 'end') {
    selectEnd(match);
    selectTarget.value = null;
  }
}

defineExpose({ onStationClick });
</script>

<style scoped>
.panel-toggle {
  width: 20px;
  background: var(--color-surface-container);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--color-text);
  padding: 0;
  transition: background 0.15s;
}
.panel-toggle:hover {
  background: var(--color-surface-container-high);
}
.panel-toggle.collapsed {
  border-left: 1px solid var(--color-outline);
}
</style>
