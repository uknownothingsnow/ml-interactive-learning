<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

interface Point {
  x: number
  y: number
}

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const currentX = ref(8)
const learningRate = ref(0.1)
const path = ref<Point[]>([])
const isAnimating = ref(false)
const iteration = ref(0)
const isDark = ref(false)
const svgWidth = ref(600)

// Detect dark mode
let observer: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

function checkDark() {
  if (typeof document !== 'undefined') {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}

// Loss function: f(x) = (x-2)^2 + 1
function lossFunction(x: number): number {
  return Math.pow(x - 2, 2) + 1
}

// Gradient: f'(x) = 2(x-2)
function gradient(x: number): number {
  return 2 * (x - 2)
}

const currentLoss = () => lossFunction(currentX.value)
const currentGrad = () => gradient(currentX.value)

// Run gradient descent animation
async function runGradientDescent() {
  isAnimating.value = true
  path.value = []
  iteration.value = 0

  let x = currentX.value
  const newPath: Point[] = [{ x, y: lossFunction(x) }]
  let iter = 0

  for (let i = 0; i < 50; i++) {
    const grad = gradient(x)
    x = x - learningRate.value * grad

    const loss = lossFunction(x)
    newPath.push({ x, y: loss })

    currentX.value = x
    path.value = [...newPath]
    iteration.value = ++iter

    await new Promise(resolve => setTimeout(resolve, 200))

    // Stop if gradient is very small
    if (Math.abs(grad) < 0.01) break
  }

  isAnimating.value = false
}

function clearPath() {
  path.value = []
  iteration.value = 0
}

function onStartPosChange(val: number) {
  currentX.value = val
  path.value = []
  iteration.value = 0
}

// --- Draw chart with D3 ---
function drawChart() {
  if (!svgRef.value) return

  const dark = isDark.value
  const textColor = dark ? '#e5e7eb' : '#374151'
  const gridColor = dark ? '#4b5563' : '#9ca3af'
  const axisColor = dark ? '#d1d5db' : '#4b5563'
  const bgColor = dark ? '#1e1e2e' : '#ffffff'

  const width = svgWidth.value
  const height = Math.round(width * 0.575) // ~4:2.3 ratio
  const margin = { top: 20, right: 20, bottom: 50, left: 60 }

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)

  // Background
  svg.append('rect')
    .attr('width', width).attr('height', height)
    .attr('fill', bgColor).attr('rx', 8)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Scales
  const xScale = d3.scaleLinear().domain([-2, 10]).range([0, innerWidth])
  const yScale = d3.scaleLinear().domain([0, 70]).range([innerHeight, 0])

  // Grid lines
  g.append('g').attr('opacity', 0.15)
    .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)

  // X axis
  const xAxis = g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
  xAxis.selectAll('text').attr('fill', axisColor)
  xAxis.selectAll('line,path').attr('stroke', axisColor)

  g.append('text')
    .attr('x', innerWidth / 2).attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle').attr('fill', textColor)
    .attr('font-size', '13px').text('参数 x')

  // Y axis
  const yAxis = g.append('g').call(d3.axisLeft(yScale))
  yAxis.selectAll('text').attr('fill', axisColor)
  yAxis.selectAll('line,path').attr('stroke', axisColor)

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2).attr('y', -40)
    .attr('text-anchor', 'middle').attr('fill', textColor)
    .attr('font-size', '13px').text('损失 L(x)')

  // Draw loss function curve
  const curveData: Point[] = []
  for (let x = -2; x <= 10; x += 0.1) {
    curveData.push({ x, y: lossFunction(x) })
  }

  const line = d3.line<Point>()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveBasis)

  g.append('path')
    .datum(curveData)
    .attr('fill', 'none')
    .attr('stroke', '#58C4DD')
    .attr('stroke-width', 3)
    .attr('d', line)

  // Optimal point marker
  g.append('circle')
    .attr('cx', xScale(2)).attr('cy', yScale(1)).attr('r', 6)
    .attr('fill', '#10B981').attr('stroke', '#fff').attr('stroke-width', 2)

  g.append('text')
    .attr('x', xScale(2)).attr('y', yScale(1) - 15)
    .attr('text-anchor', 'middle').attr('fill', '#10B981')
    .attr('font-size', '12px').attr('font-weight', 'bold')
    .text('最优点 (2, 1)')

  // Current point
  const cx = currentX.value
  const cy = lossFunction(cx)
  g.append('circle')
    .attr('cx', xScale(cx)).attr('cy', yScale(cy)).attr('r', 8)
    .attr('fill', '#F59E0B').attr('stroke', '#fff').attr('stroke-width', 2)

  // Gradient tangent line (red dashed)
  const grad = gradient(cx)
  const dx = 1
  const y1 = cy - grad * dx
  const y2 = cy + grad * dx

  g.append('line')
    .attr('x1', xScale(cx - dx)).attr('y1', yScale(y1))
    .attr('x2', xScale(cx + dx)).attr('y2', yScale(y2))
    .attr('stroke', '#EF4444').attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')

  // Gradient arrow
  if (Math.abs(grad) > 0.1) {
    const arrowLength = Math.min(Math.abs(grad) * 0.5, 2)
    const arrowX = grad > 0 ? cx - arrowLength : cx + arrowLength

    // Define arrow marker
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 5).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#EF4444')

    g.append('line')
      .attr('x1', xScale(cx)).attr('y1', yScale(cy))
      .attr('x2', xScale(arrowX)).attr('y2', yScale(cy))
      .attr('stroke', '#EF4444').attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrow)')
  }

  // Draw descent path
  const pathData = path.value
  if (pathData.length > 1) {
    const pathLine = d3.line<Point>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))

    g.append('path')
      .datum(pathData)
      .attr('fill', 'none')
      .attr('stroke', '#A855F7')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,3')
      .attr('d', pathLine)

    // Path dots
    g.selectAll('.path-point')
      .data(pathData)
      .enter()
      .append('circle')
      .attr('class', 'path-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 3)
      .attr('fill', '#A855F7')
      .attr('opacity', 0.6)
  }
}

// Watch and redraw
watch([() => currentX.value, () => path.value, () => learningRate.value, isDark, svgWidth], drawChart, { flush: 'post' })

onMounted(() => {
  checkDark()
  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  // Responsive sizing
  if (containerRef.value) {
    const updateWidth = () => {
      if (containerRef.value) {
        const w = containerRef.value.clientWidth
        svgWidth.value = Math.max(300, Math.min(700, w))
      }
    }
    updateWidth()
    resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(containerRef.value)
  }

  drawChart()
})

onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="gd-demo">
    <div class="main-grid">
      <!-- Chart -->
      <div class="chart-col" ref="containerRef">
        <svg ref="svgRef" class="chart-svg"></svg>
      </div>

      <!-- Controls -->
      <div class="side-col">
        <!-- Current state -->
        <div class="card">
          <h4 class="card-title blue">当前状态</h4>
          <div class="state-list">
            <div class="state-row">
              <span>迭代次数:</span>
              <strong>{{ iteration }}</strong>
            </div>
            <div class="state-row">
              <span>参数 x:</span>
              <strong class="text-yellow">{{ currentX.toFixed(3) }}</strong>
            </div>
            <div class="state-row">
              <span>损失 L(x):</span>
              <strong class="text-blue">{{ currentLoss().toFixed(3) }}</strong>
            </div>
            <div class="state-row">
              <span>梯度 ∂L/∂x:</span>
              <strong class="text-red">{{ currentGrad().toFixed(3) }}</strong>
            </div>
          </div>
        </div>

        <!-- Learning rate -->
        <div class="card">
          <label class="slider-label">
            学习率 α: <strong class="text-blue">{{ learningRate.toFixed(2) }}</strong>
          </label>
          <input
            type="range" min="0.01" max="0.5" step="0.01"
            :value="learningRate"
            @input="learningRate = Number(($event.target as HTMLInputElement).value)"
            :disabled="isAnimating"
            class="slider"
          />
          <p class="update-rule">更新规则: x ← x - α·∂L/∂x</p>
        </div>

        <!-- Initial position -->
        <div class="card">
          <label class="slider-label">
            初始位置: <strong class="text-yellow">{{ currentX.toFixed(1) }}</strong>
          </label>
          <input
            type="range" min="-2" max="10" step="0.5"
            :value="currentX"
            @input="onStartPosChange(Number(($event.target as HTMLInputElement).value))"
            :disabled="isAnimating"
            class="slider slider-yellow"
          />
        </div>

        <!-- Buttons -->
        <button
          @click="runGradientDescent"
          :disabled="isAnimating"
          class="btn btn-primary"
        >
          {{ isAnimating ? `迭代中... (${iteration})` : '▶ 开始优化' }}
        </button>

        <button
          @click="clearPath"
          :disabled="isAnimating"
          class="btn btn-secondary"
        >
          清除路径
        </button>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-color blue-line">━</span>
        <div>
          <strong>蓝色曲线</strong>
          <p>损失函数 L(x) = (x-2)² + 1</p>
        </div>
      </div>
      <div class="legend-item">
        <span class="legend-dot yellow-dot">●</span>
        <div>
          <strong>橙色圆点</strong>
          <p>当前参数位置</p>
        </div>
      </div>
      <div class="legend-item">
        <span class="legend-color red-line">━ ━</span>
        <div>
          <strong>红色虚线</strong>
          <p>当前梯度方向（切线）</p>
        </div>
      </div>
      <div class="legend-item">
        <span class="legend-color purple-line">· · ·</span>
        <div>
          <strong>紫色路径</strong>
          <p>优化轨迹</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gd-demo {
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
  .main-grid { grid-template-columns: 3fr 1fr; }
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
  gap: 12px;
}

/* Cards */
.card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 14px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 10px 0;
}
.card-title.blue { color: #3b82f6; }

/* State list */
.state-list { font-size: 13px; }
.state-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: var(--vp-c-text-1);
}

/* Sliders */
.slider-label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--vp-c-text-1);
}
.slider { width: 100%; accent-color: #3b82f6; }
.slider-yellow { accent-color: #f59e0b; }
.update-rule {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin: 6px 0 0;
  font-family: monospace;
}

/* Buttons */
.btn {
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white, #fff);
}
.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}
.btn-secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}
.btn-secondary:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}

/* Legend */
.legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
  font-size: 13px;
}
@media (min-width: 768px) {
  .legend { grid-template-columns: 1fr 1fr 1fr 1fr; }
}
.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--vp-c-bg);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
}
.legend-item strong {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-1);
}
.legend-item p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--vp-c-text-2);
}
.legend-color { font-weight: bold; white-space: nowrap; }
.legend-dot { font-size: 16px; }
.blue-line { color: #58C4DD; }
.yellow-dot { color: #F59E0B; }
.red-line { color: #EF4444; }
.purple-line { color: #A855F7; }

/* Color helpers */
.text-blue { color: #3b82f6; }
.text-yellow { color: #f59e0b; }
.text-red { color: #ef4444; }
</style>
