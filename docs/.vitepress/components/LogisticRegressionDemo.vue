<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

interface DataPoint {
  x1: number
  x2: number
  label: number
}

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const data = ref<DataPoint[]>([])
const w1 = ref(1)
const w2 = ref(1)
const b = ref(0)
const isDark = ref(false)
const svgSize = ref(500)

// --- Dark mode detection ---
let observer: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null

function checkDark() {
  if (typeof document !== 'undefined') {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}

// --- Data generation ---
function generateData() {
  const points: DataPoint[] = []
  // Class 0 (bottom-left cluster)
  for (let i = 0; i < 30; i++) {
    points.push({
      x1: Math.random() * 4 + 1,
      x2: Math.random() * 4 + 1,
      label: 0,
    })
  }
  // Class 1 (top-right cluster)
  for (let i = 0; i < 30; i++) {
    points.push({
      x1: Math.random() * 4 + 5,
      x2: Math.random() * 4 + 5,
      label: 1,
    })
  }
  data.value = points
}

// --- Sigmoid ---
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

// --- Predict ---
function predict(x1: number, x2: number): number {
  return sigmoid(w1.value * x1 + w2.value * x2 + b.value)
}

// --- Accuracy ---
const accuracy = computed(() => {
  if (data.value.length === 0) return 0
  let correct = 0
  for (const point of data.value) {
    const prob = predict(point.x1, point.x2)
    const predicted = prob >= 0.5 ? 1 : 0
    if (predicted === point.label) correct++
  }
  return (correct / data.value.length) * 100
})

// --- Reset ---
function resetParams() {
  w1.value = 1
  w2.value = 1
  b.value = 0
}

// --- Lifecycle ---
onMounted(() => {
  checkDark()
  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  // Responsive sizing
  if (containerRef.value) {
    const updateSize = () => {
      if (containerRef.value) {
        svgSize.value = Math.min(containerRef.value.clientWidth, 600)
      }
    }
    updateSize()
    resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.value)
  }

  generateData()
})

onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
})

// --- D3 rendering ---
function drawChart() {
  if (!svgRef.value || data.value.length === 0) return

  const dark = isDark.value
  const textColor = dark ? '#e5e7eb' : '#374151'
  const gridColor = dark ? '#4b5563' : '#9ca3af'
  const axisTextColor = dark ? '#d1d5db' : '#4b5563'
  const boundaryColor = dark ? '#FFFFFF' : '#1f2937'
  const bgColor = dark ? '#1e1e2e' : '#ffffff'

  const size = svgSize.value
  const margin = { top: 20, right: 20, bottom: 50, left: 60 }

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('width', size).attr('height', size)

  // Background
  svg.append('rect').attr('width', size).attr('height', size).attr('fill', bgColor).attr('rx', 8)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const innerWidth = size - margin.left - margin.right
  const innerHeight = size - margin.top - margin.bottom

  // Dynamic domain from data
  const x1Values = data.value.map(d => d.x1)
  const x2Values = data.value.map(d => d.x2)
  const x1Min = Math.min(...x1Values)
  const x1Max = Math.max(...x1Values)
  const x2Min = Math.min(...x2Values)
  const x2Max = Math.max(...x2Values)
  const x1Padding = (x1Max - x1Min) * 0.1 || 1
  const x2Padding = (x2Max - x2Min) * 0.1 || 1

  const xScale = d3.scaleLinear()
    .domain([x1Min - x1Padding, x1Max + x1Padding])
    .range([0, innerWidth])

  const yScale = d3.scaleLinear()
    .domain([x2Min - x2Padding, x2Max + x2Padding])
    .range([innerHeight, 0])

  // Probability heatmap
  const resolution = 50
  const x1Domain = xScale.domain()
  const x2Domain = yScale.domain()

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const px1 = x1Domain[0] + (i / resolution) * (x1Domain[1] - x1Domain[0])
      const px2 = x2Domain[0] + (j / resolution) * (x2Domain[1] - x2Domain[0])
      const prob = predict(px1, px2)
      const color = d3.interpolateRdYlBu(1 - prob)
      const cellWidth = (x1Domain[1] - x1Domain[0]) / resolution
      const cellHeight = (x2Domain[1] - x2Domain[0]) / resolution

      g.append('rect')
        .attr('x', xScale(px1))
        .attr('y', yScale(px2 + cellHeight))
        .attr('width', innerWidth / resolution)
        .attr('height', innerHeight / resolution)
        .attr('fill', color)
        .attr('opacity', 0.3)
    }
  }

  // Decision boundary line: w1*x1 + w2*x2 + b = 0
  if (Math.abs(w2.value) > 0.01) {
    const x1Start = x1Domain[0]
    const x1End = x1Domain[1]
    const x2Start = -(w1.value * x1Start + b.value) / w2.value
    const x2End = -(w1.value * x1End + b.value) / w2.value

    g.append('line')
      .attr('x1', xScale(x1Start))
      .attr('y1', yScale(x2Start))
      .attr('x2', xScale(x1End))
      .attr('y2', yScale(x2End))
      .attr('stroke', boundaryColor)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5')
  }

  // Grid lines
  g.append('g').attr('opacity', 0.15)
    .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)
  g.append('g').attr('opacity', 0.15).attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)

  // Remove domain paths from grid
  g.selectAll('.domain').remove()

  // X axis
  const xAxis = g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale))
  xAxis.selectAll('text').attr('fill', axisTextColor)
  xAxis.selectAll('line,path').attr('stroke', axisTextColor)
  g.append('text')
    .attr('x', innerWidth / 2).attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle').attr('fill', textColor).attr('font-size', '13px')
    .text('特征 x₁')

  // Y axis
  const yAxis = g.append('g').call(d3.axisLeft(yScale))
  yAxis.selectAll('text').attr('fill', axisTextColor)
  yAxis.selectAll('line,path').attr('stroke', axisTextColor)
  g.append('text')
    .attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -40)
    .attr('text-anchor', 'middle').attr('fill', textColor).attr('font-size', '13px')
    .text('特征 x₂')

  // Data points
  g.selectAll('circle.data-point')
    .data(data.value)
    .enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('cx', d => xScale(d.x1))
    .attr('cy', d => yScale(d.x2))
    .attr('r', 6)
    .attr('fill', d => d.label === 1 ? '#10B981' : '#EF4444')
    .attr('stroke', dark ? '#e5e7eb' : '#ffffff')
    .attr('stroke-width', 2)
    .attr('opacity', 0.85)
}

watch([data, w1, w2, b, isDark, svgSize], drawChart, { flush: 'post' })
</script>

<template>
  <div class="logistic-demo">
    <div class="main-grid">
      <!-- SVG chart -->
      <div ref="containerRef" class="chart-col">
        <svg ref="svgRef" class="chart-svg"></svg>
      </div>

      <!-- Control panel -->
      <div class="side-col">
        <!-- Model parameters -->
        <div class="card">
          <h4 class="card-title brand">模型参数</h4>
          <div class="param-group">
            <label class="param-label">
              权重 w₁: <strong class="val-brand">{{ w1.toFixed(2) }}</strong>
            </label>
            <input type="range" min="-5" max="5" step="0.1"
              :value="w1"
              @input="w1 = Number(($event.target as HTMLInputElement).value)"
              class="slider" />
          </div>
          <div class="param-group">
            <label class="param-label">
              权重 w₂: <strong class="val-brand">{{ w2.toFixed(2) }}</strong>
            </label>
            <input type="range" min="-5" max="5" step="0.1"
              :value="w2"
              @input="w2 = Number(($event.target as HTMLInputElement).value)"
              class="slider" />
          </div>
          <div class="param-group">
            <label class="param-label">
              偏置 b: <strong class="val-brand">{{ b.toFixed(2) }}</strong>
            </label>
            <input type="range" min="-10" max="10" step="0.1"
              :value="b"
              @input="b = Number(($event.target as HTMLInputElement).value)"
              class="slider" />
          </div>
          <div class="equation-box">
            <div class="equation-label">决策边界方程:</div>
            <div class="equation-text">
              {{ w1.toFixed(2) }}·x₁ + {{ w2.toFixed(2) }}·x₂ + {{ b.toFixed(2) }} = 0
            </div>
          </div>
        </div>

        <!-- Accuracy -->
        <div class="card">
          <h4 class="card-title brand">分类性能</h4>
          <div class="accuracy-display">
            <div class="accuracy-value">{{ accuracy.toFixed(1) }}%</div>
            <div class="accuracy-label">准确率</div>
          </div>
        </div>

        <!-- Sigmoid info -->
        <div class="card sigmoid-card">
          <h4 class="card-title amber">Sigmoid 函数</h4>
          <div class="sigmoid-formula">σ(z) = 1 / (1 + e⁻ᶻ)</div>
          <div class="sigmoid-detail">其中 z = w₁·x₁ + w₂·x₂ + b</div>
          <div class="sigmoid-props">
            <span>输出范围: (0, 1)</span>
            <span>决策阈值: 0.5</span>
          </div>
        </div>

        <!-- Buttons -->
        <div class="btn-group">
          <button @click="generateData" class="btn btn-secondary">🔄 重新生成数据</button>
          <button @click="resetParams" class="btn btn-outline">重置参数</button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-dot green"></span>
        <div><strong>绿色圆点</strong><span>正类样本 (label = 1)</span></div>
      </div>
      <div class="legend-item">
        <span class="legend-dot red"></span>
        <div><strong>红色圆点</strong><span>负类样本 (label = 0)</span></div>
      </div>
      <div class="legend-item">
        <span class="legend-line"></span>
        <div><strong>虚线</strong><span>决策边界 (P = 0.5)</span></div>
      </div>
    </div>
    <p class="hint">
      🎨 <strong>背景颜色</strong>表示分类概率：红色区域倾向于类别 0，蓝色区域倾向于类别 1。调整参数观察决策边界如何移动。
    </p>
  </div>
</template>

<style scoped>
.logistic-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}

/* Layout */
.main-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 768px) { .main-grid { grid-template-columns: 2fr 1fr; } }

.chart-col { display: flex; justify-content: center; overflow-x: auto; }
.chart-svg { border-radius: 8px; max-width: 100%; height: auto; }
.side-col { display: flex; flex-direction: column; gap: 14px; }

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
  margin: 0 0 12px 0;
}
.card-title.brand { color: var(--vp-c-brand-1); }
.card-title.amber { color: #d97706; }

/* Params */
.param-group { margin-bottom: 12px; }
.param-label {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--vp-c-text-1);
}
.val-brand { color: var(--vp-c-brand-1); }
.slider { width: 100%; accent-color: var(--vp-c-brand-1); }

/* Equation */
.equation-box {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
}
.equation-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}
.equation-text {
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 13px;
  color: var(--vp-c-text-1);
  word-break: break-all;
}

/* Accuracy */
.accuracy-display { text-align: center; }
.accuracy-value {
  font-size: 2.5em;
  font-weight: 700;
  color: #10B981;
  line-height: 1.2;
}
.accuracy-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}

/* Sigmoid */
.sigmoid-card { border-color: rgba(217, 119, 6, 0.3); }
.sigmoid-formula {
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 13px;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}
.sigmoid-detail {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}
.sigmoid-props {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

/* Buttons */
.btn-group { display: flex; flex-direction: column; gap: 8px; }
.btn {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s;
  text-align: center;
}
.btn-secondary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white, #fff);
  border-color: var(--vp-c-brand-1);
}
.btn-secondary:hover { opacity: 0.85; }
.btn-outline {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.btn-outline:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

/* Legend */
.legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  background: var(--vp-c-bg);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}
.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
.legend-item div { display: flex; flex-direction: column; }
.legend-item span { font-size: 12px; color: var(--vp-c-text-2); }
.legend-dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 3px;
}
.legend-dot.green { background: #10B981; }
.legend-dot.red { background: #EF4444; }
.legend-line {
  flex-shrink: 0;
  width: 20px;
  height: 0;
  margin-top: 9px;
  border-top: 3px dashed var(--vp-c-text-1);
}

/* Hint */
.hint {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-top: 12px;
  line-height: 1.6;
}
</style>
