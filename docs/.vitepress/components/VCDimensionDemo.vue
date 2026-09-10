<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Point {
  x: number
  y: number
  label: 0 | 1
}

const numPoints = ref(3)
const points = ref<Point[]>([
  { x: 150, y: 250, label: 0 },
  { x: 300, y: 100, label: 0 },
  { x: 450, y: 250, label: 0 }
])
const canShatter = ref(true)

function checkShatter(pts: Point[]) {
  if (pts.length > 3) {
    canShatter.value = false
    return
  }
  if (pts.length === 3) {
    const [p1, p2, p3] = pts
    const area = Math.abs(
      (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
    )
    if (area < 10) {
      const xorLabels = pts.filter(p => p.label === 1).length
      canShatter.value = xorLabels === 0 || xorLabels === 3
    } else {
      canShatter.value = true
    }
  } else {
    canShatter.value = true
  }
}

function togglePointLabel(index: number) {
  const newPoints = [...points.value]
  newPoints[index] = {
    ...newPoints[index],
    label: newPoints[index].label === 0 ? 1 : 0
  }
  points.value = newPoints
  checkShatter(newPoints)
}

function resetPoints() {
  const defaultPoints: Point[] = []
  if (numPoints.value === 2) {
    defaultPoints.push({ x: 200, y: 200, label: 0 })
    defaultPoints.push({ x: 400, y: 200, label: 0 })
  } else if (numPoints.value === 3) {
    defaultPoints.push({ x: 150, y: 250, label: 0 })
    defaultPoints.push({ x: 300, y: 100, label: 0 })
    defaultPoints.push({ x: 450, y: 250, label: 0 })
  } else {
    defaultPoints.push({ x: 200, y: 150, label: 0 })
    defaultPoints.push({ x: 400, y: 150, label: 1 })
    defaultPoints.push({ x: 200, y: 250, label: 1 })
    defaultPoints.push({ x: 400, y: 250, label: 0 })
  }
  points.value = defaultPoints
  checkShatter(defaultPoints)
}

function onNumPointsChange(e: Event) {
  const newNum = Number((e.target as HTMLInputElement).value)
  numPoints.value = newNum
  resetPoints()
}

const totalLabelings = computed(() => Math.pow(2, numPoints.value))
const achievedLabelings = computed(() =>
  canShatter.value ? totalLabelings.value : totalLabelings.value - 1
)

const textColor = computed(() => {
  if (typeof document === 'undefined') return '#333'
  return getComputedStyle(document.documentElement).getPropertyValue('--vp-c-text-1').trim() || '#333'
})

const gridColor = computed(() => {
  if (typeof document === 'undefined') return '#e2e2e3'
  return getComputedStyle(document.documentElement).getPropertyValue('--vp-c-divider').trim() || '#e2e2e3'
})
</script>

<template>
  <div class="vc-wrapper">
    <div class="vc-canvas-container">
      <h3 class="vc-section-title">二维线性分类器的VC维</h3>
      <svg width="600" height="350" viewBox="0 0 600 350" class="vc-svg">
        <defs>
          <pattern id="vc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" :stroke="gridColor" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="600" height="350" fill="url(#vc-grid)" />

        <line
          v-if="canShatter && numPoints <= 3"
          x1="50" y1="320" x2="550" y2="30"
          stroke="#10b981" stroke-width="2" stroke-dasharray="5,5" opacity="0.5"
        />

        <g v-for="(point, idx) in points" :key="idx">
          <circle
            :cx="point.x" :cy="point.y" r="20"
            :fill="point.label === 0 ? '#ef4444' : '#06b6d4'"
            stroke="#eab308" stroke-width="2"
            style="cursor: pointer;"
            @click="togglePointLabel(idx)"
          />
          <text
            :x="point.x" :y="point.y"
            text-anchor="middle" dy=".35em"
            fill="#fff" font-size="14" font-weight="bold"
            pointer-events="none"
          >
            {{ point.label }}
          </text>
        </g>

        <text x="300" y="25" text-anchor="middle" :fill="textColor" font-size="13" opacity="0.7">
          点击圆圈切换标签
        </text>
      </svg>
    </div>

    <div class="vc-control-card">
      <label class="vc-label">点的数量: {{ numPoints }}</label>
      <input
        type="range" min="2" max="4"
        :value="numPoints"
        @input="onNumPointsChange"
        class="vc-slider"
      />
      <div class="vc-tick-labels">
        <span>2</span>
        <span>3 (VC维)</span>
        <span>4</span>
      </div>
    </div>

    <div :class="['vc-status', canShatter ? 'vc-status--ok' : 'vc-status--fail']">
      <div class="vc-status-icon">{{ canShatter ? '✓' : '✗' }}</div>
      <div>
        <h3 class="vc-status-title">{{ canShatter ? '可以打散！' : '无法打散' }}</h3>
        <p class="vc-status-desc">
          {{ canShatter
            ? '线性分类器可以实现所有可能的标记组合'
            : '存在某些标记组合无法被线性分类器分开'
          }}
        </p>
      </div>
    </div>

    <div class="vc-stats-row">
      <div class="vc-stat-box">
        <div class="vc-stat-label">可能的标记</div>
        <div class="vc-stat-value">{{ totalLabelings }}</div>
      </div>
      <div class="vc-stat-box">
        <div class="vc-stat-label">可实现的标记</div>
        <div :class="['vc-stat-value', canShatter ? 'vc-stat--ok' : 'vc-stat--fail']">
          {{ achievedLabelings }}
        </div>
      </div>
    </div>

    <button class="vc-btn" @click="resetPoints">🔄 重置点配置</button>
  </div>
</template>

<style scoped>
.vc-wrapper { display: flex; flex-direction: column; gap: 16px; }
.vc-canvas-container {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
}
.vc-section-title {
  font-size: 1.1em;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}
.vc-svg {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.vc-control-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
}
.vc-label {
  display: block;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}
.vc-slider {
  width: 100%;
  height: 6px;
  border-radius: 4px;
  cursor: pointer;
  accent-color: var(--vp-c-brand-1);
}
.vc-tick-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75em;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}
.vc-status {
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 12px;
  padding: 20px;
  border: 2px solid;
}
.vc-status--ok {
  background: rgba(16, 185, 129, 0.08);
  border-color: #10b981;
}
.vc-status--fail {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
}
.vc-status-icon { font-size: 2.5em; font-weight: 700; }
.vc-status--ok .vc-status-icon { color: #10b981; }
.vc-status--fail .vc-status-icon { color: #ef4444; }
.vc-status-title { font-size: 1.2em; font-weight: 700; color: var(--vp-c-text-1); }
.vc-status--ok .vc-status-title { color: #10b981; }
.vc-status--fail .vc-status-title { color: #ef4444; }
.vc-status-desc { font-size: 0.85em; color: var(--vp-c-text-2); margin-top: 4px; }
.vc-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.vc-stat-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
.vc-stat-label { font-size: 0.8em; color: var(--vp-c-text-2); margin-bottom: 4px; }
.vc-stat-value { font-size: 1.8em; font-weight: 700; color: var(--vp-c-text-1); }
.vc-stat--ok { color: #10b981 !important; }
.vc-stat--fail { color: #ef4444 !important; }
.vc-btn {
  width: 100%;
  padding: 10px 16px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95em;
  cursor: pointer;
  transition: opacity 0.2s;
}
.vc-btn:hover { opacity: 0.85; }
</style>
