<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface LblNode {
  x: number
  y: number
  label: number | null
  originalLabel: number | null
  probability: number[]
  isLabeled: boolean
}

interface LblEdge {
  from: number
  to: number
  weight: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const nodes = ref<LblNode[]>([])
const edges = ref<LblEdge[]>([])
const iteration = ref(0)
const isRunning = ref(false)
const converged = ref(false)
const alpha = ref(0.8)

const WIDTH = 600
const HEIGHT = 400
const NUM_NODES = 40
const K_NEIGHBORS = 5

function generateData() {
  const newNodes: LblNode[] = []
  for (let i = 0; i < NUM_NODES; i++) {
    let x: number, y: number
    const cluster = i < NUM_NODES / 2 ? 0 : 1
    if (cluster === 0) {
      x = 100 + Math.random() * 200
      y = 250 + Math.random() * 100
    } else {
      x = 300 + Math.random() * 200
      y = 50 + Math.random() * 150
    }
    const isLabeled = Math.random() < 0.1
    newNodes.push({
      x, y,
      label: isLabeled ? cluster : null,
      originalLabel: cluster,
      probability: isLabeled ? (cluster === 0 ? [1, 0] : [0, 1]) : [0.5, 0.5],
      isLabeled
    })
  }
  nodes.value = newNodes

  const newEdges: LblEdge[] = []
  newNodes.forEach((node, i) => {
    const distances = newNodes.map((other, j) => ({
      index: j,
      dist: Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2)
    }))
    .filter(d => d.index !== i)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, K_NEIGHBORS)

    distances.forEach(({ index, dist }) => {
      const sigma = 50
      const weight = Math.exp(-(dist ** 2) / (2 * sigma ** 2))
      newEdges.push({ from: i, to: index, weight })
    })
  })

  edges.value = newEdges
  iteration.value = 0
  converged.value = false
  isRunning.value = false
}

function propagateLabels() {
  if (converged.value) return
  const ns = nodes.value.map(n => ({ ...n, probability: [...n.probability] }))
  let hasChanged = false

  ns.forEach((node, i) => {
    if (node.isLabeled) return
    const neighbors = edges.value
      .filter(e => e.from === i)
      .map(e => ({ node: nodes.value[e.to], weight: e.weight }))
    if (neighbors.length === 0) return

    const newProb = [0, 0]
    let totalWeight = 0
    neighbors.forEach(({ node: neighbor, weight }) => {
      newProb[0] += weight * neighbor.probability[0]
      newProb[1] += weight * neighbor.probability[1]
      totalWeight += weight
    })
    if (totalWeight > 0) {
      newProb[0] /= totalWeight
      newProb[1] /= totalWeight
      if (alpha.value < 1) {
        newProb[0] = alpha.value * newProb[0] + (1 - alpha.value) * 0.5
        newProb[1] = alpha.value * newProb[1] + (1 - alpha.value) * 0.5
      }
      if (Math.abs(newProb[0] - node.probability[0]) > 0.01) hasChanged = true
      ns[i].probability = newProb
      ns[i].label = newProb[0] > newProb[1] ? 0 : 1
    }
  })

  nodes.value = ns
  iteration.value++
  if (!hasChanged) {
    converged.value = true
    isRunning.value = false
  }
}

// Auto-run
watch([isRunning, converged, iteration], () => {
  if (isRunning.value && !converged.value) {
    setTimeout(propagateLabels, 300)
  }
})

// Drawing
function drawCanvas() {
  const canvas = canvasRef.value
  if (!canvas || nodes.value.length === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-bg').trim() || '#ffffff'
  const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-divider').trim() || '#e2e2e3'

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.strokeStyle = edgeColor
  ctx.lineWidth = 1
  edges.value.forEach(edge => {
    const from = nodes.value[edge.from]
    const to = nodes.value[edge.to]
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.globalAlpha = edge.weight * 0.3
    ctx.stroke()
    ctx.globalAlpha = 1
  })

  nodes.value.forEach(node => {
    const prob0 = node.probability[0]
    const prob1 = node.probability[1]
    let color: string
    if (prob0 > prob1) {
      color = `rgba(239, 68, 68, ${prob0})`
    } else {
      color = `rgba(6, 182, 212, ${prob1})`
    }
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.isLabeled ? 8 : 5, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
    if (node.isLabeled) {
      ctx.strokeStyle = '#eab308'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-text-1').trim() || '#333'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  })
}

watch([nodes, edges], drawCanvas, { flush: 'post' })

onMounted(() => {
  generateData()
})

const accuracy = (() => {
  return () => {
    if (nodes.value.length === 0) return '0'
    return (nodes.value.filter(n => n.label === n.originalLabel).length / nodes.value.length * 100).toFixed(1)
  }
})()

const numLabeled = () => nodes.value.filter(n => n.isLabeled).length

function onAlphaChange(e: Event) {
  alpha.value = Number((e.target as HTMLInputElement).value)
  generateData()
}
</script>

<template>
  <div class="lbl-wrapper">
    <div class="lbl-canvas-card">
      <div style="display:flex;justify-content:center;">
        <canvas
          ref="canvasRef"
          :width="WIDTH"
          :height="HEIGHT"
          class="lbl-canvas"
        />
      </div>
    </div>

    <div class="lbl-stats-row">
      <div class="lbl-stat-box">
        <div class="lbl-stat-label">迭代次数</div>
        <div class="lbl-stat-value lbl-c-brand">{{ iteration }}</div>
      </div>
      <div class="lbl-stat-box">
        <div class="lbl-stat-label">标记样本</div>
        <div class="lbl-stat-value lbl-c-yellow">{{ numLabeled() }}</div>
      </div>
      <div class="lbl-stat-box">
        <div class="lbl-stat-label">未标记样本</div>
        <div class="lbl-stat-value lbl-c-purple">{{ NUM_NODES - numLabeled() }}</div>
      </div>
      <div class="lbl-stat-box">
        <div class="lbl-stat-label">准确率</div>
        <div class="lbl-stat-value lbl-c-green">{{ accuracy() }}%</div>
      </div>
    </div>

    <div class="lbl-control-card">
      <label class="lbl-label">平滑参数 α: {{ alpha.toFixed(2) }}</label>
      <input
        type="range" min="0" max="1" step="0.05"
        :value="alpha"
        @input="onAlphaChange"
        class="lbl-slider"
        :disabled="isRunning"
      />
      <div class="lbl-tick-labels">
        <span>标签传播 (α=1)</span>
        <span>标签扩散 (α&lt;1)</span>
      </div>
    </div>

    <div class="lbl-btn-row">
      <button class="lbl-btn lbl-btn--secondary" @click="generateData" :disabled="isRunning">
        🔄 重新生成数据
      </button>
      <button class="lbl-btn lbl-btn--primary" @click="propagateLabels" :disabled="isRunning || converged">
        ▶️ 单步传播
      </button>
      <button class="lbl-btn lbl-btn--accent" @click="isRunning = true" :disabled="isRunning || converged">
        ⚡ 运行至收敛
      </button>
      <div v-if="converged" class="lbl-converged-badge">✓ 已收敛</div>
    </div>

    <div class="lbl-legend">
      <h4 class="lbl-legend-title">图例说明</h4>
      <div class="lbl-legend-items">
        <div class="lbl-legend-item">
          <span class="lbl-dot lbl-dot--red-labeled"></span>
          <span>标记样本（类别0）</span>
        </div>
        <div class="lbl-legend-item">
          <span class="lbl-dot lbl-dot--cyan-labeled"></span>
          <span>标记样本（类别1）</span>
        </div>
        <div class="lbl-legend-item">
          <span class="lbl-dot lbl-dot--unlabeled"></span>
          <span>未标记样本</span>
        </div>
      </div>
      <p class="lbl-legend-note">颜色深浅表示预测置信度，连线表示k近邻关系</p>
    </div>
  </div>
</template>

<style scoped>
.lbl-wrapper { display: flex; flex-direction: column; gap: 16px; }
.lbl-canvas-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
}
.lbl-canvas {
  border-radius: 8px;
  max-width: 100%;
  height: auto;
}
.lbl-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 640px) {
  .lbl-stats-row { grid-template-columns: repeat(2, 1fr); }
}
.lbl-stat-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
}
.lbl-stat-label { font-size: 0.8em; color: var(--vp-c-text-2); margin-bottom: 4px; }
.lbl-stat-value { font-size: 1.6em; font-weight: 700; }
.lbl-c-brand { color: var(--vp-c-brand-1); }
.lbl-c-yellow { color: #eab308; }
.lbl-c-purple { color: #a855f7; }
.lbl-c-green { color: #10b981; }
.lbl-control-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
}
.lbl-label {
  display: block; font-size: 0.9em; font-weight: 700;
  color: var(--vp-c-text-1); margin-bottom: 8px;
}
.lbl-slider { width: 100%; accent-color: var(--vp-c-brand-1); }
.lbl-tick-labels {
  display: flex; justify-content: space-between;
  font-size: 0.75em; color: var(--vp-c-text-2); margin-top: 4px;
}
.lbl-btn-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.lbl-btn {
  padding: 8px 16px; border: none; border-radius: 8px;
  font-weight: 600; font-size: 0.9em; cursor: pointer; transition: opacity 0.2s;
}
.lbl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.lbl-btn--secondary {
  background: var(--vp-c-bg-soft); color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}
.lbl-btn--primary { background: var(--vp-c-brand-1); color: #fff; }
.lbl-btn--accent { background: #a855f7; color: #fff; }
.lbl-converged-badge {
  padding: 8px 16px; border-radius: 8px; font-weight: 700;
  background: rgba(16,185,129,0.1); color: #10b981;
  border: 1px solid rgba(16,185,129,0.3);
}
.lbl-legend {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
}
.lbl-legend-title { font-size: 0.9em; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 10px; }
.lbl-legend-items { display: flex; flex-wrap: wrap; gap: 16px; }
.lbl-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--vp-c-text-2); }
.lbl-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
.lbl-dot--red-labeled { background: #ef4444; border: 2px solid #eab308; }
.lbl-dot--cyan-labeled { background: #06b6d4; border: 2px solid #eab308; }
.lbl-dot--unlabeled { background: #9ca3af; border: 1px solid var(--vp-c-text-1); width: 10px; height: 10px; }
.lbl-legend-note { font-size: 0.75em; color: var(--vp-c-text-3); margin-top: 8px; }
</style>
