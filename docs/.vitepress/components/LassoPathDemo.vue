<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import * as d3 from 'd3'

interface CoefPath {
  lambda: number
  coefficients: number[]
}

const svgRef = ref<SVGSVGElement | null>(null)
const numFeatures = 10
const paths = ref<CoefPath[]>([])
const selectedLambda = ref(0.5)
const hoveredFeature = ref<number | null>(null)

const COLORS = [
  '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#8b5cf6'
]

function generateLassoPath() {
  const newPaths: CoefPath[] = []
  const lambdas: number[] = []
  for (let i = 0; i <= 50; i++) lambdas.push(Math.exp(-i / 5))
  const trueCoef = [5, -3, 0, 4, 0, 0, -2, 0, 0, 1.5]

  lambdas.forEach(lambda => {
    const coef = trueCoef.map(tv => {
      const shrinkage = lambda * 2
      if (Math.abs(tv) <= shrinkage) return 0
      return tv > 0 ? tv - shrinkage : tv + shrinkage
    })
    newPaths.push({ lambda, coefficients: coef })
  })
  paths.value = newPaths
}

const currentCoef = computed(() => {
  if (paths.value.length === 0) return Array(numFeatures).fill(0)
  return paths.value.reduce((prev, curr) =>
    Math.abs(curr.lambda - selectedLambda.value) < Math.abs(prev.lambda - selectedLambda.value) ? curr : prev
  ).coefficients
})

const numNonZero = computed(() => currentCoef.value.filter(c => Math.abs(c) > 0.01).length)

const sortedCoefs = computed(() =>
  currentCoef.value.map((coef, idx) => ({ idx, absCoef: Math.abs(coef), coef }))
    .sort((a, b) => b.absCoef - a.absCoef)
)

const maxAbsCoef = computed(() => Math.max(...currentCoef.value.map(Math.abs), 0.1))

function drawChart() {
  if (!svgRef.value || paths.value.length === 0) return
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-text-1').trim() || '#333'
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-divider').trim() || '#e2e2e3'
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-bg').trim() || '#fff'

  const w = 560, h = 300
  const margin = { top: 30, right: 20, bottom: 45, left: 50 }
  const innerW = w - margin.left - margin.right
  const innerH = h - margin.top - margin.bottom

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${w} ${h}`)

  svg.append('rect').attr('width', w).attr('height', h).attr('fill', bgColor).attr('rx', 8)
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // Grid
  for (let i = 0; i <= 4; i++) {
    const yy = (i / 4) * innerH
    g.append('line').attr('x1', 0).attr('y1', yy).attr('x2', innerW).attr('y2', yy)
      .attr('stroke', gridColor).attr('stroke-width', 0.5)
  }

  // Zero line
  const zeroY = innerH / 2
  g.append('line').attr('x1', 0).attr('y1', zeroY).attr('x2', innerW).attr('y2', zeroY)
    .attr('stroke', textColor).attr('stroke-width', 1).attr('opacity', 0.3)

  // Coefficient paths
  const pathData = paths.value
  for (let fi = 0; fi < numFeatures; fi++) {
    const linePoints = pathData.map((p, pi) => ({
      x: (pi / (pathData.length - 1)) * innerW,
      y: zeroY - p.coefficients[fi] * (innerH / 2) / 6
    }))
    const linePath = d3.line<{ x: number; y: number }>().x(d => d.x).y(d => d.y)
    const isHovered = hoveredFeature.value === fi
    g.append('path').datum(linePoints)
      .attr('fill', 'none')
      .attr('stroke', COLORS[fi])
      .attr('stroke-width', isHovered ? 3 : 2)
      .attr('opacity', hoveredFeature.value === null || isHovered ? 1 : 0.2)
      .attr('d', linePath)
  }

  // Lambda indicator
  const lx = (1 - selectedLambda.value) * innerW
  g.append('line').attr('x1', lx).attr('y1', 0).attr('x2', lx).attr('y2', innerH)
    .attr('stroke', '#f59e0b').attr('stroke-width', 2).attr('stroke-dasharray', '5,5')
  g.append('text').attr('x', lx).attr('y', -8).attr('text-anchor', 'middle')
    .attr('fill', '#f59e0b').attr('font-size', '12px').text(`λ=${selectedLambda.value.toFixed(2)}`)

  // Axes labels
  g.append('text').attr('x', innerW / 2).attr('y', innerH + 35).attr('text-anchor', 'middle')
    .attr('fill', textColor).attr('font-size', '13px').text('λ (正则化强度)')
  g.append('text').attr('x', 0).attr('y', innerH + 25).attr('text-anchor', 'middle')
    .attr('fill', textColor).attr('font-size', '11px').text('大')
  g.append('text').attr('x', innerW).attr('y', innerH + 25).attr('text-anchor', 'middle')
    .attr('fill', textColor).attr('font-size', '11px').text('小')
  g.append('text').attr('x', -8).attr('y', zeroY + 4).attr('text-anchor', 'end')
    .attr('fill', textColor).attr('font-size', '11px').text('0')
  g.append('text').attr('x', -8).attr('y', 12).attr('text-anchor', 'end')
    .attr('fill', textColor).attr('font-size', '11px').text('+')
  g.append('text').attr('x', -8).attr('y', innerH).attr('text-anchor', 'end')
    .attr('fill', textColor).attr('font-size', '11px').text('−')
}

watch([paths, selectedLambda, hoveredFeature], drawChart, { flush: 'post' })
onMounted(() => { generateLassoPath() })
</script>

<template>
  <div class="lp-demo">
    <!-- Path chart -->
    <div class="lp-chart-wrap">
      <svg ref="svgRef" class="lp-chart-svg"></svg>
    </div>

    <!-- Lambda slider -->
    <div class="lp-slider-card">
      <label class="lp-label">正则化参数 λ: <strong>{{ selectedLambda.toFixed(2) }}</strong></label>
      <input type="range" min="0" max="1" step="0.01" :value="selectedLambda"
        @input="selectedLambda = Number(($event.target as HTMLInputElement).value)"
        class="lp-slider" />
      <div class="lp-ticks"><span>无正则化 (λ=0)</span><span>强正则化 (λ=1)</span></div>
    </div>

    <!-- Current coefficients -->
    <div class="lp-coefs">
      <div class="lp-coefs-header">
        <h4 class="lp-coefs-title">当前系数值</h4>
        <span class="lp-nonzero">非零系数: <strong>{{ numNonZero }}</strong> / {{ numFeatures }}</span>
      </div>
      <div class="lp-coef-grid">
        <div v-for="(coef, idx) in currentCoef" :key="idx"
          class="lp-coef-cell"
          :class="{ 'lp-coef-zero': Math.abs(coef) < 0.01, 'lp-coef-hover': hoveredFeature === idx }"
          @mouseenter="hoveredFeature = idx" @mouseleave="hoveredFeature = null">
          <div class="lp-coef-label">
            <span class="lp-coef-dot" :style="{ backgroundColor: COLORS[idx] }"></span>
            特征 {{ idx + 1 }}
          </div>
          <div class="lp-coef-val" :style="{ color: Math.abs(coef) < 0.01 ? 'var(--vp-c-text-3)' : COLORS[idx] }">
            {{ coef.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Bar chart -->
    <div class="lp-bars">
      <h4 class="lp-bars-title">系数大小（特征重要性）</h4>
      <div v-for="item in sortedCoefs" :key="item.idx" class="lp-bar-row"
        @mouseenter="hoveredFeature = item.idx" @mouseleave="hoveredFeature = null">
        <div class="lp-bar-header">
          <span class="lp-bar-name">
            <span class="lp-coef-dot" :style="{ backgroundColor: COLORS[item.idx] }"></span>
            特征 {{ item.idx + 1 }}
          </span>
          <span class="lp-bar-val">{{ item.coef.toFixed(2) }}</span>
        </div>
        <div class="lp-bar-track">
          <div class="lp-bar-fill"
            :style="{ width: (item.absCoef / maxAbsCoef * 100) + '%', backgroundColor: COLORS[item.idx], opacity: hoveredFeature === item.idx ? 1 : 0.7 }">
          </div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="lp-notes">
      <strong>LASSO稀疏性原理：</strong>
      <p class="lp-formula">目标函数：min ||y - Xw||² + λ||w||₁</p>
      <div class="lp-note-grid">
        <div class="lp-note-card">
          <strong style="color:#10b981">为什么产生稀疏性？</strong>
          <ul><li>L1范数在原点不可导</li><li>梯度下降容易将权重压缩到0</li><li>λ越大，零系数越多</li></ul>
        </div>
        <div class="lp-note-card">
          <strong style="color:#a855f7">应用场景</strong>
          <ul><li>高维数据特征选择</li><li>去除不相关特征</li><li>提高模型可解释性</li></ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lp-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.lp-chart-wrap { display: flex; justify-content: center; overflow-x: auto; }
.lp-chart-svg { border-radius: 8px; max-width: 100%; height: auto; }
.lp-slider-card {
  margin-top: 16px; padding: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
.lp-label { display: block; font-size: 14px; color: var(--vp-c-text-1); margin-bottom: 8px; }
.lp-slider { width: 100%; accent-color: #f59e0b; }
.lp-ticks { display: flex; justify-content: space-between; font-size: 12px; color: var(--vp-c-text-3); margin-top: 2px; }
.lp-coefs {
  margin-top: 16px; padding: 16px;
  background: var(--vp-c-bg);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 8px;
}
.lp-coefs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.lp-coefs-title { font-size: 15px; font-weight: 600; color: #a855f7; margin: 0; }
.lp-nonzero { font-size: 13px; color: var(--vp-c-text-2); }
.lp-nonzero strong { color: #10b981; font-size: 18px; }
.lp-coef-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
@media (max-width: 600px) { .lp-coef-grid { grid-template-columns: repeat(3, 1fr); } }
.lp-coef-cell {
  padding: 10px 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.lp-coef-hover { border-color: #f59e0b; }
.lp-coef-zero { opacity: 0.5; }
.lp-coef-label { font-size: 12px; color: var(--vp-c-text-3); display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 4px; }
.lp-coef-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.lp-coef-val { font-size: 18px; font-weight: 700; font-family: monospace; }
.lp-bars {
  margin-top: 16px; padding: 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
.lp-bars-title { font-size: 15px; font-weight: 600; color: var(--vp-c-text-1); margin: 0 0 12px 0; }
.lp-bar-row { margin-bottom: 8px; cursor: pointer; }
.lp-bar-header { display: flex; justify-content: space-between; font-size: 13px; color: var(--vp-c-text-1); margin-bottom: 3px; }
.lp-bar-name { display: flex; align-items: center; gap: 6px; }
.lp-bar-val { font-family: monospace; color: var(--vp-c-text-2); }
.lp-bar-track { height: 18px; background: var(--vp-c-bg-soft); border-radius: 4px; overflow: hidden; }
.lp-bar-fill { height: 100%; transition: width 0.3s, opacity 0.2s; border-radius: 4px; }
.lp-notes {
  margin-top: 16px; padding: 14px;
  background: rgba(245,158,11,0.06);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 8px;
  font-size: 13px; color: var(--vp-c-text-2); line-height: 1.7;
}
.lp-formula {
  font-family: monospace; text-align: center; padding: 6px; margin: 8px 0;
  background: var(--vp-c-bg); border-radius: 6px; color: var(--vp-c-text-1);
}
.lp-note-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
@media (max-width: 600px) { .lp-note-grid { grid-template-columns: 1fr; } }
.lp-note-card {
  background: var(--vp-c-bg); border-radius: 8px; padding: 10px;
  font-size: 12px;
}
.lp-note-card ul { padding-left: 16px; margin: 4px 0 0; }
.lp-note-card li { margin-bottom: 2px; }
</style>
