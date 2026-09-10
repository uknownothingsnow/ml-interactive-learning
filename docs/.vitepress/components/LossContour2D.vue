<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

// --- Types ---
type LossType = 'quadratic' | 'rosenbrock' | 'beale'

interface Point2D {
  x: number
  y: number
}

// --- Refs ---
const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const lossType = ref<LossType>('quadratic')
const learningRate = ref(0.1)
const isAnimating = ref(false)
const gradientPath = ref<Point2D[]>([])
const displayedPath = ref<Point2D[]>([])
const isDark = ref(false)
const svgWidth = ref(500)

// --- Dark mode detection ---
let observer: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

function checkDark() {
  if (typeof document !== 'undefined') {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}

// --- Loss function configs ---
const lossConfigs = {
  quadratic: {
    name: '二次函数 (Quadratic)',
    description: '最简单的凸优化问题，全局最优解在原点',
    formula: 'L(w₁, w₂) = w₁² + w₂²',
    gradient: '∇L = [2w₁, 2w₂]',
    domain: [-4, 4] as [number, number],
    startPoint: { x: 3, y: 3 },
    fn: (w1: number, w2: number) => w1 * w1 + w2 * w2,
  },
  rosenbrock: {
    name: 'Rosenbrock函数 (香蕉谷)',
    description: '经典优化测试函数，具有狭窄的抛物线形山谷',
    formula: 'L = (1-w₁)² + 5(w₂-w₁²)²',
    gradient: '∇L = [-2(1-w₁)-20w₁(w₂-w₁²), 10(w₂-w₁²)]',
    domain: [-4, 4] as [number, number],
    startPoint: { x: -2, y: 2 },
    fn: (w1: number, w2: number) => {
      return Math.pow(1 - w1, 2) + 5 * Math.pow(w2 - w1 * w1, 2)
    },
  },
  beale: {
    name: 'Beale函数 (复杂地形)',
    description: '多个局部极值点，优化难度较大',
    formula: 'L = Σ (aᵢ - w₁ + w₁·w₂ⁱ)²  /  50',
    gradient: '数值计算',
    domain: [-4.5, 4.5] as [number, number],
    startPoint: { x: -3, y: 2 },
    fn: (w1: number, w2: number) => {
      const t1 = Math.pow(1.5 - w1 + w1 * w2, 2)
      const t2 = Math.pow(2.25 - w1 + w1 * w2 * w2, 2)
      const t3 = Math.pow(2.625 - w1 + w1 * w2 * w2 * w2, 2)
      return (t1 + t2 + t3) / 50
    },
  },
}

const config = computed(() => lossConfigs[lossType.value])

// --- Numerical gradient ---
function computeGradient(w1: number, w2: number): { dw1: number; dw2: number } {
  const h = 0.0001
  const f = config.value.fn
  const dw1 = (f(w1 + h, w2) - f(w1 - h, w2)) / (2 * h)
  const dw2 = (f(w1, w2 + h) - f(w1, w2 - h)) / (2 * h)
  return { dw1, dw2 }
}

// --- Gradient descent ---
let animationTimer: ReturnType<typeof setTimeout> | null = null

function runGradientDescent() {
  if (isAnimating.value) return
  isAnimating.value = true
  displayedPath.value = []

  const cfg = config.value
  let w1 = cfg.startPoint.x
  let w2 = cfg.startPoint.y
  const [lo, hi] = cfg.domain
  const path: Point2D[] = [{ x: w1, y: w2 }]

  for (let i = 0; i < 100; i++) {
    const { dw1, dw2 } = computeGradient(w1, w2)
    w1 = Math.max(lo, Math.min(hi, w1 - learningRate.value * dw1))
    w2 = Math.max(lo, Math.min(hi, w2 - learningRate.value * dw2))
    path.push({ x: w1, y: w2 })
    if (Math.sqrt(dw1 * dw1 + dw2 * dw2) < 0.001) break
  }

  gradientPath.value = path

  // Animate the path incrementally
  let idx = 0
  function step() {
    if (idx < path.length) {
      displayedPath.value = path.slice(0, idx + 1)
      idx++
      animationTimer = setTimeout(step, 50)
    } else {
      isAnimating.value = false
    }
  }
  step()
}

function resetPath() {
  if (animationTimer) clearTimeout(animationTimer)
  isAnimating.value = false
  gradientPath.value = []
  displayedPath.value = []
}

// --- D3 Drawing ---
function drawContour() {
  if (!svgRef.value) return

  const width = svgWidth.value
  const height = width // square
  const margin = { top: 20, right: 20, bottom: 50, left: 55 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const cfg = config.value
  const [lo, hi] = cfg.domain
  const f = cfg.fn
  const resolution = 100

  // Theme colors
  const textColor = isDark.value ? '#d1d5db' : '#4b5563'
  const gridColor = isDark.value ? '#4b5563' : '#d1d5db'

  // Scales
  const xScale = d3.scaleLinear().domain([lo, hi]).range([0, innerW])
  const yScale = d3.scaleLinear().domain([lo, hi]).range([innerH, 0])

  // Compute loss values on grid
  const values = new Float64Array(resolution * resolution)
  let maxVal = -Infinity
  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const w1 = lo + (i / (resolution - 1)) * (hi - lo)
      const w2 = lo + (j / (resolution - 1)) * (hi - lo)
      let v = f(w1, w2)
      // clamp extremely large values for better contour visualization
      v = Math.min(v, 200)
      values[j * resolution + i] = v
      if (v > maxVal) maxVal = v
    }
  }

  // Generate contours
  const thresholds = d3.range(0, Math.min(maxVal, 200), Math.min(maxVal, 200) / 20)
  const contours = d3.contours()
    .size([resolution, resolution])
    .thresholds(thresholds)(Array.from(values))

  // Color scale
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, Math.min(maxVal, 200)])

  // Transform contour coordinates to SVG coordinates
  const contourTransform = d3.geoTransform({
    point(x: number, y: number) {
      const w1 = lo + (x / (resolution - 1)) * (hi - lo)
      const w2 = lo + (y / (resolution - 1)) * (hi - lo)
      this.stream.point(xScale(w1), yScale(w2))
    },
  })
  const contourPath = d3.geoPath().projection(contourTransform)

  // Draw filled contours
  g.selectAll('path.contour')
    .data(contours)
    .enter()
    .append('path')
    .attr('class', 'contour')
    .attr('d', contourPath as any)
    .attr('fill', d => colorScale(d.value))
    .attr('stroke', isDark.value ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.85)

  // Axes
  const xAxis = g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(8))
  xAxis.selectAll('text').attr('fill', textColor)
  xAxis.selectAll('line').attr('stroke', textColor)
  xAxis.select('.domain').attr('stroke', textColor)

  g.append('text')
    .attr('x', innerW / 2).attr('y', innerH + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', textColor).attr('font-size', '13px')
    .text('w₁')

  const yAxis = g.append('g').call(d3.axisLeft(yScale).ticks(8))
  yAxis.selectAll('text').attr('fill', textColor)
  yAxis.selectAll('line').attr('stroke', textColor)
  yAxis.select('.domain').attr('stroke', textColor)

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2).attr('y', -40)
    .attr('text-anchor', 'middle')
    .attr('fill', textColor).attr('font-size', '13px')
    .text('w₂')

  // Grid lines
  g.append('g').attr('opacity', 0.15)
    .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)
  g.append('g').attr('opacity', 0.15)
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickSize(-innerH).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)
  // Remove domain lines from grids
  g.selectAll('.domain').filter(function (this: SVGElement) {
    return (this.parentNode as Element)?.getAttribute('opacity') === '0.15'
  }).remove()

  // Draw gradient descent path
  const pts = displayedPath.value
  if (pts.length > 1) {
    const line = d3.line<Point2D>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))

    g.append('path')
      .datum(pts)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2')
      .attr('d', line)
  }

  // Path points
  pts.forEach((p, i) => {
    const isStart = i === 0
    const isEnd = i === pts.length - 1 && pts.length === gradientPath.value.length
    let fill = '#06b6d4'
    let r = 3
    if (isStart) { fill = '#22c55e'; r = 5 }
    else if (isEnd) { fill = '#ef4444'; r = 5 }

    g.append('circle')
      .attr('cx', xScale(p.x))
      .attr('cy', yScale(p.y))
      .attr('r', r)
      .attr('fill', fill)
      .attr('stroke', '#fff')
      .attr('stroke-width', isStart || isEnd ? 2 : 1)
  })
}

// --- Lifecycle ---
function updateSize() {
  if (containerRef.value) {
    const w = Math.min(containerRef.value.clientWidth, 600)
    svgWidth.value = Math.max(300, w)
  }
}

onMounted(() => {
  checkDark()
  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  updateSize()
  resizeObserver = new ResizeObserver(updateSize)
  if (containerRef.value) resizeObserver.observe(containerRef.value)

  nextTick(drawContour)
})

onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
  if (animationTimer) clearTimeout(animationTimer)
})

// Redraw on changes
watch([lossType, isDark, svgWidth, displayedPath], () => {
  nextTick(drawContour)
})

// Reset path when switching function
watch(lossType, () => {
  resetPath()
})
</script>

<template>
  <div class="loss-contour-container">
    <h3 class="contour-title">损失函数等高线与梯度下降</h3>
    <p class="contour-subtitle">选择不同损失函数，观察梯度下降的优化轨迹</p>

    <!-- Function selector -->
    <div class="fn-selector">
      <button
        v-for="key in (['quadratic', 'rosenbrock', 'beale'] as LossType[])"
        :key="key"
        class="fn-btn"
        :class="{ active: lossType === key }"
        @click="lossType = key"
        :disabled="isAnimating"
      >
        {{ lossConfigs[key].name }}
      </button>
    </div>

    <!-- Info panel -->
    <div class="info-panel">
      <div class="info-row">
        <span class="info-label">公式:</span>
        <span class="info-value mono">{{ config.formula }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">梯度:</span>
        <span class="info-value mono">{{ config.gradient }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">说明:</span>
        <span class="info-value">{{ config.description }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="lr-control">
        <label>
          学习率 α:
          <span class="lr-value">{{ learningRate.toFixed(2) }}</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="0.5"
          step="0.01"
          v-model.number="learningRate"
          :disabled="isAnimating"
        />
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" @click="runGradientDescent" :disabled="isAnimating">
          {{ isAnimating ? `迭代中... (${displayedPath.length - 1})` : '▶ 运行梯度下降' }}
        </button>
        <button class="btn" @click="resetPath" :disabled="isAnimating">重置</button>
      </div>
    </div>

    <!-- SVG container -->
    <div class="svg-wrap" ref="containerRef">
      <svg ref="svgRef" />
    </div>

    <!-- Iteration count -->
    <div v-if="displayedPath.length > 1" class="iteration-info">
      迭代次数: <strong>{{ displayedPath.length - 1 }}</strong>
    </div>

    <!-- Legend -->
    <div class="legend">
      <span class="legend-item"><span class="dot green" /> 起点</span>
      <span class="legend-item"><span class="dot cyan" /> 优化路径</span>
      <span class="legend-item"><span class="dot red" /> 终点</span>
      <span class="legend-tip">💡 调整学习率，观察优化轨迹的变化</span>
    </div>
  </div>
</template>

<style scoped>
.loss-contour-container {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 24px;
  margin: 1.5em 0;
}

.contour-title {
  text-align: center;
  font-size: 1.3em;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 0 0 4px;
}

.contour-subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
  font-size: 0.9em;
}

/* Function selector tabs */
.fn-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 16px;
}

.fn-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  border: 2px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.2s;
}

.fn-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}

.fn-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.fn-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Info panel */
.info-panel {
  background: var(--vp-c-bg);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  gap: 8px;
  margin: 4px 0;
  font-size: 0.88em;
  line-height: 1.6;
}

.info-label {
  font-weight: 600;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.info-value {
  color: var(--vp-c-text-1);
}

.info-value.mono {
  font-family: var(--vp-font-family-mono);
  font-size: 0.92em;
}

/* Controls */
.controls {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.lr-control {
  flex: 1;
  min-width: 180px;
}

.lr-control label {
  display: block;
  font-size: 0.88em;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.lr-value {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.lr-control input[type="range"] {
  width: 100%;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.88em;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.2s;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}

.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

/* SVG container */
.svg-wrap {
  display: flex;
  justify-content: center;
  background: var(--vp-c-bg);
  border-radius: 10px;
  padding: 8px;
  overflow: hidden;
}

.svg-wrap svg {
  max-width: 100%;
  height: auto;
}

/* Iteration info */
.iteration-info {
  text-align: center;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
  margin-top: 12px;
}

.iteration-info strong {
  color: var(--vp-c-brand-1);
  font-size: 1.2em;
}

/* Legend */
.legend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 12px;
  font-size: 0.82em;
  color: var(--vp-c-text-2);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.green { background: #22c55e; }
.dot.cyan { background: #06b6d4; }
.dot.red { background: #ef4444; }

.legend-tip {
  color: var(--vp-c-text-3);
  font-size: 0.95em;
}

@media (max-width: 640px) {
  .loss-contour-container {
    padding: 16px;
  }
  .fn-selector {
    flex-direction: column;
  }
  .controls {
    flex-direction: column;
  }
  .btn-group {
    width: 100%;
  }
  .btn-group .btn {
    flex: 1;
  }
}
</style>
