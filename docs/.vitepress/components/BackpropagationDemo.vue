<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface NetworkNode {
  id: string
  layer: number
  index: number
  value: number
  gradient: number
  activated: boolean
}

interface Connection {
  from: string
  to: string
  weight: number
  gradient: number
  active: boolean
}

const isPlaying = ref(false)
const phase = ref<'idle' | 'forward' | 'backward' | 'update'>('idle')
const step = ref(0)
const learningRate = ref(0.1)
const targetValue = 0.9

const initialNodes: NetworkNode[] = [
  { id: 'i0', layer: 0, index: 0, value: 0.8, gradient: 0, activated: false },
  { id: 'i1', layer: 0, index: 1, value: 0.6, gradient: 0, activated: false },
  { id: 'h0', layer: 1, index: 0, value: 0, gradient: 0, activated: false },
  { id: 'h1', layer: 1, index: 1, value: 0, gradient: 0, activated: false },
  { id: 'o0', layer: 2, index: 0, value: 0, gradient: 0, activated: false },
]

const initialConns: Connection[] = [
  { from: 'i0', to: 'h0', weight: 0.5, gradient: 0, active: false },
  { from: 'i0', to: 'h1', weight: -0.3, gradient: 0, active: false },
  { from: 'i1', to: 'h0', weight: 0.4, gradient: 0, active: false },
  { from: 'i1', to: 'h1', weight: 0.6, gradient: 0, active: false },
  { from: 'h0', to: 'o0', weight: 0.7, gradient: 0, active: false },
  { from: 'h1', to: 'o0', weight: -0.2, gradient: 0, active: false },
]

const nodes = ref<NetworkNode[]>(JSON.parse(JSON.stringify(initialNodes)))
const connections = ref<Connection[]>(JSON.parse(JSON.stringify(initialConns)))

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const sigmoidDeriv = (x: number) => { const s = sigmoid(x); return s * (1 - s) }

function resetNetwork() {
  isPlaying.value = false
  phase.value = 'idle'
  nodes.value = nodes.value.map(n => ({
    ...n, gradient: 0, activated: false, value: n.layer === 0 ? (n.id === 'i0' ? 0.8 : 0.6) : 0
  }))
  connections.value = connections.value.map(c => ({ ...c, gradient: 0, active: false }))
}

function forwardPass() {
  const ns = nodes.value
  const cs = connections.value

  // Activate hidden connections
  cs.forEach(c => { if (c.to.startsWith('h')) c.active = true })

  // Hidden layer
  ns.forEach(node => {
    if (node.layer === 1) {
      const incoming = cs.filter(c => c.to === node.id)
      const sum = incoming.reduce((acc, c) => {
        const from = ns.find(n => n.id === c.from)!
        return acc + from.value * c.weight
      }, 0)
      node.value = sigmoid(sum)
      node.activated = true
    }
  })

  // Output layer with delay
  setTimeout(() => {
    cs.forEach(c => { if (c.to.startsWith('o')) c.active = true })
    ns.forEach(node => {
      if (node.layer === 2) {
        const incoming = cs.filter(c => c.to === node.id)
        const sum = incoming.reduce((acc, c) => {
          const from = ns.find(n => n.id === c.from)!
          return acc + from.value * c.weight
        }, 0)
        node.value = sigmoid(sum)
        node.activated = true
      }
    })
  }, 500)
}

function backwardPass() {
  const ns = nodes.value
  const cs = connections.value

  // Output gradient
  const outputNode = ns.find(n => n.layer === 2)!
  const error = outputNode.value - targetValue
  outputNode.gradient = error * sigmoidDeriv(outputNode.value)

  // H -> O gradients
  cs.forEach(c => {
    if (c.to === outputNode.id) {
      const from = ns.find(n => n.id === c.from)!
      c.gradient = outputNode.gradient * from.value
      c.active = true
    }
  })

  setTimeout(() => {
    // Hidden gradients
    ns.forEach(node => {
      if (node.layer === 1) {
        const outgoing = cs.filter(c => c.from === node.id)
        const gradSum = outgoing.reduce((acc, c) => {
          const toNode = ns.find(n => n.id === c.to)!
          return acc + toNode.gradient * c.weight
        }, 0)
        node.gradient = gradSum * sigmoidDeriv(node.value)
      }
    })

    // I -> H gradients
    cs.forEach(c => {
      if (c.to.startsWith('h')) {
        const from = ns.find(n => n.id === c.from)!
        const to = ns.find(n => n.id === c.to)!
        c.gradient = to.gradient * from.value
        c.active = true
      }
    })
  }, 500)
}

function updateWeights() {
  connections.value = connections.value.map(c => ({
    ...c,
    weight: c.weight - learningRate.value * c.gradient,
    active: true
  }))
}

// Animation control
let timer: ReturnType<typeof setTimeout> | null = null

watch([isPlaying, phase], () => {
  if (timer) { clearTimeout(timer); timer = null }
  if (!isPlaying.value) return

  timer = setTimeout(() => {
    if (phase.value === 'idle') {
      phase.value = 'forward'
      forwardPass()
    } else if (phase.value === 'forward') {
      phase.value = 'backward'
      backwardPass()
    } else if (phase.value === 'backward') {
      phase.value = 'update'
      updateWeights()
    } else if (phase.value === 'update') {
      phase.value = 'idle'
      isPlaying.value = false
      step.value++
    }
  }, 1500)
})

function startAnimation() {
  resetNetwork()
  isPlaying.value = true
}

// Node positioning
const layerX = [150, 400, 650]
const layerSizes = [2, 2, 1]

function getPos(node: NetworkNode) {
  const x = layerX[node.layer]
  const size = layerSizes[node.layer]
  const spacing = 300 / (size + 1)
  const y = spacing * (node.index + 1) + 50
  return { x, y }
}

const outputValue = computed(() => nodes.value.find(n => n.layer === 2)?.value || 0)
const lossValue = computed(() => Math.pow(outputValue.value - targetValue, 2) / 2)

const phases = [
  { key: 'idle', label: '准备', icon: '⏸️' },
  { key: 'forward', label: '前向传播', icon: '➡️' },
  { key: 'backward', label: '反向传播', icon: '⬅️' },
  { key: 'update', label: '权重更新', icon: '🔄' }
]

function nodeGradId(layer: number) {
  return layer === 0 ? 'bp-gradBlue' : layer === 1 ? 'bp-gradPurple' : 'bp-gradOrange'
}
</script>

<template>
  <div class="bp-root">
    <!-- Controls -->
    <div class="bp-controls">
      <div class="bp-btn-row">
        <button class="bp-start-btn" :disabled="isPlaying" @click="startAnimation">
          {{ isPlaying ? '训练中...' : '开始训练' }}
        </button>
        <button class="bp-reset-btn" @click="resetNetwork">重置</button>
        <div class="bp-step-display">迭代次数: <strong>{{ step }}</strong></div>
      </div>
      <div class="bp-lr-row">
        <div class="bp-lr-header">
          <label>学习率 (Learning Rate)</label>
          <span class="bp-lr-val">{{ learningRate.toFixed(2) }}</span>
        </div>
        <input type="range" min="0.01" max="0.5" step="0.01" v-model.number="learningRate" class="bp-slider" :disabled="isPlaying" />
      </div>
    </div>

    <!-- Phase indicator -->
    <div class="bp-phases">
      <div
        v-for="p in phases" :key="p.key"
        class="bp-phase-card"
        :class="{ 'bp-phase-active': phase === p.key }"
      >
        <div class="bp-phase-icon">{{ p.icon }}</div>
        <div class="bp-phase-label">{{ p.label }}</div>
      </div>
    </div>

    <!-- Network SVG -->
    <div class="bp-svg-wrap">
      <svg viewBox="0 0 800 450" class="bp-svg">
        <defs>
          <linearGradient id="bp-gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" /><stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
          <linearGradient id="bp-gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a855f7" /><stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
          <linearGradient id="bp-gradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb923c" /><stop offset="100%" stop-color="#f97316" />
          </linearGradient>
        </defs>

        <!-- Connections -->
        <g v-for="conn in connections" :key="`${conn.from}-${conn.to}`">
          <line
            :x1="getPos(nodes.find(n => n.id === conn.from)!).x"
            :y1="getPos(nodes.find(n => n.id === conn.from)!).y"
            :x2="getPos(nodes.find(n => n.id === conn.to)!).x"
            :y2="getPos(nodes.find(n => n.id === conn.to)!).y"
            :stroke="phase === 'backward' && conn.active ? '#fb923c' : phase === 'forward' && conn.active ? '#6366f1' : 'rgba(100,100,100,0.3)'"
            :stroke-width="conn.active ? 3 : 2"
            :class="{ 'bp-pulse': conn.active }"
          />
          <text
            :x="(getPos(nodes.find(n => n.id === conn.from)!).x + getPos(nodes.find(n => n.id === conn.to)!).x) / 2"
            :y="(getPos(nodes.find(n => n.id === conn.from)!).y + getPos(nodes.find(n => n.id === conn.to)!).y) / 2 - 10"
            class="bp-weight-label"
          >w={{ conn.weight.toFixed(2) }}</text>
          <text
            v-if="phase === 'backward' && conn.gradient !== 0"
            :x="(getPos(nodes.find(n => n.id === conn.from)!).x + getPos(nodes.find(n => n.id === conn.to)!).x) / 2"
            :y="(getPos(nodes.find(n => n.id === conn.from)!).y + getPos(nodes.find(n => n.id === conn.to)!).y) / 2 + 15"
            class="bp-grad-label"
          >&nabla;={{ conn.gradient.toFixed(3) }}</text>
        </g>

        <!-- Nodes -->
        <g v-for="node in nodes" :key="node.id">
          <circle
            v-if="node.activated"
            :cx="getPos(node).x" :cy="getPos(node).y" r="25"
            :fill="`url(#${nodeGradId(node.layer)})`"
            opacity="0.3" class="bp-ping"
          />
          <circle
            :cx="getPos(node).x" :cy="getPos(node).y" r="18"
            :fill="`url(#${nodeGradId(node.layer)})`"
            stroke="white" stroke-width="2.5"
          />
          <text :x="getPos(node).x" :y="getPos(node).y + 5" class="bp-node-val">{{ node.value.toFixed(2) }}</text>
          <text
            v-if="phase === 'backward' && node.gradient !== 0"
            :x="getPos(node).x" :y="getPos(node).y + 35"
            class="bp-grad-label"
          >&nabla;={{ node.gradient.toFixed(3) }}</text>
        </g>

        <!-- Layer labels -->
        <text x="150" y="30" text-anchor="middle" class="bp-layer-label">输入层</text>
        <text x="400" y="30" text-anchor="middle" class="bp-layer-label">隐藏层</text>
        <text x="650" y="30" text-anchor="middle" class="bp-layer-label">输出层</text>
      </svg>
    </div>

    <!-- Loss display -->
    <div class="bp-loss-grid">
      <div class="bp-loss-card bp-loss-blue">
        <div class="bp-loss-label">目标值</div>
        <div class="bp-loss-val">{{ targetValue.toFixed(2) }}</div>
      </div>
      <div class="bp-loss-card bp-loss-orange">
        <div class="bp-loss-label">预测值</div>
        <div class="bp-loss-val">{{ outputValue.toFixed(2) }}</div>
      </div>
      <div class="bp-loss-card bp-loss-red">
        <div class="bp-loss-label">损失 (MSE)</div>
        <div class="bp-loss-val">{{ lossValue.toFixed(4) }}</div>
      </div>
    </div>

    <!-- Algorithm steps -->
    <div class="bp-algo-card">
      <h4>📚 反向传播算法步骤</h4>
      <div class="bp-algo-steps">
        <div class="bp-algo-step" :class="{ 'bp-algo-active-fw': phase === 'forward' }">
          <h5>1. 前向传播 (Forward Pass)</h5>
          <p>从输入层开始，逐层计算每个神经元的输出值，直到得到最终的预测结果。</p>
          <code>z = &Sigma;(w&#x1D62;x&#x1D62;) + b, a = &sigma;(z)</code>
        </div>
        <div class="bp-algo-step" :class="{ 'bp-algo-active-bw': phase === 'backward' }">
          <h5>2. 计算损失 &amp; 反向传播 (Backward Pass)</h5>
          <p>计算输出误差，然后利用链式法则反向计算每层的梯度。</p>
          <code>&delta;&#x2097; = (&part;L/&part;a&#x2097;) &middot; &sigma;'(z&#x2097;)</code>
        </div>
        <div class="bp-algo-step" :class="{ 'bp-algo-active-up': phase === 'update' }">
          <h5>3. 权重更新 (Weight Update)</h5>
          <p>使用梯度下降法更新所有权重和偏置。</p>
          <code>w &larr; w - &eta; &middot; (&part;L/&part;w)</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bp-root {
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
.bp-controls {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bp-btn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bp-start-btn {
  padding: 10px 24px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.bp-start-btn:disabled { background: var(--vp-c-text-3); cursor: not-allowed; }
.bp-reset-btn {
  padding: 10px 24px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.bp-step-display {
  margin-left: auto;
  background: var(--vp-c-bg-soft);
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 14px;
  color: var(--vp-c-text-1);
}
.bp-step-display strong { font-size: 24px; color: #06b6d4; }
.bp-lr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.bp-lr-header label { font-size: 13px; font-weight: 600; color: var(--vp-c-text-1); }
.bp-lr-val { font-size: 18px; font-weight: 700; color: var(--vp-c-text-1); background: rgba(139,92,246,0.15); padding: 2px 10px; border-radius: 6px; }
.bp-slider { width: 100%; accent-color: var(--vp-c-brand-1); }

/* Phases */
.bp-phases { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 480px) { .bp-phases { grid-template-columns: repeat(2, 1fr); } }
.bp-phase-card {
  padding: 14px;
  border-radius: 10px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  text-align: center;
  transition: all 0.3s;
}
.bp-phase-active {
  border-color: var(--vp-c-brand-1);
  background: rgba(99, 102, 241, 0.1);
  transform: scale(1.04);
}
.bp-phase-icon { font-size: 28px; margin-bottom: 6px; }
.bp-phase-label { font-weight: 700; font-size: 13px; color: var(--vp-c-text-1); }

/* SVG */
.bp-svg-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  overflow-x: auto;
}
.bp-svg { width: 100%; height: auto; }
.bp-layer-label { fill: var(--vp-c-text-1); font-size: 14px; font-weight: 700; }
.bp-weight-label { fill: var(--vp-c-text-1); font-size: 11px; font-weight: 700; font-family: monospace; text-anchor: middle; }
.bp-grad-label { fill: #fb923c; font-size: 10px; font-weight: 700; font-family: monospace; text-anchor: middle; }
.bp-node-val { fill: #ffffff; font-size: 12px; font-weight: 700; font-family: monospace; text-anchor: middle; }

.bp-pulse { animation: bp-pulse-anim 1s infinite; }
@keyframes bp-pulse-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.bp-ping { animation: bp-ping-anim 1s infinite; }
@keyframes bp-ping-anim { 0% { r: 18; opacity: 0.3; } 100% { r: 30; opacity: 0; } }

/* Loss */
.bp-loss-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 480px) { .bp-loss-grid { grid-template-columns: 1fr; } }
.bp-loss-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}
.bp-loss-label { font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 6px; }
.bp-loss-val { font-size: 32px; font-weight: 700; }
.bp-loss-blue .bp-loss-val { color: #3b82f6; }
.bp-loss-orange .bp-loss-val { color: #f97316; }
.bp-loss-red .bp-loss-val { color: #ef4444; }

/* Algorithm steps */
.bp-algo-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 20px;
}
.bp-algo-card h4 { font-size: 16px; font-weight: 700; color: var(--vp-c-text-1); margin: 0 0 16px 0; }
.bp-algo-steps { display: flex; flex-direction: column; gap: 10px; }
.bp-algo-step {
  padding: 14px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  transition: all 0.3s;
}
.bp-algo-active-fw { background: rgba(59, 130, 246, 0.12); border: 2px solid #3b82f6; }
.bp-algo-active-bw { background: rgba(249, 115, 22, 0.12); border: 2px solid #f97316; }
.bp-algo-active-up { background: rgba(34, 197, 94, 0.12); border: 2px solid #22c55e; }
.bp-algo-step h5 { font-size: 14px; font-weight: 700; margin: 0 0 6px 0; }
.bp-algo-active-fw h5 { color: #3b82f6; }
.bp-algo-active-bw h5 { color: #f97316; }
.bp-algo-active-up h5 { color: #22c55e; }
.bp-algo-step:not([class*="active"]) h5 { color: var(--vp-c-text-1); }
.bp-algo-step p { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 4px 0; }
.bp-algo-step code { font-size: 12px; color: var(--vp-c-text-2); font-family: monospace; }
</style>
