<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

interface DataPoint {
  score: number
  label: number
}

const svgRef = ref<SVGSVGElement | null>(null)
const threshold = ref(0.5)
const data = ref<DataPoint[]>([])
const rocPoints = ref<Array<[number, number]>>([])
const auc = ref(0)
const confusionMatrix = ref({ tp: 0, fp: 0, tn: 0, fn: 0 })
const currentPoint = ref<[number, number]>([0, 0])
const partialAuc = ref(0)
const isDark = ref(false)

// Detect dark mode
let observer: MutationObserver | null = null

function checkDark() {
  if (typeof document !== 'undefined') {
    isDark.value = document.documentElement.classList.contains('dark')
  }
}

onMounted(() => {
  checkDark()
  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  generateData()
})

onUnmounted(() => {
  observer?.disconnect()
})

// --- Data generation ---
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * stdDev + mean
}

function generateData() {
  const points: DataPoint[] = []
  for (let i = 0; i < 100; i++) {
    points.push({ score: Math.max(0, Math.min(1, normalRandom(0.65, 0.15))), label: 1 })
  }
  for (let i = 0; i < 100; i++) {
    points.push({ score: Math.max(0, Math.min(1, normalRandom(0.35, 0.15))), label: 0 })
  }
  data.value = points.sort((a, b) => b.score - a.score)
}

// --- Compute ROC curve from data ---
watch(data, (pts) => {
  if (pts.length === 0) return
  const thresholds = Array.from({ length: 101 }, (_, i) => i / 100)
  const points: Array<[number, number]> = []
  const totalPositive = pts.filter(d => d.label === 1).length
  const totalNegative = pts.filter(d => d.label === 0).length

  thresholds.forEach(thresh => {
    const tp = pts.filter(d => d.score >= thresh && d.label === 1).length
    const fp = pts.filter(d => d.score >= thresh && d.label === 0).length
    points.push([fp / totalNegative, tp / totalPositive])
  })
  points.reverse()
  rocPoints.value = points

  let aucVal = 0
  for (let i = 1; i < points.length; i++) {
    const w = points[i][0] - points[i - 1][0]
    const h = (points[i][1] + points[i - 1][1]) / 2
    aucVal += w * h
  }
  auc.value = aucVal
}, { immediate: true })

// --- Confusion matrix at current threshold ---
watch([data, threshold], () => {
  const pts = data.value
  if (pts.length === 0) return
  const totalPositive = pts.filter(d => d.label === 1).length
  const totalNegative = pts.filter(d => d.label === 0).length
  const tp = pts.filter(d => d.score >= threshold.value && d.label === 1).length
  const fp = pts.filter(d => d.score >= threshold.value && d.label === 0).length
  const tn = pts.filter(d => d.score < threshold.value && d.label === 0).length
  const fn = pts.filter(d => d.score < threshold.value && d.label === 1).length
  confusionMatrix.value = { tp, fp, tn, fn }
  currentPoint.value = [fp / totalNegative, tp / totalPositive]
}, { immediate: true })

// --- Partial AUC ---
watch([currentPoint, rocPoints], () => {
  const rp = rocPoints.value
  if (rp.length === 0) return
  const cp = currentPoint.value
  const idx = rp.findIndex(p => p[0] >= cp[0])
  const partial = rp.slice(0, Math.max(idx, 1))
  if (idx > 0 && idx < rp.length) partial.push(cp)
  let val = 0
  for (let i = 1; i < partial.length; i++) {
    val += (partial[i][0] - partial[i - 1][0]) * (partial[i][1] + partial[i - 1][1]) / 2
  }
  partialAuc.value = val
}, { immediate: true })

// --- Computed metrics ---
const accuracy = computed(() =>
  data.value.length > 0
    ? (confusionMatrix.value.tp + confusionMatrix.value.tn) / data.value.length
    : 0
)
const precision = computed(() => {
  const { tp, fp } = confusionMatrix.value
  return tp + fp > 0 ? tp / (tp + fp) : 0
})
const recall = computed(() => {
  const { tp, fn } = confusionMatrix.value
  return tp + fn > 0 ? tp / (tp + fn) : 0
})
const f1Score = computed(() => {
  const p = precision.value, r = recall.value
  return p + r > 0 ? 2 * p * r / (p + r) : 0
})
const partialPct = computed(() =>
  auc.value > 0 ? (partialAuc.value / auc.value * 100).toFixed(1) : '0.0'
)

// --- Draw ROC chart with D3 ---
function drawChart() {
  if (!svgRef.value || rocPoints.value.length === 0) return
  const dark = isDark.value
  const textColor = dark ? '#e5e7eb' : '#374151'
  const gridColor = dark ? '#ffffff' : '#000000'
  const bgColor = dark ? '#1e1e2e' : '#ffffff'

  const width = 500
  const height = 500
  const margin = { top: 30, right: 30, bottom: 55, left: 55 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  // Background
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', bgColor).attr('rx', 8)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const x = d3.scaleLinear().domain([0, 1]).range([0, innerW])
  const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

  // Grid
  g.append('g').attr('opacity', 0.08)
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)
  g.append('g').attr('opacity', 0.08).attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickSize(-innerH).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)

  // Axes
  const xAxis = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x))
  xAxis.selectAll('text').attr('fill', textColor)
  xAxis.selectAll('line,path').attr('stroke', textColor)
  g.append('text').attr('x', innerW / 2).attr('y', innerH + 42).attr('text-anchor', 'middle')
    .attr('fill', textColor).attr('font-size', '13px').text('假正例率 (FPR)')

  const yAxis = g.append('g').call(d3.axisLeft(y))
  yAxis.selectAll('text').attr('fill', textColor)
  yAxis.selectAll('line,path').attr('stroke', textColor)
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -40)
    .attr('text-anchor', 'middle').attr('fill', textColor).attr('font-size', '13px').text('真正例率 (TPR)')

  // Diagonal
  g.append('line').attr('x1', 0).attr('y1', innerH).attr('x2', innerW).attr('y2', 0)
    .attr('stroke', dark ? '#555' : '#aaa').attr('stroke-dasharray', '5,5')

  // AUC area (full)
  const area = d3.area<[number, number]>().x(d => x(d[0])).y0(innerH).y1(d => y(d[1])).curve(d3.curveMonotoneX)
  g.append('path').datum(rocPoints.value).attr('fill', '#3b82f6').attr('opacity', 0.08).attr('d', area)

  // Partial AUC highlight
  const cp = currentPoint.value
  const idx = rocPoints.value.findIndex(p => p[0] >= cp[0])
  const partial = rocPoints.value.slice(0, Math.max(idx, 1))
  if (idx > 0 && idx < rocPoints.value.length) partial.push(cp)
  g.append('path').datum(partial).attr('fill', '#f59e0b').attr('opacity', 0.4).attr('d', area)

  // ROC curve
  const line = d3.line<[number, number]>().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX)
  g.append('path').datum(rocPoints.value).attr('fill', 'none').attr('stroke', '#3b82f6')
    .attr('stroke-width', 2.5).attr('d', line)

  // Partial curve line
  g.append('path').datum(partial).attr('fill', 'none').attr('stroke', '#f59e0b')
    .attr('stroke-width', 2).attr('d', line)

  // Guide lines from point
  g.append('line').attr('x1', x(cp[0])).attr('y1', y(cp[1])).attr('x2', x(cp[0])).attr('y2', innerH)
    .attr('stroke', '#f59e0b').attr('stroke-dasharray', '3,3').attr('opacity', 0.5)
  g.append('line').attr('x1', x(cp[0])).attr('y1', y(cp[1])).attr('x2', 0).attr('y2', y(cp[1]))
    .attr('stroke', '#f59e0b').attr('stroke-dasharray', '3,3').attr('opacity', 0.5)

  // Current point
  g.append('circle').attr('cx', x(cp[0])).attr('cy', y(cp[1])).attr('r', 6)
    .attr('fill', '#f59e0b').attr('stroke', '#fff').attr('stroke-width', 2)

  // AUC label
  g.append('text').attr('x', innerW - 10).attr('y', 20).attr('text-anchor', 'end')
    .attr('fill', '#3b82f6').attr('font-size', '15px').attr('font-weight', 'bold')
    .text(`AUC = ${auc.value.toFixed(3)}`)
  g.append('text').attr('x', innerW - 10).attr('y', 40).attr('text-anchor', 'end')
    .attr('fill', '#f59e0b').attr('font-size', '13px').attr('font-weight', 'bold')
    .text(`当前面积: ${partialAuc.value.toFixed(3)} (${partialPct.value}%)`)
}

watch([rocPoints, threshold, currentPoint, isDark], drawChart, { flush: 'post' })
</script>

<template>
  <div class="roc-demo">
    <!-- Threshold slider -->
    <div class="slider-row">
      <label class="slider-label">分类阈值: <strong>{{ threshold.toFixed(2) }}</strong></label>
      <input
        type="range" min="0" max="1" step="0.01"
        :value="threshold"
        @input="threshold = Number(($event.target as HTMLInputElement).value)"
        class="slider"
      />
      <div class="slider-ticks"><span>0.00</span><span>1.00</span></div>
    </div>

    <div class="main-grid">
      <!-- SVG chart -->
      <div class="chart-col">
        <svg ref="svgRef" class="chart-svg"></svg>
      </div>

      <!-- Side panel -->
      <div class="side-col">
        <!-- Confusion matrix -->
        <div class="card">
          <h4 class="card-title blue">混淆矩阵</h4>
          <div class="cm-grid">
            <div class="cm-cell green">
              <div class="cm-val">{{ confusionMatrix.tp }}</div>
              <div class="cm-lbl">真正例 (TP)</div>
            </div>
            <div class="cm-cell red">
              <div class="cm-val">{{ confusionMatrix.fp }}</div>
              <div class="cm-lbl">假正例 (FP)</div>
            </div>
            <div class="cm-cell red">
              <div class="cm-val">{{ confusionMatrix.fn }}</div>
              <div class="cm-lbl">假负例 (FN)</div>
            </div>
            <div class="cm-cell green">
              <div class="cm-val">{{ confusionMatrix.tn }}</div>
              <div class="cm-lbl">真负例 (TN)</div>
            </div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="card">
          <h4 class="card-title blue">评估指标</h4>
          <div class="metric-list">
            <div class="metric-row"><span>准确率 (Accuracy)</span><strong>{{ (accuracy * 100).toFixed(1) }}%</strong></div>
            <div class="metric-row"><span>精确率 (Precision)</span><strong>{{ (precision * 100).toFixed(1) }}%</strong></div>
            <div class="metric-row"><span>召回率 (Recall/TPR)</span><strong>{{ (recall * 100).toFixed(1) }}%</strong></div>
            <div class="metric-row"><span>F1 分数</span><strong>{{ (f1Score * 100).toFixed(1) }}%</strong></div>
            <div class="metric-row sep"><span>FPR</span><strong>{{ (currentPoint[0] * 100).toFixed(1) }}%</strong></div>
          </div>
        </div>

        <!-- Area comparison -->
        <div class="card highlight-card">
          <h4 class="card-title amber">面积对比</h4>
          <div class="bar-group">
            <div class="bar-label"><span class="text-blue">完整 AUC</span><strong>{{ auc.toFixed(3) }}</strong></div>
            <div class="bar-track"><div class="bar-fill blue-bg" style="width:100%"></div></div>
          </div>
          <div class="bar-group">
            <div class="bar-label"><span class="text-amber">当前累积面积</span><strong>{{ partialAuc.toFixed(3) }}</strong></div>
            <div class="bar-track"><div class="bar-fill amber-bg" :style="{ width: partialPct + '%' }"></div></div>
            <div class="bar-pct">{{ partialPct }}% of total</div>
          </div>
          <p class="bar-hint">💡 拖动阈值滑块，观察黄色进度条的变化！</p>
        </div>
      </div>
    </div>

    <!-- Explanation notes -->
    <div class="notes">
      <p><strong class="text-blue">完整 AUC</strong>：整条 ROC 曲线下方的蓝色半透明区域，表示模型在所有阈值下的综合性能。当前 AUC = {{ auc.toFixed(3) }}</p>
      <p><strong class="text-amber">橙色高亮区域</strong>：从起点 (0,0) 到当前操作点的部分面积。调整阈值滑块，观察橙色区域如何动态变化！</p>
      <p><strong class="text-amber">橙色圆点</strong>：表示当前阈值下的操作点 (FPR, TPR)，对应右侧混淆矩阵的统计结果</p>
      <p class="hint">💡 提示：降低阈值 → 更多样本被预测为正类 → FPR 和 TPR 同时增加 → 操作点向右上方移动</p>
    </div>
  </div>
</template>

<style scoped>
.roc-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}

/* Slider */
.slider-row { margin-bottom: 20px; }
.slider-label { display: block; font-size: 14px; margin-bottom: 6px; color: var(--vp-c-text-1); }
.slider { width: 100%; accent-color: #3b82f6; }
.slider-ticks { display: flex; justify-content: space-between; font-size: 12px; color: var(--vp-c-text-3); margin-top: 2px; }

/* Layout */
.main-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 768px) { .main-grid { grid-template-columns: 3fr 2fr; } }
.chart-col { display: flex; justify-content: center; overflow-x: auto; }
.chart-svg { border-radius: 8px; max-width: 100%; height: auto; }
.side-col { display: flex; flex-direction: column; gap: 16px; }

/* Cards */
.card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}
.card-title { font-size: 15px; font-weight: 600; margin: 0 0 12px 0; }
.card-title.blue { color: #3b82f6; }
.card-title.amber { color: #d97706; }

/* Confusion matrix grid */
.cm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: center; }
.cm-cell { padding: 10px 6px; border-radius: 6px; border: 1px solid; }
.cm-cell.green { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.4); }
.cm-cell.red { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.4); }
.cm-val { font-size: 20px; font-weight: 700; }
.cm-cell.green .cm-val { color: #16a34a; }
.cm-cell.red .cm-val { color: #dc2626; }
.cm-lbl { font-size: 11px; color: var(--vp-c-text-2); margin-top: 2px; }

/* Metrics */
.metric-list { font-size: 13px; }
.metric-row { display: flex; justify-content: space-between; padding: 4px 0; color: var(--vp-c-text-1); }
.metric-row.sep { border-top: 1px solid var(--vp-c-divider); margin-top: 4px; padding-top: 8px; }

/* Highlight card */
.highlight-card { border-color: #d97706; }
.bar-group { margin-bottom: 12px; }
.bar-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; color: var(--vp-c-text-1); }
.bar-track { height: 20px; background: var(--vp-c-bg-soft); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; transition: width 0.3s; border-radius: 4px; }
.blue-bg { background: #3b82f6; }
.amber-bg { background: #f59e0b; }
.bar-pct { text-align: right; font-size: 11px; color: var(--vp-c-text-3); margin-top: 2px; }
.bar-hint { font-size: 12px; color: var(--vp-c-text-3); font-style: italic; margin: 8px 0 0; border-top: 1px solid var(--vp-c-divider); padding-top: 8px; }

/* Notes */
.notes { margin-top: 20px; font-size: 13px; color: var(--vp-c-text-2); }
.notes p { margin: 6px 0; line-height: 1.6; }
.notes .hint { font-size: 12px; font-style: italic; color: var(--vp-c-text-3); margin-top: 10px; }

/* Color helpers */
.text-blue { color: #3b82f6; }
.text-amber { color: #d97706; }

/* Dark mode metric cell tweaks */
:global(.dark) .cm-cell.green { background: rgba(34,197,94,0.12); }
:global(.dark) .cm-cell.red { background: rgba(239,68,68,0.12); }
:global(.dark) .cm-cell.green .cm-val { color: #4ade80; }
:global(.dark) .cm-cell.red .cm-val { color: #f87171; }
</style>
