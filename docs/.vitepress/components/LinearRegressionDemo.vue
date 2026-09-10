<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

interface DataPoint {
  x: number
  y: number
}

// --- Refs ---
const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const data = ref<DataPoint[]>([])
const slope = ref(2)
const intercept = ref(1)
const showBestFit = ref(false)
const isTraining = ref(false)
const isDark = ref(false)
const chartWidth = ref(600)

// --- Dark mode detection ---
let observer: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

function checkDark() {
  if (typeof document !== 'undefined') {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}

// --- Theme colors ---
const themeColors = computed(() => {
  const dark = isDark.value
  return {
    text: dark ? '#e5e7eb' : '#374151',
    gridLines: dark ? '#4b5563' : '#9ca3af',
    axisText: dark ? '#d1d5db' : '#4b5563',
    bg: dark ? '#1e1e2e' : '#ffffff',
    // Visualization-specific (fixed)
    fitLine: '#58C4DD',
    dataPoint: '#F59E0B',
    residual: '#EF4444',
    bestFit: '#10B981',
    pointStroke: dark ? '#ffffff' : '#ffffff',
  }
})

// --- Generate initial data ---
function generateData() {
  const points: DataPoint[] = []
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 10
    const y = 2 * x + 1 + (Math.random() - 0.5) * 4
    points.push({ x, y })
  }
  data.value = points
}

// --- Least-squares best fit ---
const bestFit = computed(() => {
  const pts = data.value
  if (pts.length === 0) return { slope: 0, intercept: 0 }

  const n = pts.length
  const sumX = pts.reduce((s, p) => s + p.x, 0)
  const sumY = pts.reduce((s, p) => s + p.y, 0)
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)

  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const b = (sumY - m * sumX) / n
  return { slope: m, intercept: b }
})

// --- MSE loss ---
function calculateLoss(m: number, b: number): number {
  const pts = data.value
  if (pts.length === 0) return 0
  return pts.reduce((sum, p) => {
    const err = p.y - (m * p.x + b)
    return sum + err * err
  }, 0) / pts.length
}

const currentLoss = computed(() => calculateLoss(slope.value, intercept.value))
const bestLoss = computed(() => calculateLoss(bestFit.value.slope, bestFit.value.intercept))

// --- Gradient descent training ---
async function trainModel() {
  isTraining.value = true
  let currentSlope = slope.value
  let currentIntercept = intercept.value
  const learningRate = 0.01
  const iterations = 100
  const pts = data.value

  for (let i = 0; i < iterations; i++) {
    let gradSlope = 0
    let gradIntercept = 0

    for (const point of pts) {
      const predicted = currentSlope * point.x + currentIntercept
      const error = predicted - point.y
      gradSlope += (2 / pts.length) * error * point.x
      gradIntercept += (2 / pts.length) * error
    }

    currentSlope -= learningRate * gradSlope
    currentIntercept -= learningRate * gradIntercept

    if (i % 5 === 0) {
      slope.value = currentSlope
      intercept.value = currentIntercept
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  slope.value = currentSlope
  intercept.value = currentIntercept
  isTraining.value = false
}

// --- Draw chart ---
function drawChart() {
  if (!svgRef.value || data.value.length === 0) return

  const colors = themeColors.value
  const width = chartWidth.value
  const height = Math.round(width * 0.8) // 5:4 ratio
  const margin = { top: 20, right: 20, bottom: 50, left: 60 }

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  const g = svg
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Background
  svg.insert('rect', ':first-child')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', colors.bg)
    .attr('rx', 8)

  // Scales
  const pts = data.value
  const xExtent = d3.extent(pts, d => d.x) as [number, number]
  const yExtent = d3.extent(pts, d => d.y) as [number, number]

  const xScale = d3.scaleLinear()
    .domain([Math.min(0, xExtent[0] - 1), xExtent[1] + 1])
    .range([0, innerWidth])

  const yScale = d3.scaleLinear()
    .domain([Math.min(0, yExtent[0] - 1), yExtent[1] + 1])
    .range([innerHeight, 0])

  // Grid lines
  g.append('g')
    .attr('class', 'grid')
    .attr('opacity', 0.15)
    .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
    .selectAll('line')
    .attr('stroke', colors.gridLines)

  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .attr('opacity', 0.15)
    .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
    .selectAll('line')
    .attr('stroke', colors.gridLines)

  // Remove domain lines from grids
  g.selectAll('.grid .domain').remove()

  // X axis
  const xAxis = g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
  xAxis.selectAll('text').attr('fill', colors.axisText)
  xAxis.selectAll('line,path').attr('stroke', colors.axisText)

  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', colors.text)
    .attr('font-size', '13px')
    .text('x')

  // Y axis
  const yAxis = g.append('g').call(d3.axisLeft(yScale))
  yAxis.selectAll('text').attr('fill', colors.axisText)
  yAxis.selectAll('line,path').attr('stroke', colors.axisText)

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -40)
    .attr('text-anchor', 'middle')
    .attr('fill', colors.text)
    .attr('font-size', '13px')
    .text('y')

  // Best fit line (if visible)
  const bf = bestFit.value
  if (showBestFit.value) {
    const bx0 = xScale.domain()[0]
    const bx1 = xScale.domain()[1]
    g.append('line')
      .attr('x1', xScale(bx0))
      .attr('y1', yScale(bf.slope * bx0 + bf.intercept))
      .attr('x2', xScale(bx1))
      .attr('y2', yScale(bf.slope * bx1 + bf.intercept))
      .attr('stroke', colors.bestFit)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.7)
  }

  // Current fit line
  const cx0 = xScale.domain()[0]
  const cx1 = xScale.domain()[1]
  g.append('line')
    .attr('x1', xScale(cx0))
    .attr('y1', yScale(slope.value * cx0 + intercept.value))
    .attr('x2', xScale(cx1))
    .attr('y2', yScale(slope.value * cx1 + intercept.value))
    .attr('stroke', colors.fitLine)
    .attr('stroke-width', 3)

  // Residual lines
  pts.forEach(point => {
    const predicted = slope.value * point.x + intercept.value
    g.append('line')
      .attr('x1', xScale(point.x))
      .attr('y1', yScale(point.y))
      .attr('x2', xScale(point.x))
      .attr('y2', yScale(predicted))
      .attr('stroke', colors.residual)
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)
  })

  // Data points
  g.selectAll('circle')
    .data(pts)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .attr('fill', colors.dataPoint)
    .attr('stroke', colors.pointStroke)
    .attr('stroke-width', 2)
}

// --- Lifecycle ---
onMounted(() => {
  checkDark()
  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  generateData()

  // Responsive sizing
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        chartWidth.value = Math.max(300, Math.min(600, w))
      }
    })
    resizeObserver.observe(containerRef.value)
    chartWidth.value = Math.max(300, Math.min(600, containerRef.value.clientWidth))
  }
})

onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
})

// Watch and redraw
watch([data, slope, intercept, showBestFit, isDark, chartWidth], drawChart, { flush: 'post' })
</script>

<template>
  <div class="lr-demo">
    <div class="main-grid">
      <!-- Chart -->
      <div class="chart-col" ref="containerRef">
        <svg ref="svgRef" class="chart-svg"></svg>
      </div>

      <!-- Controls -->
      <div class="side-col">
        <!-- Model parameters -->
        <div class="card">
          <h4 class="card-title">模型参数</h4>

          <div class="param-group">
            <label class="param-label">
              斜率 (slope): <strong class="text-brand">{{ slope.toFixed(2) }}</strong>
            </label>
            <input
              type="range" min="-5" max="5" step="0.1"
              :value="slope"
              :disabled="isTraining"
              @input="slope = Number(($event.target as HTMLInputElement).value)"
              class="slider"
            />
          </div>

          <div class="param-group">
            <label class="param-label">
              截距 (intercept): <strong class="text-brand">{{ intercept.toFixed(2) }}</strong>
            </label>
            <input
              type="range" min="-10" max="10" step="0.1"
              :value="intercept"
              :disabled="isTraining"
              @input="intercept = Number(($event.target as HTMLInputElement).value)"
              class="slider"
            />
          </div>

          <div class="model-eq">
            <span class="eq-label">当前模型:</span>
            <span class="eq-formula">
              y = <strong class="text-brand">{{ slope.toFixed(2) }}</strong>x +
              <strong class="text-brand">{{ intercept.toFixed(2) }}</strong>
            </span>
          </div>
        </div>

        <!-- Loss display -->
        <div class="card">
          <h4 class="card-title">损失函数 (MSE)</h4>
          <div class="loss-row">
            <span>当前损失:</span>
            <strong class="loss-value text-brand">{{ currentLoss.toFixed(2) }}</strong>
          </div>
          <div v-if="showBestFit" class="loss-row best">
            <span>最优损失:</span>
            <strong class="loss-value text-green">{{ bestLoss.toFixed(2) }}</strong>
          </div>
        </div>

        <!-- Buttons -->
        <div class="btn-group">
          <button class="btn btn-primary" :disabled="isTraining" @click="trainModel">
            {{ isTraining ? '训练中...' : '🚀 梯度下降训练' }}
          </button>
          <button class="btn btn-green" @click="showBestFit = !showBestFit">
            {{ showBestFit ? '隐藏最优解' : '显示最优解' }}
          </button>
          <button class="btn" @click="slope = 0; intercept = 0">
            重置参数
          </button>
        </div>

        <!-- Best fit info -->
        <div v-if="showBestFit" class="best-fit-card">
          <h4 class="best-fit-title">最优参数</h4>
          <span class="eq-formula">
            y = <strong class="text-green">{{ bestFit.slope.toFixed(2) }}</strong>x +
            <strong class="text-green">{{ bestFit.intercept.toFixed(2) }}</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-grid">
        <div><span class="legend-dot yellow">●</span> 训练数据点</div>
        <div><span class="legend-line blue">━</span> 当前拟合线</div>
        <div><span class="legend-line red">|</span> 预测误差（残差）</div>
      </div>
      <p class="legend-hint">
        💡 手动调整斜率和截距，观察损失函数的变化。点击"梯度下降训练"观看算法自动寻找最优解的过程。
      </p>
    </div>
  </div>
</template>

<style scoped>
.lr-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}

/* Layout */
.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .main-grid { grid-template-columns: 2fr 1fr; }
}
.chart-col {
  display: flex;
  justify-content: center;
  overflow-x: auto;
}
.chart-svg {
  border-radius: 8px;
  max-width: 100%;
  height: auto;
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Cards */
.card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin: 0 0 12px 0;
}

/* Parameter controls */
.param-group {
  margin-bottom: 12px;
}
.param-label {
  display: block;
  font-size: 13px;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}
.slider {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}

/* Model equation */
.model-eq {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 12px;
  padding-top: 12px;
}
.eq-label {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}
.eq-formula {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

/* Loss display */
.loss-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--vp-c-text-1);
  padding: 4px 0;
}
.loss-row.best {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 4px;
  padding-top: 8px;
  font-size: 12px;
}
.loss-value {
  font-size: 20px;
  font-weight: 700;
}
.loss-row.best .loss-value {
  font-size: 14px;
}

/* Buttons */
.btn-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.2s;
}
.btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white, #fff);
  border-color: var(--vp-c-brand-1);
}
.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}
.btn-green {
  background: #10B981;
  color: #fff;
  border-color: #10B981;
}
.btn-green:hover {
  background: #059669;
}

/* Best fit card */
.best-fit-card {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
}
.best-fit-title {
  font-size: 12px;
  font-weight: 600;
  color: #10B981;
  margin: 0 0 4px 0;
}

/* Legend */
.legend {
  margin-top: 20px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}
.legend-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
@media (max-width: 640px) {
  .legend-grid { grid-template-columns: 1fr; }
}
.legend-dot { font-weight: 700; margin-right: 4px; }
.legend-dot.yellow { color: #F59E0B; }
.legend-line { font-weight: 700; margin-right: 4px; }
.legend-line.blue { color: #58C4DD; }
.legend-line.red { color: #EF4444; }
.legend-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

/* Color helpers */
.text-brand { color: var(--vp-c-brand-1); }
.text-green { color: #10B981; }

/* Dark mode tweaks */
:global(.dark) .best-fit-card {
  background: rgba(16, 185, 129, 0.12);
}
:global(.dark) .text-green { color: #34d399; }
:global(.dark) .best-fit-title { color: #34d399; }
</style>
