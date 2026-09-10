<script setup lang="ts">
import { ref, computed } from 'vue'

const inputNodes = ref(3)
const hiddenLayers = ref(2)
const nodesPerLayer = ref(4)
const outputNodes = ref(2)
const animateForward = ref(false)

const network = computed(() => {
  const layers = [
    { name: '输入层', nodes: inputNodes.value, gradId: 'nn-inputGrad' },
    ...Array(hiddenLayers.value).fill(0).map((_, i) => ({
      name: `隐藏层 ${i + 1}`, nodes: nodesPerLayer.value, gradId: 'nn-hiddenGrad'
    })),
    { name: '输出层', nodes: outputNodes.value, gradId: 'nn-outputGrad' }
  ]
  return layers
})

const totalLayers = computed(() => network.value.length)

function calcPos(layerIdx: number, nodeIdx: number, totalNodes: number) {
  const layerWidth = 800 / (totalLayers.value + 1)
  const x = layerWidth * (layerIdx + 1)
  const nodeHeight = 400 / (totalNodes + 1)
  const y = nodeHeight * (nodeIdx + 1) + 50
  return { x, y }
}

// Build connection list
const connections = computed(() => {
  const conns: { fromX: number; fromY: number; toX: number; toY: number }[] = []
  const net = network.value
  for (let li = 0; li < net.length - 1; li++) {
    for (let ni = 0; ni < net[li].nodes; ni++) {
      const from = calcPos(li, ni, net[li].nodes)
      for (let nj = 0; nj < net[li + 1].nodes; nj++) {
        const to = calcPos(li + 1, nj, net[li + 1].nodes)
        conns.push({ fromX: from.x, fromY: from.y, toX: to.x, toY: to.y })
      }
    }
  }
  return conns
})

// Build node list
const nodes = computed(() => {
  const result: { x: number; y: number; gradId: string; layerIdx: number }[] = []
  network.value.forEach((layer, li) => {
    for (let ni = 0; ni < layer.nodes; ni++) {
      const pos = calcPos(li, ni, layer.nodes)
      result.push({ x: pos.x, y: pos.y, gradId: layer.gradId, layerIdx: li })
    }
  })
  return result
})

// Labels
const layerLabels = computed(() =>
  network.value.map((layer, li) => ({
    x: calcPos(li, 0, layer.nodes).x,
    name: layer.name
  }))
)

// Stats
const totalNodes = computed(() => network.value.reduce((s, l) => s + l.nodes, 0))
const totalConns = computed(() => {
  let s = 0
  const net = network.value
  for (let i = 0; i < net.length - 1; i++) s += net[i].nodes * net[i + 1].nodes
  return s
})
const totalParams = computed(() => {
  let s = 0
  const net = network.value
  for (let i = 0; i < net.length - 1; i++) s += net[i].nodes * net[i + 1].nodes + net[i + 1].nodes
  return s
})

function triggerAnimation() {
  animateForward.value = true
  setTimeout(() => { animateForward.value = false }, 2000)
}
</script>

<template>
  <div class="nn-root">
    <!-- Controls -->
    <div class="nn-controls">
      <div class="nn-ctrl">
        <div class="nn-ctrl-header"><label>输入层节点</label><span class="nn-badge nn-badge-cyan">{{ inputNodes }}</span></div>
        <input type="range" min="1" max="6" v-model.number="inputNodes" class="nn-slider" />
      </div>
      <div class="nn-ctrl">
        <div class="nn-ctrl-header"><label>隐藏层数</label><span class="nn-badge nn-badge-purple">{{ hiddenLayers }}</span></div>
        <input type="range" min="1" max="4" v-model.number="hiddenLayers" class="nn-slider" />
      </div>
      <div class="nn-ctrl">
        <div class="nn-ctrl-header"><label>隐藏层节点</label><span class="nn-badge nn-badge-blue">{{ nodesPerLayer }}</span></div>
        <input type="range" min="2" max="8" v-model.number="nodesPerLayer" class="nn-slider" />
      </div>
      <div class="nn-ctrl">
        <div class="nn-ctrl-header"><label>输出层节点</label><span class="nn-badge nn-badge-orange">{{ outputNodes }}</span></div>
        <input type="range" min="1" max="5" v-model.number="outputNodes" class="nn-slider" />
      </div>
    </div>

    <!-- Animate button -->
    <div class="nn-btn-row">
      <button class="nn-animate-btn" @click="triggerAnimation">播放前向传播动画</button>
    </div>

    <!-- SVG network -->
    <div class="nn-svg-wrap">
      <svg viewBox="0 0 900 600" class="nn-svg">
        <defs>
          <linearGradient id="nn-inputGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00d9ff" /><stop offset="100%" stop-color="#6366f1" />
          </linearGradient>
          <linearGradient id="nn-hiddenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a855f7" /><stop offset="100%" stop-color="#6366f1" />
          </linearGradient>
          <linearGradient id="nn-outputGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb923c" /><stop offset="100%" stop-color="#ef4444" />
          </linearGradient>
        </defs>

        <!-- Connections -->
        <line
          v-for="(c, i) in connections" :key="'c-' + i"
          :x1="c.fromX" :y1="c.fromY" :x2="c.toX" :y2="c.toY"
          stroke="rgba(99, 102, 241, 0.2)" stroke-width="1.5"
          :class="{ 'nn-pulse': animateForward }"
        />

        <!-- Nodes -->
        <g v-for="(n, i) in nodes" :key="'n-' + i">
          <circle
            v-if="animateForward"
            :cx="n.x" :cy="n.y" r="20"
            :fill="`url(#${n.gradId})`" opacity="0.3"
            class="nn-ping"
          />
          <circle
            :cx="n.x" :cy="n.y" r="12"
            :fill="`url(#${n.gradId})`"
            stroke="white" stroke-width="2"
            :class="{ 'nn-pulse': animateForward }"
          />
        </g>

        <!-- Layer labels -->
        <text
          v-for="(ll, i) in layerLabels" :key="'ll-' + i"
          :x="ll.x" y="30" text-anchor="middle"
          class="nn-layer-label"
        >{{ ll.name }}</text>
      </svg>
    </div>

    <!-- Stats -->
    <div class="nn-stats">
      <div class="nn-stat-card nn-stat-cyan"><div class="nn-stat-label">总层数</div><div class="nn-stat-val">{{ totalLayers }}</div></div>
      <div class="nn-stat-card nn-stat-purple"><div class="nn-stat-label">总节点数</div><div class="nn-stat-val">{{ totalNodes }}</div></div>
      <div class="nn-stat-card nn-stat-blue"><div class="nn-stat-label">总连接数</div><div class="nn-stat-val">{{ totalConns }}</div></div>
      <div class="nn-stat-card nn-stat-orange"><div class="nn-stat-label">参数数量</div><div class="nn-stat-val">{{ totalParams }}</div></div>
    </div>

    <!-- Info -->
    <div class="nn-info">
      <span class="nn-info-icon">💡</span>
      <div>
        <h4>网络结构说明</h4>
        <ul>
          <li><strong>输入层</strong>：接收原始特征数据（如图像像素、文本词向量等）</li>
          <li><strong>隐藏层</strong>：提取和转换特征，层数越多表示网络越"深"</li>
          <li><strong>输出层</strong>：产生最终预测结果（分类概率或回归值）</li>
          <li><strong>连接权重</strong>：每条连接都有一个可学习的权重参数</li>
          <li><strong>前向传播</strong>：信号从输入层经过隐藏层传递到输出层的过程</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nn-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}

/* Controls */
.nn-controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (min-width: 768px) { .nn-controls { grid-template-columns: repeat(4, 1fr); } }

.nn-ctrl {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
}
.nn-ctrl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.nn-ctrl-header label { font-size: 13px; font-weight: 600; color: var(--vp-c-text-1); }
.nn-badge { font-size: 20px; font-weight: 700; color: var(--vp-c-text-1); padding: 2px 8px; border-radius: 6px; }
.nn-badge-cyan { background: rgba(6, 182, 212, 0.15); }
.nn-badge-purple { background: rgba(139, 92, 246, 0.15); }
.nn-badge-blue { background: rgba(59, 130, 246, 0.15); }
.nn-badge-orange { background: rgba(249, 115, 22, 0.15); }
.nn-slider { width: 100%; accent-color: var(--vp-c-brand-1); }

/* Button */
.nn-btn-row { display: flex; justify-content: center; }
.nn-animate-btn {
  padding: 10px 28px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.nn-animate-btn:hover { opacity: 0.85; }

/* SVG */
.nn-svg-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  overflow-x: auto;
}
.nn-svg { width: 100%; height: auto; }
.nn-layer-label { fill: var(--vp-c-text-1); font-size: 14px; font-weight: 700; font-family: monospace; }

.nn-pulse { animation: nn-pulse-anim 1s infinite; }
@keyframes nn-pulse-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.nn-ping { animation: nn-ping-anim 1s infinite; }
@keyframes nn-ping-anim { 0% { r: 12; opacity: 0.3; } 100% { r: 24; opacity: 0; } }

/* Stats */
.nn-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 640px) { .nn-stats { grid-template-columns: repeat(4, 1fr); } }
.nn-stat-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}
.nn-stat-label { font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.nn-stat-val { font-size: 28px; font-weight: 700; }
.nn-stat-cyan .nn-stat-val { color: #06b6d4; }
.nn-stat-purple .nn-stat-val { color: #8b5cf6; }
.nn-stat-blue .nn-stat-val { color: #3b82f6; }
.nn-stat-orange .nn-stat-val { color: #f97316; }

/* Info */
.nn-info {
  display: flex;
  gap: 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  padding: 20px;
}
.nn-info-icon { font-size: 24px; flex-shrink: 0; }
.nn-info h4 { font-size: 15px; font-weight: 700; color: var(--vp-c-text-1); margin: 0 0 8px 0; }
.nn-info ul { margin: 0; padding: 0; list-style: none; }
.nn-info li { font-size: 13px; color: var(--vp-c-text-2); padding: 3px 0; }
.nn-info li::before { content: '• '; color: var(--vp-c-text-3); }
.nn-info li strong { color: var(--vp-c-text-1); }
</style>
