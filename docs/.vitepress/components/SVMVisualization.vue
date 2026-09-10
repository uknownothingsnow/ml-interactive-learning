<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

interface DataPoint {
  x: number
  y: number
  label: 1 | -1
}

const svgRef = ref<SVGSVGElement | null>(null)
const kernelType = ref<'linear' | 'rbf'>('linear')
const C = ref(1.0)
const showMargin = ref(true)
const showSupportVectors = ref(true)
const data = ref<DataPoint[]>([])
const isDark = ref(false)

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

function generateData() {
  const points: DataPoint[] = []
  for (let i = 0; i < 25; i++) {
    points.push({ x: Math.random() * 3 + 1, y: Math.random() * 3 + 1, label: -1 })
  }
  for (let i = 0; i < 25; i++) {
    points.push({ x: Math.random() * 3 + 5, y: Math.random() * 3 + 5, label: 1 })
  }
  data.value = points
}

function computeLinearSVM() {
  const pts = data.value
  const class1 = pts.filter(d => d.label === 1)
  const class2 = pts.filter(d => d.label === -1)
  if (class1.length === 0 || class2.length === 0) return { midpoint: { x: 5, y: 5 }, slope: -1 }

  const mean1 = {
    x: class1.reduce((s, d) => s + d.x, 0) / class1.length,
    y: class1.reduce((s, d) => s + d.y, 0) / class1.length
  }
  const mean2 = {
    x: class2.reduce((s, d) => s + d.x, 0) / class2.length,
    y: class2.reduce((s, d) => s + d.y, 0) / class2.length
  }
  const midpoint = { x: (mean1.x + mean2.x) / 2, y: (mean1.y + mean2.y) / 2 }
  const dx = mean1.x - mean2.x
  const dy = mean1.y - mean2.y
  const slope = -dx / dy
  return { midpoint, slope }
}

function findSupportVectors() {
  const { midpoint, slope } = computeLinearSVM()
  const b = midpoint.y - slope * midpoint.x
  const distances = data.value.map(point => {
    const dist = Math.abs(slope * point.x - point.y + b) / Math.sqrt(slope * slope + 1)
    return { point, dist }
  })
  const c1 = distances.filter(d => d.point.label === 1).sort((a, b) => a.dist - b.dist)
  const c2 = distances.filter(d => d.point.label === -1).sort((a, b) => a.dist - b.dist)
  return [...c1.slice(0, 2).map(d => d.point), ...c2.slice(0, 2).map(d => d.point)]
}

function drawChart() {
  if (!svgRef.value || data.value.length === 0) return

  const dark = isDark.value
  const textColor = dark ? '#e5e7eb' : '#374151'
  const gridColor = dark ? '#ffffff' : '#000000'
  const bgColor = dark ? '#1e1e2e' : '#ffffff'

  const width = 700
  const height = 500
  const margin = { top: 20, right: 20, bottom: 50, left: 60 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', bgColor).attr('rx', 8)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth])
  const yScale = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0])

  // Grid
  g.append('g').attr('opacity', 0.08)
    .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)
  g.append('g').attr('opacity', 0.08).attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
    .selectAll('line').attr('stroke', gridColor)

  // Axes
  const xAxis = g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale))
  xAxis.selectAll('text').attr('fill', textColor)
  xAxis.selectAll('line,path').attr('stroke', textColor)

  const yAxis = g.append('g').call(d3.axisLeft(yScale))
  yAxis.selectAll('text').attr('fill', textColor)
  yAxis.selectAll('line,path').attr('stroke', textColor)

  g.append('text').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle').attr('fill', textColor).attr('font-size', '13px').text('特征 x₁')
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerHeight / 2).attr('y', -40)
    .attr('text-anchor', 'middle').attr('fill', textColor).attr('font-size', '13px').text('特征 x₂')

  // Decision boundary
  const { midpoint, slope } = computeLinearSVM()
  const supportVectors = findSupportVectors()

  const x1 = 0, x2 = 10
  const y1 = slope * (x1 - midpoint.x) + midpoint.y
  const y2 = slope * (x2 - midpoint.x) + midpoint.y

  g.append('line')
    .attr('x1', xScale(x1)).attr('y1', yScale(y1))
    .attr('x2', xScale(x2)).attr('y2', yScale(y2))
    .attr('stroke', '#3b82f6').attr('stroke-width', 3)

  // Margins
  if (showMargin.value) {
    const marginDist = 0.8
    g.append('line')
      .attr('x1', xScale(x1)).attr('y1', yScale(y1 + marginDist))
      .attr('x2', xScale(x2)).attr('y2', yScale(y2 + marginDist))
      .attr('stroke', '#22c55e').attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5').attr('opacity', 0.6)
    g.append('line')
      .attr('x1', xScale(x1)).attr('y1', yScale(y1 - marginDist))
      .attr('x2', xScale(x2)).attr('y2', yScale(y2 - marginDist))
      .attr('stroke', '#22c55e').attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5').attr('opacity', 0.6)

    g.append('path')
      .attr('d', `M ${xScale(x1)} ${yScale(y1 + marginDist)} L ${xScale(x2)} ${yScale(y2 + marginDist)} L ${xScale(x2)} ${yScale(y2 - marginDist)} L ${xScale(x1)} ${yScale(y1 - marginDist)} Z`)
      .attr('fill', '#22c55e').attr('opacity', 0.1)
  }

  // Data points
  g.selectAll('.svm-point')
    .data(data.value)
    .enter().append('circle')
    .attr('class', 'svm-point')
    .attr('cx', d => xScale(d.x)).attr('cy', d => yScale(d.y))
    .attr('r', 6)
    .attr('fill', d => d.label === 1 ? '#3b82f6' : '#ef4444')
    .attr('stroke', dark ? '#e5e7eb' : '#374151')
    .attr('stroke-width', 1.5).attr('opacity', 0.8)

  // Support vectors
  if (showSupportVectors.value) {
    g.selectAll('.svm-sv')
      .data(supportVectors)
      .enter().append('circle')
      .attr('class', 'svm-sv')
      .attr('cx', d => xScale(d.x)).attr('cy', d => yScale(d.y))
      .attr('r', 10).attr('fill', 'none')
      .attr('stroke', '#eab308').attr('stroke-width', 3)
  }
}

watch([data, C, showMargin, showSupportVectors, kernelType, isDark], drawChart, { flush: 'post' })
</script>

<template>
  <div class="svm-demo">
    <!-- Controls -->
    <div class="svm-controls">
      <div class="svm-control-group">
        <label class="svm-label">核函数类型</label>
        <div class="svm-btn-grid">
          <button
            :class="['svm-btn', kernelType === 'linear' ? 'svm-btn-active' : '']"
            @click="kernelType = 'linear'"
          >
            <div class="svm-btn-title">线性核</div>
            <div class="svm-btn-formula">K(x,z) = x·z</div>
          </button>
          <button
            :class="['svm-btn', kernelType === 'rbf' ? 'svm-btn-active' : '']"
            @click="kernelType = 'rbf'"
          >
            <div class="svm-btn-title">RBF核（高斯核）</div>
            <div class="svm-btn-formula">K(x,z) = exp(-γ||x-z||²)</div>
          </button>
        </div>
      </div>

      <div class="svm-control-group">
        <div class="svm-slider-header">
          <label class="svm-label">正则化参数 C</label>
          <span class="svm-slider-value">{{ C.toFixed(1) }}</span>
        </div>
        <input
          type="range" min="0.1" max="10" step="0.1"
          :value="C"
          @input="C = Number(($event.target as HTMLInputElement).value)"
          class="svm-slider"
        />
        <div class="svm-slider-hint">C越大，对误分类的惩罚越重（硬间隔）；C越小，容忍更多误分类（软间隔）</div>
      </div>

      <div class="svm-checkboxes">
        <label class="svm-checkbox-label">
          <input type="checkbox" v-model="showMargin" />
          <span>显示间隔</span>
        </label>
        <label class="svm-checkbox-label">
          <input type="checkbox" v-model="showSupportVectors" />
          <span>高亮支持向量</span>
        </label>
      </div>
    </div>

    <!-- SVG Chart -->
    <div class="svm-chart-wrap">
      <svg ref="svgRef" class="svm-chart-svg"></svg>
    </div>

    <!-- Legend -->
    <div class="svm-legend">
      <div class="svm-legend-item">
        <span class="svm-dot svm-dot-blue"></span>
        <span>正类 (+1)</span>
      </div>
      <div class="svm-legend-item">
        <span class="svm-dot svm-dot-red"></span>
        <span>负类 (-1)</span>
      </div>
      <div class="svm-legend-item">
        <span class="svm-line-blue"></span>
        <span>决策边界</span>
      </div>
      <div class="svm-legend-item">
        <span class="svm-dot svm-dot-yellow-ring"></span>
        <span>支持向量</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.svm-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.svm-controls {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}
.svm-control-group { margin-bottom: 16px; }
.svm-label { display: block; font-size: 14px; font-weight: 600; color: var(--vp-c-text-1); margin-bottom: 8px; }
.svm-btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.svm-btn {
  padding: 12px;
  border-radius: 10px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.svm-btn:hover { border-color: var(--vp-c-brand-1); }
.svm-btn-active { border-color: var(--vp-c-brand-1); background: rgba(59,130,246,0.08); }
.svm-btn-title { font-weight: 700; color: var(--vp-c-text-1); font-size: 14px; }
.svm-btn-formula { font-size: 12px; color: var(--vp-c-text-2); font-family: monospace; margin-top: 4px; }
.svm-slider-header { display: flex; justify-content: space-between; align-items: center; }
.svm-slider-value {
  font-size: 18px; font-weight: 700; color: var(--vp-c-text-1);
  background: var(--vp-c-bg); padding: 2px 10px; border-radius: 6px;
}
.svm-slider { width: 100%; accent-color: #8b5cf6; margin: 6px 0; }
.svm-slider-hint { font-size: 12px; color: var(--vp-c-text-3); }
.svm-checkboxes { display: flex; gap: 24px; }
.svm-checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; color: var(--vp-c-text-1); }
.svm-chart-wrap { display: flex; justify-content: center; overflow-x: auto; margin-bottom: 16px; }
.svm-chart-svg { border-radius: 8px; max-width: 100%; height: auto; }
.svm-legend {
  display: grid; grid-template-columns: repeat(4, auto); gap: 16px;
  justify-content: center; font-size: 13px; color: var(--vp-c-text-1);
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 8px; padding: 12px;
}
@media (max-width: 640px) { .svm-legend { grid-template-columns: repeat(2, auto); } }
.svm-legend-item { display: flex; align-items: center; gap: 6px; }
.svm-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
.svm-dot-blue { background: #3b82f6; }
.svm-dot-red { background: #ef4444; }
.svm-dot-yellow-ring { border: 2.5px solid #eab308; background: transparent; }
.svm-line-blue { width: 20px; height: 3px; background: #3b82f6; display: inline-block; border-radius: 2px; }
</style>
