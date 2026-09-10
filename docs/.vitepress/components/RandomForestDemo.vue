<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface DataPoint {
  x: number
  y: number
  label: 0 | 1
}

interface Tree {
  id: number
  prediction: 0 | 1
  confidence: number
  usedFeatures: boolean[]
}

const numTrees = ref(5)
const data = ref<DataPoint[]>([])
const trees = ref<Tree[]>([])
const testPoint = ref({ x: 0.5, y: 0.5 })
const finalPrediction = ref<{ class: 0 | 1; votes: number[] } | null>(null)
const hoveredTree = ref<number | null>(null)

function initializeData() {
  const points: DataPoint[] = []
  for (let i = 0; i < 30; i++) {
    points.push({ x: Math.random() * 0.4 + 0.1, y: Math.random() * 0.4 + 0.1, label: 0 })
  }
  for (let i = 0; i < 30; i++) {
    points.push({ x: Math.random() * 0.4 + 0.5, y: Math.random() * 0.4 + 0.5, label: 1 })
  }
  for (let i = 0; i < 10; i++) {
    points.push({ x: Math.random(), y: Math.random(), label: Math.random() > 0.5 ? 1 : 0 })
  }
  data.value = points
  trees.value = []
  finalPrediction.value = null
}

function trainForest() {
  const newTrees: Tree[] = []
  for (let i = 0; i < numTrees.value; i++) {
    const useX = Math.random() > 0.3
    const useY = Math.random() > 0.3
    const threshold = 0.5 + (Math.random() - 0.5) * 0.2
    const pt = testPoint.value
    let pred: 0 | 1
    if (useX && useY) { pred = (pt.x + pt.y) / 2 > threshold ? 1 : 0 }
    else if (useX) { pred = pt.x > threshold ? 1 : 0 }
    else if (useY) { pred = pt.y > threshold ? 1 : 0 }
    else { pred = Math.random() > 0.5 ? 1 : 0 }
    const distance = Math.abs((pt.x + pt.y) / 2 - threshold)
    const confidence = Math.min(0.5 + distance * 2, 0.95)
    newTrees.push({ id: i, prediction: pred, confidence, usedFeatures: [useX, useY] })
  }
  trees.value = newTrees
  const votes = [0, 0]
  newTrees.forEach(t => { votes[t.prediction]++ })
  finalPrediction.value = { class: votes[1] > votes[0] ? 1 : 0, votes }
}

function resetTrees() {
  trees.value = []
  finalPrediction.value = null
}

onMounted(() => { initializeData() })
</script>

<template>
  <div class="rf-demo">
    <!-- Main visualization -->
    <div class="rf-main-grid">
      <!-- Feature space -->
      <div class="rf-panel rf-panel-cyan">
        <h3 class="rf-panel-title rf-cyan">特征空间</h3>
        <div class="rf-canvas">
          <svg class="rf-svg" viewBox="0 0 300 300">
            <defs>
              <pattern id="rf-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--vp-c-divider)" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="300" height="300" fill="url(#rf-grid)" />
            <circle
              v-for="(pt, i) in data" :key="'d' + i"
              :cx="pt.x * 300" :cy="(1 - pt.y) * 300" r="4"
              :fill="pt.label === 0 ? '#ef4444' : '#3b82f6'"
              stroke="var(--vp-c-text-1)" stroke-width="0.5" opacity="0.8"
            />
            <line :x1="testPoint.x * 300" y1="0" :x2="testPoint.x * 300" y2="300"
              stroke="#eab308" stroke-width="1" stroke-dasharray="4,4" opacity="0.3" />
            <line x1="0" :y1="(1 - testPoint.y) * 300" x2="300" :y2="(1 - testPoint.y) * 300"
              stroke="#eab308" stroke-width="1" stroke-dasharray="4,4" opacity="0.3" />
            <circle
              :cx="testPoint.x * 300" :cy="(1 - testPoint.y) * 300" r="8"
              :fill="finalPrediction ? (finalPrediction.class === 0 ? '#ef4444' : '#3b82f6') : '#eab308'"
              stroke="var(--vp-c-text-1)" stroke-width="2"
            />
          </svg>
        </div>
        <div class="rf-legend">
          <div class="rf-legend-item"><span class="rf-dot rf-dot-red"></span> 类别 0</div>
          <div class="rf-legend-item"><span class="rf-dot rf-dot-blue"></span> 类别 1</div>
          <div class="rf-legend-item"><span class="rf-dot rf-dot-yellow"></span> 测试点</div>
        </div>
      </div>

      <!-- Ensemble prediction -->
      <div class="rf-panel rf-panel-purple">
        <h3 class="rf-panel-title rf-purple">集成预测</h3>
        <div v-if="trees.length === 0" class="rf-empty">
          <div class="rf-empty-icon">🌲</div>
          <p>点击"训练森林"开始预测</p>
        </div>
        <div v-else>
          <div class="rf-tree-grid">
            <div
              v-for="tree in trees" :key="tree.id"
              :class="['rf-tree-card', hoveredTree === tree.id ? 'rf-tree-hover' : '']"
              @mouseenter="hoveredTree = tree.id"
              @mouseleave="hoveredTree = null"
            >
              <div class="rf-tree-icon">🌲</div>
              <div class="rf-tree-label">树 {{ tree.id + 1 }}</div>
              <div :class="['rf-tree-pred', tree.prediction === 0 ? 'rf-red' : 'rf-blue']">
                类 {{ tree.prediction }}
              </div>
              <div class="rf-tree-conf">{{ (tree.confidence * 100).toFixed(0) }}%</div>
              <div class="rf-feature-dots">
                <span v-if="tree.usedFeatures[0]" class="rf-fdot rf-fdot-green" title="使用特征 X"></span>
                <span v-if="tree.usedFeatures[1]" class="rf-fdot rf-fdot-blue" title="使用特征 Y"></span>
              </div>
            </div>
          </div>

          <!-- Voting result -->
          <div v-if="finalPrediction" class="rf-vote-card">
            <h4 class="rf-vote-title">投票结果</h4>
            <div class="rf-vote-bar-group">
              <div class="rf-vote-header"><span>类别 0</span><strong class="rf-red">{{ finalPrediction.votes[0] }} 票</strong></div>
              <div class="rf-vote-track"><div class="rf-vote-fill rf-vote-red" :style="{ width: (finalPrediction.votes[0] / numTrees * 100) + '%' }"></div></div>
            </div>
            <div class="rf-vote-bar-group">
              <div class="rf-vote-header"><span>类别 1</span><strong class="rf-blue">{{ finalPrediction.votes[1] }} 票</strong></div>
              <div class="rf-vote-track"><div class="rf-vote-fill rf-vote-blue" :style="{ width: (finalPrediction.votes[1] / numTrees * 100) + '%' }"></div></div>
            </div>
            <div class="rf-final">
              <div class="rf-final-label">最终预测</div>
              <div :class="['rf-final-class', finalPrediction.class === 0 ? 'rf-red' : 'rf-blue']">类别 {{ finalPrediction.class }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="rf-controls-grid">
      <div class="rf-ctrl-card">
        <label class="rf-ctrl-label">树的数量: {{ numTrees }}</label>
        <input type="range" min="3" max="10" :value="numTrees"
          @input="numTrees = Number(($event.target as HTMLInputElement).value); resetTrees()"
          class="rf-slider" style="accent-color:#8b5cf6;" />
        <div class="rf-ctrl-ticks"><span>3</span><span>10</span></div>
      </div>
      <div class="rf-ctrl-card">
        <label class="rf-ctrl-label">测试点 X: {{ testPoint.x.toFixed(2) }}</label>
        <input type="range" min="0" max="1" step="0.01" :value="testPoint.x"
          @input="testPoint.x = Number(($event.target as HTMLInputElement).value); resetTrees()"
          class="rf-slider" style="accent-color:#22c55e;" />
        <div class="rf-ctrl-ticks"><span>0</span><span>1</span></div>
      </div>
      <div class="rf-ctrl-card">
        <label class="rf-ctrl-label">测试点 Y: {{ testPoint.y.toFixed(2) }}</label>
        <input type="range" min="0" max="1" step="0.01" :value="testPoint.y"
          @input="testPoint.y = Number(($event.target as HTMLInputElement).value); resetTrees()"
          class="rf-slider" style="accent-color:#3b82f6;" />
        <div class="rf-ctrl-ticks"><span>0</span><span>1</span></div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="rf-actions">
      <button class="rf-btn rf-btn-outline" @click="initializeData">🔄 重置数据</button>
      <button class="rf-btn rf-btn-primary" @click="trainForest">🌲 训练森林</button>
    </div>

    <!-- Hovered tree feature info -->
    <div v-if="hoveredTree !== null && trees[hoveredTree]" class="rf-feature-info">
      <h4 class="rf-feature-info-title">树 {{ hoveredTree + 1 }} 的特征使用</h4>
      <div class="rf-feature-info-row">
        <span class="rf-fdot rf-fdot-green"></span>
        {{ trees[hoveredTree].usedFeatures[0] ? '✓ 使用特征 X' : '✗ 未使用 X' }}
      </div>
      <div class="rf-feature-info-row">
        <span class="rf-fdot rf-fdot-blue"></span>
        {{ trees[hoveredTree].usedFeatures[1] ? '✓ 使用特征 Y' : '✗ 未使用 Y' }}
      </div>
    </div>

    <!-- Algorithm explanation -->
    <div class="rf-explain">
      <h3 class="rf-explain-title">💡 随机森林原理</h3>
      <div class="rf-explain-grid">
        <div class="rf-explain-box">
          <h4 class="rf-cyan">样本随机（Bagging）</h4>
          <p>每棵树使用<strong>自助采样</strong>（Bootstrap）从训练集中有放回地抽取样本，约63.2%的样本会被选中</p>
        </div>
        <div class="rf-explain-box">
          <h4 class="rf-purple">特征随机</h4>
          <p>每次分裂时，从所有特征中<strong>随机选择k个特征</strong>，通常k = log₂d，增强树的多样性</p>
        </div>
      </div>
      <div class="rf-explain-highlight">
        <h4 class="rf-green">投票机制</h4>
        <p><strong>分类任务</strong>：多数投票（Majority Voting）<br/><strong>回归任务</strong>：平均预测值（Averaging）</p>
      </div>
      <div class="rf-explain-why">
        <h4 class="rf-amber">为什么随机森林有效？</h4>
        <ul>
          <li><strong>降低方差</strong>：多个弱学习器的平均降低了过拟合风险</li>
          <li><strong>增强鲁棒性</strong>：单棵树的错误可被其他树纠正</li>
          <li><strong>特征重要性</strong>：可以评估每个特征的贡献度</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rf-demo {
  border: 1px solid var(--vp-c-divider); border-radius: 12px;
  padding: 24px; background: var(--vp-c-bg-soft); margin: 16px 0;
}
.rf-cyan { color: #06b6d4; }
.rf-blue { color: #3b82f6; }
.rf-purple { color: #8b5cf6; }
.rf-green { color: #16a34a; }
.rf-red { color: #ef4444; }
.rf-amber { color: #d97706; }
:global(.dark) .rf-green { color: #4ade80; }
:global(.dark) .rf-red { color: #f87171; }

/* Main grid */
.rf-main-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }
@media (min-width: 768px) { .rf-main-grid { grid-template-columns: 1fr 1fr; } }

.rf-panel {
  background: var(--vp-c-bg); border-radius: 12px; padding: 20px;
}
.rf-panel-cyan { border: 2px solid rgba(6,182,212,0.3); }
.rf-panel-purple { border: 2px solid rgba(139,92,246,0.3); }
.rf-panel-title { font-size: 16px; font-weight: 700; margin: 0 0 12px 0; }

/* Canvas */
.rf-canvas {
  aspect-ratio: 1; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider);
  border-radius: 8px; overflow: hidden;
}
.rf-svg { width: 100%; height: 100%; display: block; }

/* Legend */
.rf-legend { display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--vp-c-text-2); }
.rf-legend-item { display: flex; align-items: center; gap: 4px; }
.rf-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 1px solid var(--vp-c-text-1); }
.rf-dot-red { background: #ef4444; }
.rf-dot-blue { background: #3b82f6; }
.rf-dot-yellow { background: #eab308; }

/* Empty state */
.rf-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; color: var(--vp-c-text-3); }
.rf-empty-icon { font-size: 40px; margin-bottom: 8px; }

/* Tree grid */
.rf-tree-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }
@media (max-width: 640px) { .rf-tree-grid { grid-template-columns: repeat(3, 1fr); } }
.rf-tree-card {
  position: relative; padding: 10px 6px; border-radius: 8px; text-align: center;
  border: 2px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  cursor: pointer; transition: all 0.2s;
}
.rf-tree-hover { border-color: #eab308; background: rgba(234,179,8,0.08); transform: scale(1.05); }
.rf-tree-icon { font-size: 20px; }
.rf-tree-label { font-size: 10px; color: var(--vp-c-text-3); margin: 2px 0; }
.rf-tree-pred { font-size: 12px; font-weight: 700; }
.rf-tree-conf { font-size: 10px; color: var(--vp-c-text-3); }
.rf-feature-dots { position: absolute; top: 2px; right: 4px; display: flex; gap: 2px; }
.rf-fdot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.rf-fdot-green { background: #22c55e; }
.rf-fdot-blue { background: #3b82f6; }

/* Voting card */
.rf-vote-card {
  background: var(--vp-c-bg-soft); border: 1px solid rgba(6,182,212,0.3);
  border-radius: 8px; padding: 12px;
}
.rf-vote-title { font-size: 13px; font-weight: 700; color: #06b6d4; margin: 0 0 10px 0; }
.rf-vote-bar-group { margin-bottom: 10px; }
.rf-vote-header { display: flex; justify-content: space-between; font-size: 12px; color: var(--vp-c-text-1); margin-bottom: 4px; }
.rf-vote-track { height: 20px; background: var(--vp-c-bg); border-radius: 6px; overflow: hidden; }
.rf-vote-fill { height: 100%; transition: width 0.4s; border-radius: 6px; }
.rf-vote-red { background: #ef4444; }
.rf-vote-blue { background: #3b82f6; }
.rf-final { border-top: 1px solid var(--vp-c-divider); margin-top: 10px; padding-top: 10px; text-align: center; }
.rf-final-label { font-size: 12px; color: var(--vp-c-text-2); }
.rf-final-class { font-size: 24px; font-weight: 700; }

/* Controls */
.rf-controls-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
@media (max-width: 640px) { .rf-controls-grid { grid-template-columns: 1fr; } }
.rf-ctrl-card {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 10px; padding: 12px;
}
.rf-ctrl-label { display: block; font-size: 13px; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 8px; }
.rf-slider { width: 100%; }
.rf-ctrl-ticks { display: flex; justify-content: space-between; font-size: 11px; color: var(--vp-c-text-3); margin-top: 2px; }

/* Actions */
.rf-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.rf-btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.rf-btn-outline {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); color: var(--vp-c-text-1);
}
.rf-btn-outline:hover { border-color: var(--vp-c-brand-1); }
.rf-btn-primary {
  background: #8b5cf6; border: none; color: #fff; font-weight: 700;
}
.rf-btn-primary:hover { background: #7c3aed; }

/* Feature info */
.rf-feature-info {
  background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3);
  border-radius: 10px; padding: 12px; margin-bottom: 16px;
}
.rf-feature-info-title { font-size: 13px; font-weight: 700; color: #d97706; margin: 0 0 6px 0; }
.rf-feature-info-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }

/* Explanation */
.rf-explain {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 12px; padding: 20px;
}
.rf-explain-title { font-size: 16px; font-weight: 700; color: var(--vp-c-text-1); margin: 0 0 16px 0; }
.rf-explain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
@media (max-width: 640px) { .rf-explain-grid { grid-template-columns: 1fr; } }
.rf-explain-box {
  background: var(--vp-c-bg-soft); border-radius: 8px; padding: 12px; font-size: 13px; color: var(--vp-c-text-2);
}
.rf-explain-box h4 { font-size: 14px; font-weight: 700; margin: 0 0 6px 0; }
.rf-explain-box p { margin: 0; }
.rf-explain-box strong { color: var(--vp-c-text-1); }
.rf-explain-highlight {
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3);
  border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; color: var(--vp-c-text-2);
}
.rf-explain-highlight h4 { font-size: 14px; font-weight: 700; margin: 0 0 6px 0; }
.rf-explain-highlight p { margin: 0; }
.rf-explain-highlight strong { color: var(--vp-c-text-1); }
.rf-explain-why {
  background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3);
  border-radius: 8px; padding: 12px; font-size: 13px; color: var(--vp-c-text-2);
}
.rf-explain-why h4 { font-size: 14px; font-weight: 700; margin: 0 0 6px 0; }
.rf-explain-why ul { margin: 0; padding-left: 18px; }
.rf-explain-why li { margin-bottom: 4px; }
.rf-explain-why strong { color: var(--vp-c-text-1); }
</style>
