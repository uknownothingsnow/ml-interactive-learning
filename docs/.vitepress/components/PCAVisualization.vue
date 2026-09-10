<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'

interface Point3D { x: number; y: number; z: number }

const svgRef = ref<SVGSVGElement | null>(null)
const data3D = ref<Point3D[]>([])
const mean = ref<Point3D>({ x: 0, y: 0, z: 0 })
const pc1 = ref<Point3D>({ x: 1, y: 0, z: 0 })
const pc2 = ref<Point3D>({ x: 0, y: 1, z: 0 })
const rotationX = ref(0.3)
const rotationY = ref(0.3)
const showPCs = ref(true)
const showProjections = ref(false)
const variance = ref<number[]>([0, 0, 0])

const WIDTH = 520
const HEIGHT = 380
const SCALE = 70

function generateData() {
  const pts: Point3D[] = []
  const n = 50
  for (let i = 0; i < n; i++) {
    const t = (Math.random() - 0.5) * 4
    pts.push({
      x: t + (Math.random() - 0.5) * 0.5,
      y: t * 0.7 + (Math.random() - 0.5) * 0.3,
      z: t * 0.4 + (Math.random() - 0.5) * 0.2
    })
  }
  data3D.value = pts

  const mx = pts.reduce((s, p) => s + p.x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  const mz = pts.reduce((s, p) => s + p.z, 0) / n
  mean.value = { x: mx, y: my, z: mz }

  let cxx = 0, cyy = 0, czz = 0
  pts.forEach(p => {
    cxx += (p.x - mx) ** 2; cyy += (p.y - my) ** 2; czz += (p.z - mz) ** 2
  })
  cxx /= n; cyy /= n; czz /= n
  const totalVar = cxx + cyy + czz
  const len1 = Math.sqrt(cxx + cyy + czz)

  pc1.value = { x: Math.sqrt(cxx) / len1, y: Math.sqrt(cyy) / len1, z: Math.sqrt(czz) / len1 }
  pc2.value = { x: -Math.sqrt(cyy) / len1, y: Math.sqrt(cxx) / len1, z: 0 }
  variance.value = [cxx / totalVar * 100, cyy / totalVar * 100, czz / totalVar * 100]
}

function project3D(point: Point3D, offsetX = WIDTH / 2, offsetY = HEIGHT / 2) {
  const cosX = Math.cos(rotationX.value), sinX = Math.sin(rotationX.value)
  const cosY = Math.cos(rotationY.value), sinY = Math.sin(rotationY.value)
  let x = point.x * cosY - point.z * sinY
  let z = point.x * sinY + point.z * cosY
  let y = point.y
  const y2 = y * cosX - z * sinX
  const z2 = y * sinX + z * cosX
  const perspective = 1 - z2 / 10
  return { x: x * SCALE * perspective + offsetX, y: -y2 * SCALE * perspective + offsetY, z: z2 }
}

function projectOntoPC1(point: Point3D) {
  const m = mean.value, p = pc1.value
  const cx = point.x - m.x, cy = point.y - m.y, cz = point.z - m.z
  const t = cx * p.x + cy * p.y + cz * p.z
  return { x: m.x + t * p.x, y: m.y + t * p.y, z: m.z + t * p.z }
}

function drawChart() {
  if (!svgRef.value || data3D.value.length === 0) return
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-text-1').trim() || '#333'
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-bg').trim() || '#fff'

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)

  svg.append('rect').attr('width', WIDTH).attr('height', HEIGHT).attr('fill', bgColor).attr('rx', 8)

  // Axes
  const origin = project3D({ x: 0, y: 0, z: 0 })
  const xEnd = project3D({ x: 2, y: 0, z: 0 })
  const yEnd = project3D({ x: 0, y: 2, z: 0 })
  const zEnd = project3D({ x: 0, y: 0, z: 2 })

  svg.append('line').attr('x1', origin.x).attr('y1', origin.y).attr('x2', xEnd.x).attr('y2', xEnd.y)
    .attr('stroke', '#ef4444').attr('stroke-width', 1.5).attr('opacity', 0.3)
  svg.append('line').attr('x1', origin.x).attr('y1', origin.y).attr('x2', yEnd.x).attr('y2', yEnd.y)
    .attr('stroke', '#10b981').attr('stroke-width', 1.5).attr('opacity', 0.3)
  svg.append('line').attr('x1', origin.x).attr('y1', origin.y).attr('x2', zEnd.x).attr('y2', zEnd.y)
    .attr('stroke', '#3b82f6').attr('stroke-width', 1.5).attr('opacity', 0.3)

  // Principal components
  if (showPCs.value) {
    const m = mean.value, p1 = pc1.value, p2 = pc2.value
    const pc1S = project3D({ x: m.x - p1.x * 2, y: m.y - p1.y * 2, z: m.z - p1.z * 2 })
    const pc1E = project3D({ x: m.x + p1.x * 2, y: m.y + p1.y * 2, z: m.z + p1.z * 2 })
    svg.append('line').attr('x1', pc1S.x).attr('y1', pc1S.y).attr('x2', pc1E.x).attr('y2', pc1E.y)
      .attr('stroke', '#f59e0b').attr('stroke-width', 3)

    const angle1 = Math.atan2(pc1E.y - pc1S.y, pc1E.x - pc1S.x)
    svg.append('polygon')
      .attr('points', `${pc1E.x},${pc1E.y} ${pc1E.x - 10 * Math.cos(angle1 - Math.PI / 6)},${pc1E.y - 10 * Math.sin(angle1 - Math.PI / 6)} ${pc1E.x - 10 * Math.cos(angle1 + Math.PI / 6)},${pc1E.y - 10 * Math.sin(angle1 + Math.PI / 6)}`)
      .attr('fill', '#f59e0b')

    const pc2S = project3D({ x: m.x - p2.x * 1.5, y: m.y - p2.y * 1.5, z: m.z - p2.z * 1.5 })
    const pc2E = project3D({ x: m.x + p2.x * 1.5, y: m.y + p2.y * 1.5, z: m.z + p2.z * 1.5 })
    svg.append('line').attr('x1', pc2S.x).attr('y1', pc2S.y).attr('x2', pc2E.x).attr('y2', pc2E.y)
      .attr('stroke', '#a855f7').attr('stroke-width', 3)
  }

  // Sort for z-order
  const projected = data3D.value.map(p => ({
    original: p,
    proj: project3D(p),
    projPC1: showProjections.value ? projectOntoPC1(p) : null
  })).sort((a, b) => a.proj.z - b.proj.z)

  // Projection lines
  if (showProjections.value) {
    projected.forEach(({ proj, projPC1 }) => {
      if (!projPC1) return
      const pp = project3D(projPC1)
      svg.append('line').attr('x1', proj.x).attr('y1', proj.y).attr('x2', pp.x).attr('y2', pp.y)
        .attr('stroke', '#f59e0b').attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.3)
      svg.append('circle').attr('cx', pp.x).attr('cy', pp.y).attr('r', 3).attr('fill', '#f59e0b')
    })
  }

  // Data points
  projected.forEach(({ proj }) => {
    const brightness = Math.max(0.3, Math.min(1, (proj.z + 5) / 10))
    svg.append('circle').attr('cx', proj.x).attr('cy', proj.y).attr('r', 4)
      .attr('fill', `rgba(59, 130, 246, ${brightness})`).attr('stroke', textColor).attr('stroke-width', 0.5)
  })
}

watch([data3D, rotationX, rotationY, showPCs, showProjections], drawChart, { flush: 'post' })
onMounted(() => { generateData() })
</script>

<template>
  <div class="pca-demo">
    <!-- SVG chart -->
    <div class="pca-chart-wrap">
      <svg ref="svgRef" class="pca-chart-svg"></svg>
    </div>

    <!-- Rotation controls -->
    <div class="pca-rotation">
      <div class="pca-rot-item">
        <label class="pca-label">水平旋转: <strong>{{ (rotationY * 180 / Math.PI).toFixed(0) }}°</strong></label>
        <input type="range" :min="0" :max="Math.PI * 2" step="0.01" :value="rotationY"
          @input="rotationY = Number(($event.target as HTMLInputElement).value)" class="pca-slider" />
      </div>
      <div class="pca-rot-item">
        <label class="pca-label">垂直旋转: <strong>{{ (rotationX * 180 / Math.PI).toFixed(0) }}°</strong></label>
        <input type="range" :min="-Math.PI / 2" :max="Math.PI / 2" step="0.01" :value="rotationX"
          @input="rotationX = Number(($event.target as HTMLInputElement).value)" class="pca-slider pca-slider-purple" />
      </div>
    </div>

    <!-- Controls row -->
    <div class="pca-controls">
      <button class="pca-btn pca-btn-primary" @click="generateData">重新生成数据</button>
      <label class="pca-check"><input type="checkbox" v-model="showPCs" /> 显示主成分</label>
      <label class="pca-check"><input type="checkbox" v-model="showProjections" /> 显示投影</label>
    </div>

    <!-- Variance explained -->
    <div class="pca-variance">
      <h4 class="pca-var-title">方差解释比例</h4>
      <div v-for="(label, idx) in ['X方向', 'Y方向', 'Z方向']" :key="idx" class="pca-var-row">
        <div class="pca-var-header">
          <span>{{ label }}</span>
          <strong class="pca-var-pct">{{ variance[idx].toFixed(1) }}%</strong>
        </div>
        <div class="pca-var-track"><div class="pca-var-fill" :style="{ width: variance[idx] + '%' }"></div></div>
      </div>
      <div class="pca-var-footer">
        <span>第一主成分（PC1）解释：</span>
        <strong class="pca-var-highlight">{{ variance[0].toFixed(1) }}%</strong>
      </div>
    </div>

    <!-- Legend -->
    <div class="pca-legend">
      <div class="pca-legend-item"><span class="pca-dot" style="background:#3b82f6"></span> 原始数据点</div>
      <div class="pca-legend-item"><span class="pca-line" style="background:#f59e0b"></span> 第一主成分（PC1）</div>
      <div class="pca-legend-item"><span class="pca-line" style="background:#a855f7"></span> 第二主成分（PC2）</div>
      <div class="pca-legend-item"><span class="pca-dot" style="background:#f59e0b"></span> 投影点</div>
    </div>

    <!-- Notes -->
    <div class="pca-notes">
      <strong>PCA原理：</strong>
      <ol>
        <li><strong>中心化</strong>：将数据平移使均值为0</li>
        <li><strong>计算协方差矩阵</strong>：衡量特征间的相关性</li>
        <li><strong>特征值分解</strong>：找到方差最大的方向（主成分）</li>
        <li><strong>选择主成分</strong>：保留前k个最大特征值对应的特征向量</li>
        <li><strong>投影</strong>：将数据投影到主成分构成的子空间</li>
      </ol>
      <p style="margin-top:8px"><strong>目标</strong>：在降低维度的同时最大化保留数据的方差（信息量）</p>
    </div>
  </div>
</template>

<style scoped>
.pca-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.pca-chart-wrap { display: flex; justify-content: center; overflow-x: auto; }
.pca-chart-svg { border-radius: 8px; max-width: 100%; height: auto; }
.pca-rotation { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
@media (max-width: 600px) { .pca-rotation { grid-template-columns: 1fr; } }
.pca-rot-item {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
}
.pca-label { display: block; font-size: 14px; color: var(--vp-c-text-1); margin-bottom: 8px; }
.pca-slider { width: 100%; accent-color: #3b82f6; }
.pca-slider-purple { accent-color: #a855f7; }
.pca-controls {
  display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; align-items: center;
}
.pca-btn {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 14px; cursor: pointer;
}
.pca-btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; font-weight: 600; }
.pca-btn-primary:hover { background: #2563eb; }
.pca-check {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: var(--vp-c-text-1); cursor: pointer;
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 8px; padding: 8px 14px;
}
.pca-check input { accent-color: #f59e0b; width: 18px; height: 18px; }
.pca-variance {
  margin-top: 16px; padding: 16px;
  background: var(--vp-c-bg);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 8px;
}
.pca-var-title { font-size: 15px; font-weight: 600; color: #f59e0b; margin: 0 0 12px 0; }
.pca-var-row { margin-bottom: 10px; }
.pca-var-header { display: flex; justify-content: space-between; font-size: 13px; color: var(--vp-c-text-1); margin-bottom: 4px; }
.pca-var-pct { color: #3b82f6; }
.pca-var-track { height: 14px; background: var(--vp-c-bg-soft); border-radius: 4px; overflow: hidden; }
.pca-var-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); transition: width 0.5s; border-radius: 4px; }
.pca-var-footer {
  display: flex; justify-content: space-between; font-size: 13px;
  color: var(--vp-c-text-2); border-top: 1px solid var(--vp-c-divider);
  margin-top: 8px; padding-top: 8px;
}
.pca-var-highlight { color: #f59e0b; }
.pca-legend {
  display: flex; flex-wrap: wrap; gap: 16px;
  margin-top: 16px; padding: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px; color: var(--vp-c-text-2);
}
.pca-legend-item { display: flex; align-items: center; gap: 6px; }
.pca-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.pca-line { width: 20px; height: 3px; border-radius: 2px; flex-shrink: 0; }
.pca-notes {
  margin-top: 16px; padding: 14px;
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 8px;
  font-size: 13px; color: var(--vp-c-text-2); line-height: 1.7;
}
.pca-notes ol { padding-left: 20px; margin-top: 6px; }
.pca-notes li { margin-bottom: 2px; }
</style>
