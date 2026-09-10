<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'

interface Point {
  x: number
  y: number
  cluster: number
}

interface Centroid {
  x: number
  y: number
}

const svgRef = ref<SVGSVGElement | null>(null)
const k = ref(3)
const points = ref<Point[]>([])
const centroids = ref<Centroid[]>([])
const iteration = ref(0)
const isRunning = ref(false)
const converged = ref(false)
const inertia = ref(0)

const WIDTH = 520
const HEIGHT = 380
const PADDING = 40

const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4']

function dist(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

function initializePoints() {
  const pts: Point[] = []
  const n = 100
  for (let i = 0; i < n; i++) {
    let x: number, y: number
    const g = i % 3
    if (g === 0) { x = 150 + Math.random() * 100; y = 120 + Math.random() * 100 }
    else if (g === 1) { x = 320 + Math.random() * 100; y = 120 + Math.random() * 100 }
    else { x = 220 + Math.random() * 100; y = 230 + Math.random() * 100 }
    pts.push({
      x: Math.max(PADDING, Math.min(WIDTH - PADDING, x)),
      y: Math.max(PADDING, Math.min(HEIGHT - PADDING, y)),
      cluster: -1
    })
  }
  points.value = pts
  centroids.value = []
  iteration.value = 0
  converged.value = false
  isRunning.value = false
  inertia.value = 0
}

function initializeCentroids() {
  const pts = points.value
  if (pts.length === 0) return
  const cs: Centroid[] = []
  const used = new Set<number>()
  const first = Math.floor(Math.random() * pts.length)
  cs.push({ x: pts[first].x, y: pts[first].y })
  used.add(first)
  for (let i = 1; i < k.value; i++) {
    const dists = pts.map(p => {
      const md = Math.min(...cs.map(c => dist(p, c)))
      return md ** 2
    })
    const total = dists.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    for (let j = 0; j < pts.length; j++) {
      if (used.has(j)) continue
      r -= dists[j]
      if (r <= 0) { cs.push({ x: pts[j].x, y: pts[j].y }); used.add(j); break }
    }
  }
  centroids.value = cs
  iteration.value = 0
  converged.value = false
}

function assignAndUpdate() {
  const cs = centroids.value
  if (cs.length === 0) return
  // Assign
  const newPts = points.value.map(p => {
    let minD = Infinity, closest = 0
    cs.forEach((c, idx) => { const d = dist(p, c); if (d < minD) { minD = d; closest = idx } })
    return { ...p, cluster: closest }
  })
  points.value = newPts
  // Update centroids
  const newCs: Centroid[] = []
  for (let i = 0; i < k.value; i++) {
    const cp = newPts.filter(p => p.cluster === i)
    if (cp.length === 0) { newCs.push(cs[i]); continue }
    newCs.push({
      x: cp.reduce((s, p) => s + p.x, 0) / cp.length,
      y: cp.reduce((s, p) => s + p.y, 0) / cp.length
    })
  }
  const moved = cs.some((old, idx) => dist(old, newCs[idx]) > 0.5)
  centroids.value = newCs
  converged.value = !moved
  inertia.value = newPts.reduce((sum, p) => {
    const c = newCs[p.cluster]
    return c ? sum + dist(p, c) ** 2 : sum
  }, 0)
  iteration.value++
  if (!moved) isRunning.value = false
}

function step() {
  if (centroids.value.length === 0) { initializeCentroids(); return }
  if (!converged.value) assignAndUpdate()
}

function runToConvergence() {
  if (centroids.value.length === 0) initializeCentroids()
  isRunning.value = true
}

watch([isRunning, converged, iteration], () => {
  if (isRunning.value && !converged.value) {
    setTimeout(assignAndUpdate, 500)
  }
})

function drawChart() {
  if (!svgRef.value) return
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-text-1').trim() || '#333'
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-divider').trim() || '#e2e2e3'
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-bg').trim() || '#fff'

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)

  svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', bgColor).attr('rx', 8)

  // Grid
  for (let i = 0; i <= 10; i++) {
    const gx = PADDING + (i * (WIDTH - 2 * PADDING)) / 10
    const gy = PADDING + (i * (HEIGHT - 2 * PADDING)) / 10
    svg.append('line').attr('x1', gx).attr('y1', PADDING).attr('x2', gx).attr('y2', HEIGHT - PADDING)
      .attr('stroke', gridColor).attr('stroke-width', 0.5)
    svg.append('line').attr('x1', PADDING).attr('y1', gy).attr('x2', WIDTH - PADDING).attr('y2', gy)
      .attr('stroke', gridColor).attr('stroke-width', 0.5)
  }

  const cs = centroids.value
  const pts = points.value

  // Lines from centroids to points
  cs.forEach((c, idx) => {
    pts.filter(p => p.cluster === idx).forEach(p => {
      svg.append('line').attr('x1', c.x).attr('y1', c.y).attr('x2', p.x).attr('y2', p.y)
        .attr('stroke', COLORS[idx]).attr('stroke-width', 0.5).attr('opacity', 0.15)
    })
  })

  // Points
  pts.forEach(p => {
    const color = p.cluster >= 0 && p.cluster < COLORS.length ? COLORS[p.cluster] : '#999'
    svg.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', 4)
      .attr('fill', color).attr('stroke', textColor).attr('stroke-width', 0.5).attr('opacity', 0.85)
  })

  // Centroids
  cs.forEach((c, idx) => {
    svg.append('circle').attr('cx', c.x).attr('cy', c.y).attr('r', 10)
      .attr('fill', COLORS[idx]).attr('stroke', textColor).attr('stroke-width', 2)
    svg.append('line').attr('x1', c.x - 5).attr('y1', c.y - 5).attr('x2', c.x + 5).attr('y2', c.y + 5)
      .attr('stroke', textColor).attr('stroke-width', 2)
    svg.append('line').attr('x1', c.x + 5).attr('y1', c.y - 5).attr('x2', c.x - 5).attr('y2', c.y + 5)
      .attr('stroke', textColor).attr('stroke-width', 2)
  })
}

watch([points, centroids], drawChart, { flush: 'post' })
onMounted(() => { initializePoints() })
</script>

<template>
  <div class="km-demo">
    <!-- SVG chart -->
    <div class="km-chart-wrap">
      <svg ref="svgRef" class="km-chart-svg"></svg>
    </div>

    <!-- Controls row -->
    <div class="km-controls">
      <div class="km-ctrl-card">
        <label class="km-label">簇数量 (K): <strong>{{ k }}</strong></label>
        <input type="range" min="2" max="6" :value="k"
          @input="k = Number(($event.target as HTMLInputElement).value); centroids = []; iteration = 0; converged = false"
          class="km-slider" :disabled="isRunning" />
        <div class="km-ticks"><span>2</span><span>6</span></div>
      </div>
      <div class="km-ctrl-card">
        <div class="km-stats">
          <div><span class="km-stat-label">迭代次数</span><span class="km-stat-val blue">{{ iteration }}</span></div>
          <div><span class="km-stat-label">簇内平方和</span><span class="km-stat-val purple">{{ inertia > 0 ? Math.round(inertia) : '-' }}</span></div>
        </div>
      </div>
    </div>

    <!-- Buttons -->
    <div class="km-buttons">
      <button class="km-btn" @click="initializePoints" :disabled="isRunning">重置数据</button>
      <button class="km-btn" @click="initializeCentroids" :disabled="isRunning || points.length === 0">初始化质心</button>
      <button class="km-btn km-btn-primary" @click="step" :disabled="isRunning || converged || centroids.length === 0">单步执行</button>
      <button class="km-btn km-btn-accent" @click="runToConvergence" :disabled="isRunning || converged">运行至收敛</button>
      <span v-if="converged" class="km-converged">已收敛</span>
    </div>

    <!-- Legend -->
    <div class="km-legend">
      <div class="km-legend-item"><span class="km-dot" style="background:#3b82f6"></span> 数据点（按簇着色）</div>
      <div class="km-legend-item"><span class="km-dot km-dot-big" style="background:#a855f7"></span> 质心（簇中心）</div>
    </div>

    <!-- Algorithm notes -->
    <div class="km-notes">
      <strong>K-means算法步骤：</strong>
      <ol>
        <li><strong>初始化</strong>：随机选择K个点作为初始质心（使用K-means++改进初始化）</li>
        <li><strong>分配</strong>：将每个点分配到最近的质心，形成K个簇</li>
        <li><strong>更新</strong>：计算每个簇的均值，更新质心位置</li>
        <li><strong>重复</strong>：重复步骤2-3直到质心不再移动（收敛）</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.km-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.km-chart-wrap { display: flex; justify-content: center; overflow-x: auto; }
.km-chart-svg { border-radius: 8px; max-width: 100%; height: auto; }
.km-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
@media (max-width: 600px) { .km-controls { grid-template-columns: 1fr; } }
.km-ctrl-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 14px;
}
.km-label { display: block; font-size: 14px; color: var(--vp-c-text-1); margin-bottom: 8px; }
.km-slider { width: 100%; accent-color: #3b82f6; }
.km-ticks { display: flex; justify-content: space-between; font-size: 12px; color: var(--vp-c-text-3); margin-top: 2px; }
.km-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: center; }
.km-stat-label { display: block; font-size: 12px; color: var(--vp-c-text-3); margin-bottom: 4px; }
.km-stat-val { display: block; font-size: 22px; font-weight: 700; }
.km-stat-val.blue { color: #3b82f6; }
.km-stat-val.purple { color: #a855f7; }
.km-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; align-items: center; }
.km-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.km-btn:hover:not(:disabled) { border-color: var(--vp-c-brand-1); }
.km-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.km-btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; font-weight: 600; }
.km-btn-primary:hover:not(:disabled) { background: #2563eb; }
.km-btn-accent { background: #a855f7; color: #fff; border-color: #a855f7; font-weight: 600; }
.km-btn-accent:hover:not(:disabled) { background: #9333ea; }
.km-converged {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.4);
  color: #10b981;
  font-weight: 600;
  font-size: 14px;
}
.km-legend {
  display: flex; flex-wrap: wrap; gap: 16px;
  margin-top: 16px; padding: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px; color: var(--vp-c-text-2);
}
.km-legend-item { display: flex; align-items: center; gap: 6px; }
.km-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.km-dot-big { width: 14px; height: 14px; border: 2px solid var(--vp-c-text-1); }
.km-notes {
  margin-top: 16px; padding: 14px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 8px;
  font-size: 13px; color: var(--vp-c-text-2); line-height: 1.7;
}
.km-notes ol { padding-left: 20px; margin-top: 6px; }
.km-notes li { margin-bottom: 2px; }
</style>
