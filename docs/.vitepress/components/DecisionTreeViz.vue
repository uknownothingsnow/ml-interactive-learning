<script setup lang="ts">
import { ref, computed } from 'vue'

interface DataPoint {
  x: number
  y: number
  label: 0 | 1
}

interface TreeNode {
  id: number
  feature: 'x' | 'y' | null
  threshold: number | null
  label: 0 | 1 | null
  samples: DataPoint[]
  entropy: number
  left?: TreeNode
  right?: TreeNode
  depth: number
}

type SplitCriterion = 'entropy' | 'gini' | 'gain_ratio'

const dataset: DataPoint[] = [
  { x: 2, y: 3, label: 0 }, { x: 3, y: 2, label: 0 },
  { x: 2, y: 2, label: 0 }, { x: 3, y: 3, label: 0 },
  { x: 1, y: 2, label: 0 }, { x: 2, y: 1, label: 0 },
  { x: 1, y: 3, label: 0 }, { x: 3, y: 1, label: 0 },
  { x: 7, y: 7, label: 1 }, { x: 8, y: 8, label: 1 },
  { x: 7, y: 8, label: 1 }, { x: 8, y: 7, label: 1 },
  { x: 6, y: 7, label: 1 }, { x: 7, y: 6, label: 1 },
  { x: 9, y: 8, label: 1 }, { x: 8, y: 9, label: 1 },
]

const criterion = ref<SplitCriterion>('entropy')
const maxDepth = ref(2)
const selectedNode = ref<TreeNode | null>(null)

function calcEntropy(samples: DataPoint[]): number {
  if (samples.length === 0) return 0
  const p1 = samples.filter(s => s.label === 1).length / samples.length
  const p0 = 1 - p1
  if (p1 === 0 || p0 === 0) return 0
  return -p1 * Math.log2(p1) - p0 * Math.log2(p0)
}

function calcGini(samples: DataPoint[]): number {
  if (samples.length === 0) return 0
  const p1 = samples.filter(s => s.label === 1).length / samples.length
  return 1 - (p1 * p1 + (1 - p1) * (1 - p1))
}

function calcGain(samples: DataPoint[], left: DataPoint[], right: DataPoint[]): number {
  return calcEntropy(samples)
    - (left.length / samples.length) * calcEntropy(left)
    - (right.length / samples.length) * calcEntropy(right)
}

function calcIV(samples: DataPoint[], left: DataPoint[], right: DataPoint[]): number {
  if (samples.length === 0) return 1
  const lr = left.length / samples.length
  const rr = right.length / samples.length
  let iv = 0
  if (lr > 0) iv -= lr * Math.log2(lr)
  if (rr > 0) iv -= rr * Math.log2(rr)
  return iv === 0 ? 1 : iv
}

function findBestSplit(samples: DataPoint[], depth: number) {
  if (samples.length === 0 || depth >= maxDepth.value) return null
  const labels = samples.map(s => s.label)
  if (labels.every(l => l === labels[0])) return null

  let bestFeature: 'x' | 'y' | null = null
  let bestThreshold: number | null = null
  let bestScore = -Infinity

  for (const feature of ['x', 'y'] as const) {
    const values = [...new Set(samples.map(s => s[feature]))].sort((a, b) => a - b)
    for (let i = 0; i < values.length - 1; i++) {
      const thresh = (values[i] + values[i + 1]) / 2
      const left = samples.filter(s => s[feature] <= thresh)
      const right = samples.filter(s => s[feature] > thresh)
      if (left.length === 0 || right.length === 0) continue

      let score: number
      if (criterion.value === 'entropy') {
        score = calcGain(samples, left, right)
      } else if (criterion.value === 'gini') {
        score = calcGini(samples)
          - (left.length / samples.length) * calcGini(left)
          - (right.length / samples.length) * calcGini(right)
      } else {
        score = calcGain(samples, left, right) / calcIV(samples, left, right)
      }

      if (score > bestScore) {
        bestScore = score
        bestFeature = feature
        bestThreshold = thresh
      }
    }
  }

  return bestFeature && bestThreshold !== null
    ? { feature: bestFeature, threshold: bestThreshold }
    : null
}

function buildTree(samples: DataPoint[], depth: number, id: number): TreeNode {
  const ent = calcEntropy(samples)
  const majorityLabel: 0 | 1 = samples.filter(s => s.label === 1).length >= samples.length / 2 ? 1 : 0
  const split = findBestSplit(samples, depth)

  if (!split) {
    return { id, feature: null, threshold: null, label: majorityLabel, samples, entropy: ent, depth }
  }

  const left = samples.filter(s => s[split.feature] <= split.threshold)
  const right = samples.filter(s => s[split.feature] > split.threshold)

  return {
    id, feature: split.feature, threshold: split.threshold, label: null,
    samples, entropy: ent, depth,
    left: buildTree(left, depth + 1, id * 2),
    right: buildTree(right, depth + 1, id * 2 + 1)
  }
}

const tree = computed(() => buildTree(dataset, 0, 1))

function getDecisionBoundaries(node: TreeNode): { feature: 'x' | 'y'; threshold: number }[] {
  const boundaries: { feature: 'x' | 'y'; threshold: number }[] = []
  const traverse = (n: TreeNode) => {
    if (n.feature && n.threshold !== null) boundaries.push({ feature: n.feature, threshold: n.threshold })
    if (n.left) traverse(n.left)
    if (n.right) traverse(n.right)
  }
  traverse(node)
  return boundaries
}

const boundaries = computed(() => getDecisionBoundaries(tree.value))

// Flatten tree nodes for SVG rendering
interface FlatNode {
  node: TreeNode
  x: number
  y: number
  parentX?: number
  parentY?: number
}

function flattenTree(node: TreeNode, x: number, y: number, width: number, parentX?: number, parentY?: number): FlatNode[] {
  const result: FlatNode[] = [{ node, x, y, parentX, parentY }]
  if (node.left) result.push(...flattenTree(node.left, x - width / 2, y + 80, width / 2, x, y))
  if (node.right) result.push(...flattenTree(node.right, x + width / 2, y + 80, width / 2, x, y))
  return result
}

const flatNodes = computed(() => flattenTree(tree.value, 175, 40, 140))

const criterionName = computed(() => {
  switch (criterion.value) {
    case 'entropy': return '信息增益 (Information Gain)'
    case 'gini': return '基尼指数 (Gini Index)'
    case 'gain_ratio': return '信息增益率 (Gain Ratio)'
  }
})

function nodeColor(node: TreeNode): string {
  if (!node.left && !node.right) return node.label === 1 ? '#ef4444' : '#3b82f6'
  return '#8b5cf6'
}
</script>

<template>
  <div class="dt-root">
    <!-- Controls -->
    <div class="dt-controls">
      <div class="dt-control-card">
        <label class="dt-label">划分标准</label>
        <select v-model="criterion" class="dt-select">
          <option value="entropy">信息增益 (ID3)</option>
          <option value="gain_ratio">信息增益率 (C4.5)</option>
          <option value="gini">基尼指数 (CART)</option>
        </select>
        <div class="dt-sublabel">当前使用: {{ criterionName }}</div>
      </div>
      <div class="dt-control-card">
        <label class="dt-label">最大深度: {{ maxDepth }}</label>
        <input type="range" min="1" max="4" v-model.number="maxDepth" class="dt-slider" />
        <div class="dt-tick-labels"><span>1</span><span>2</span><span>3</span><span>4</span></div>
      </div>
    </div>

    <!-- Main visualization -->
    <div class="dt-viz-grid">
      <!-- Feature space -->
      <div class="dt-viz-card">
        <h4 class="dt-viz-title">特征空间与决策边界</h4>
        <svg width="100%" height="350" viewBox="0 0 350 350" class="dt-feature-svg">
          <line x1="30" y1="320" x2="320" y2="320" stroke="var(--vp-c-text-3)" stroke-width="2" />
          <line x1="30" y1="30" x2="30" y2="320" stroke="var(--vp-c-text-3)" stroke-width="2" />
          <text x="175" y="345" text-anchor="middle" class="dt-axis-label">特征 X</text>
          <text x="15" y="175" text-anchor="middle" class="dt-axis-label" transform="rotate(-90 15 175)">特征 Y</text>

          <!-- Decision boundaries -->
          <template v-for="(b, idx) in boundaries" :key="'b-' + idx">
            <line
              v-if="b.feature === 'x'"
              :x1="b.threshold * 29 + 30" y1="30"
              :x2="b.threshold * 29 + 30" y2="320"
              stroke="#fbbf24" stroke-width="2" stroke-dasharray="5,5" opacity="0.7"
            />
            <line
              v-else
              x1="30" :y1="320 - (b.threshold * 29 - 30)"
              x2="320" :y2="320 - (b.threshold * 29 - 30)"
              stroke="#fbbf24" stroke-width="2" stroke-dasharray="5,5" opacity="0.7"
            />
          </template>

          <!-- Data points -->
          <circle
            v-for="(pt, idx) in dataset" :key="'pt-' + idx"
            :cx="pt.x * 29 + 30" :cy="320 - (pt.y * 29 - 30)" r="6"
            :fill="pt.label === 1 ? '#ef4444' : '#3b82f6'"
            stroke="white" stroke-width="2"
          />

          <!-- Legend -->
          <g transform="translate(240, 50)">
            <circle cx="0" cy="0" r="6" fill="#3b82f6" stroke="white" stroke-width="2" />
            <text x="12" y="4" class="dt-legend-text">类别 0</text>
            <circle cx="0" cy="20" r="6" fill="#ef4444" stroke="white" stroke-width="2" />
            <text x="12" y="24" class="dt-legend-text">类别 1</text>
          </g>
        </svg>
      </div>

      <!-- Decision tree -->
      <div class="dt-viz-card">
        <h4 class="dt-viz-title">决策树结构</h4>
        <svg width="100%" height="350" viewBox="0 0 350 350">
          <!-- Edges -->
          <template v-for="fn in flatNodes" :key="'edge-' + fn.node.id">
            <line
              v-if="fn.parentX !== undefined"
              :x1="fn.parentX" :y1="fn.parentY"
              :x2="fn.x" :y2="fn.y"
              stroke="var(--vp-c-text-3)" stroke-width="2"
            />
          </template>
          <!-- Nodes -->
          <g
            v-for="fn in flatNodes" :key="'node-' + fn.node.id"
            style="cursor: pointer;"
            @click="selectedNode = fn.node"
          >
            <circle
              :cx="fn.x" :cy="fn.y" r="30"
              :fill="nodeColor(fn.node)"
              :opacity="selectedNode?.id === fn.node.id ? 1 : 0.8"
              :stroke="selectedNode?.id === fn.node.id ? '#fbbf24' : 'none'"
              :stroke-width="selectedNode?.id === fn.node.id ? 3 : 0"
            />
            <text :x="fn.x" :y="fn.y" text-anchor="middle" dominant-baseline="middle" class="dt-node-text">
              {{ (!fn.node.left && !fn.node.right) ? `C${fn.node.label}` : fn.node.feature?.toUpperCase() }}
            </text>
            <text
              v-if="fn.node.left || fn.node.right"
              :x="fn.x" :y="fn.y + 12"
              text-anchor="middle" class="dt-node-sub"
            >&le;{{ fn.node.threshold?.toFixed(1) }}</text>
          </g>

          <!-- Legend -->
          <g transform="translate(20, 300)">
            <circle cx="8" cy="8" r="8" fill="#8b5cf6" opacity="0.8" />
            <text x="20" y="12" class="dt-legend-text">内部节点</text>
            <circle cx="90" cy="8" r="8" fill="#3b82f6" opacity="0.8" />
            <text x="102" y="12" class="dt-legend-text">叶节点(0)</text>
            <circle cx="180" cy="8" r="8" fill="#ef4444" opacity="0.8" />
            <text x="192" y="12" class="dt-legend-text">叶节点(1)</text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Node details -->
    <div v-if="selectedNode" class="dt-detail-card">
      <div class="dt-detail-header">
        <h4>
          节点详情
          {{ selectedNode.feature ? `(${selectedNode.feature.toUpperCase()} ≤ ${selectedNode.threshold?.toFixed(2)})` : '(叶节点)' }}
        </h4>
        <button class="dt-close-btn" @click="selectedNode = null">&times;</button>
      </div>
      <div class="dt-detail-stats">
        <div class="dt-stat"><div class="dt-stat-label">样本数量</div><div class="dt-stat-value">{{ selectedNode.samples.length }}</div></div>
        <div class="dt-stat"><div class="dt-stat-label">信息熵</div><div class="dt-stat-value dt-cyan">{{ selectedNode.entropy.toFixed(3) }}</div></div>
        <div class="dt-stat"><div class="dt-stat-label">深度</div><div class="dt-stat-value dt-purple">{{ selectedNode.depth }}</div></div>
      </div>
      <div class="dt-detail-dist">
        <div class="dt-stat-label">类别分布</div>
        <div class="dt-dist-row">
          <span class="dt-dist-item"><span class="dt-dist-dot" style="background:#3b82f6"></span>类别 0: {{ selectedNode.samples.filter(s => s.label === 0).length }}</span>
          <span class="dt-dist-item"><span class="dt-dist-dot" style="background:#ef4444"></span>类别 1: {{ selectedNode.samples.filter(s => s.label === 1).length }}</span>
        </div>
      </div>
      <div v-if="!selectedNode.feature && selectedNode.label !== null" class="dt-predict-box">
        <strong>预测类别:</strong> {{ selectedNode.label }}
      </div>
    </div>

    <!-- Hint -->
    <div class="dt-hint">
      <span class="dt-hint-icon">💡</span>
      <div>
        <p class="dt-hint-title">使用说明：</p>
        <ul>
          <li>左图显示特征空间，黄色虚线是决策边界</li>
          <li>右图显示决策树结构，点击节点查看详细信息</li>
          <li>尝试不同的划分标准和深度，观察树结构的变化</li>
          <li>信息增益率对取值多的属性惩罚更强，可缓解过拟合</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dt-root {
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
.dt-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .dt-controls { grid-template-columns: 1fr; } }
.dt-control-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}
.dt-label { display: block; font-size: 13px; font-weight: 600; color: var(--vp-c-text-1); margin-bottom: 8px; }
.dt-select {
  width: 100%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 8px;
  font-size: 13px;
}
.dt-sublabel { font-size: 11px; color: var(--vp-c-text-3); margin-top: 6px; }
.dt-slider { width: 100%; accent-color: var(--vp-c-brand-1); }
.dt-tick-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--vp-c-text-3); margin-top: 4px; }

/* Viz grid */
.dt-viz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 768px) { .dt-viz-grid { grid-template-columns: 1fr; } }
.dt-viz-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}
.dt-viz-title { font-size: 13px; font-weight: 600; color: var(--vp-c-text-1); margin: 0 0 12px 0; }
.dt-feature-svg { background: var(--vp-c-bg-soft); border-radius: 8px; }
.dt-axis-label { fill: var(--vp-c-text-3); font-size: 12px; }
.dt-legend-text { fill: var(--vp-c-text-1); font-size: 12px; }
.dt-node-text { fill: #ffffff; font-size: 12px; font-weight: 700; pointer-events: none; }
.dt-node-sub { fill: #ffffff; font-size: 10px; pointer-events: none; }

/* Detail card */
.dt-detail-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  padding: 20px;
}
.dt-detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.dt-detail-header h4 { font-size: 16px; font-weight: 600; color: var(--vp-c-text-1); margin: 0; }
.dt-close-btn { background: none; border: none; color: var(--vp-c-text-3); font-size: 20px; cursor: pointer; }
.dt-detail-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dt-stat { background: var(--vp-c-bg-soft); border-radius: 8px; padding: 12px; }
.dt-stat-label { font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.dt-stat-value { font-size: 24px; font-weight: 700; color: var(--vp-c-text-1); }
.dt-stat-value.dt-cyan { color: #06b6d4; }
.dt-stat-value.dt-purple { color: #8b5cf6; }
.dt-detail-dist { margin-top: 12px; background: var(--vp-c-bg-soft); border-radius: 8px; padding: 12px; }
.dt-dist-row { display: flex; gap: 16px; margin-top: 6px; }
.dt-dist-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-1); }
.dt-dist-dot { width: 16px; height: 16px; border-radius: 4px; }
.dt-predict-box {
  margin-top: 12px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
.dt-predict-box strong { color: #10b981; }

/* Hint */
.dt-hint {
  display: flex;
  gap: 12px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  padding: 16px;
}
.dt-hint-icon { font-size: 24px; flex-shrink: 0; }
.dt-hint-title { font-weight: 600; color: var(--vp-c-text-1); margin: 0 0 8px 0; font-size: 14px; }
.dt-hint ul { margin: 0; padding: 0; list-style: none; }
.dt-hint li { font-size: 13px; color: var(--vp-c-text-2); padding: 2px 0; }
.dt-hint li::before { content: '• '; color: var(--vp-c-text-3); }
</style>
