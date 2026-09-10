<script setup lang="ts">
import { ref, onMounted } from 'vue'

const GRID_SIZE = 5
const ACTIONS = ['up', 'down', 'left', 'right'] as const
type Action = typeof ACTIONS[number]

interface Cell {
  reward: number
  isGoal: boolean
  isObstacle: boolean
}

interface QValues {
  up: number
  down: number
  left: number
  right: number
}

const grid = ref<Cell[][]>([])
const qTable = ref<QValues[][]>([])
const agentPos = ref({ x: 0, y: 0 })
const episode = ref(0)
const step = ref(0)
const totalReward = ref(0)
const isTraining = ref(false)
const alpha = ref(0.1)
const gamma = ref(0.9)
const epsilon = ref(0.3)
const path = ref<{ x: number; y: number }[]>([])

function initializeGrid() {
  const newGrid: Cell[][] = []
  const newQTable: QValues[][] = []
  for (let i = 0; i < GRID_SIZE; i++) {
    const row: Cell[] = []
    const qRow: QValues[] = []
    for (let j = 0; j < GRID_SIZE; j++) {
      const isGoal = i === GRID_SIZE - 1 && j === GRID_SIZE - 1
      const isObstacle = (i === 1 && j === 2) || (i === 2 && j === 2) || (i === 3 && j === 1)
      row.push({ reward: isGoal ? 100 : isObstacle ? -10 : -1, isGoal, isObstacle })
      qRow.push({ up: 0, down: 0, left: 0, right: 0 })
    }
    newGrid.push(row)
    newQTable.push(qRow)
  }
  grid.value = newGrid
  qTable.value = newQTable
  agentPos.value = { x: 0, y: 0 }
  episode.value = 0
  step.value = 0
  totalReward.value = 0
  path.value = [{ x: 0, y: 0 }]
}

function getNextPos(pos: { x: number; y: number }, action: Action) {
  let { x, y } = pos
  if (action === 'up') y = Math.max(0, y - 1)
  else if (action === 'down') y = Math.min(GRID_SIZE - 1, y + 1)
  else if (action === 'left') x = Math.max(0, x - 1)
  else if (action === 'right') x = Math.min(GRID_SIZE - 1, x + 1)
  return { x, y }
}
function chooseAction(pos: { x: number; y: number }): Action {
  if (Math.random() < epsilon.value) {
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
  }
  const q = qTable.value[pos.y][pos.x]
  let bestAction: Action = 'up'
  let bestValue = q.up
  if (q.down > bestValue) { bestValue = q.down; bestAction = 'down' }
  if (q.left > bestValue) { bestValue = q.left; bestAction = 'left' }
  if (q.right > bestValue) { bestValue = q.right; bestAction = 'right' }
  return bestAction
}

function getBestAction(y: number, x: number): Action {
  const q = qTable.value[y][x]
  let bestAction: Action = 'up'
  let bestValue = q.up
  if (q.down > bestValue) { bestValue = q.down; bestAction = 'down' }
  if (q.left > bestValue) { bestValue = q.left; bestAction = 'left' }
  if (q.right > bestValue) { bestValue = q.right; bestAction = 'right' }
  return bestAction
}

function getMaxQ(y: number, x: number): number {
  const q = qTable.value[y][x]
  return Math.max(q.up, q.down, q.left, q.right)
}

function qStep() {
  const pos = agentPos.value
  const action = chooseAction(pos)
  const nextPos = getNextPos(pos, action)
  const reward = grid.value[nextPos.y][nextPos.x].reward
  const oldQ = qTable.value[pos.y][pos.x][action]
  const maxNextQ = getMaxQ(nextPos.y, nextPos.x)
  const newQ = oldQ + alpha.value * (reward + gamma.value * maxNextQ - oldQ)

  const newQTable = qTable.value.map(row => row.map(q => ({ ...q })))
  newQTable[pos.y][pos.x][action] = newQ
  qTable.value = newQTable

  agentPos.value = nextPos
  step.value++
  totalReward.value += reward
  path.value = [...path.value, nextPos]

  if (grid.value[nextPos.y][nextPos.x].isGoal || step.value > 200) {
    episode.value++
    agentPos.value = { x: 0, y: 0 }
    step.value = 0
    totalReward.value = 0
    path.value = [{ x: 0, y: 0 }]
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function trainEpisodes(count: number) {
  if (isTraining.value) return
  isTraining.value = true
  const startEpisode = episode.value
  for (let ep = 0; ep < count; ep++) {
    agentPos.value = { x: 0, y: 0 }
    step.value = 0
    totalReward.value = 0
    path.value = [{ x: 0, y: 0 }]
    let steps = 0
    let done = false
    while (!done && steps < 200) {
      const pos = agentPos.value
      const action = chooseAction(pos)
      const nextPos = getNextPos(pos, action)
      const reward = grid.value[nextPos.y][nextPos.x].reward
      const oldQ = qTable.value[pos.y][pos.x][action]
      const maxNextQ = getMaxQ(nextPos.y, nextPos.x)
      const newQ = oldQ + alpha.value * (reward + gamma.value * maxNextQ - oldQ)
      const newQTable = qTable.value.map(r => r.map(q => ({ ...q })))
      newQTable[pos.y][pos.x][action] = newQ
      qTable.value = newQTable
      agentPos.value = nextPos
      totalReward.value += reward
      path.value = [...path.value, nextPos]
      steps++
      step.value = steps
      done = grid.value[nextPos.y][nextPos.x].isGoal
      if (count <= 10) await delay(80)
    }
    episode.value = startEpisode + ep + 1
    if (count <= 10) await delay(100)
  }
  agentPos.value = { x: 0, y: 0 }
  path.value = [{ x: 0, y: 0 }]
  step.value = 0
  totalReward.value = 0
  isTraining.value = false
}

function showOptimalPath() {
  const optPath: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  let pos = { x: 0, y: 0 }
  for (let i = 0; i < 50; i++) {
    const action = getBestAction(pos.y, pos.x)
    pos = getNextPos(pos, action)
    optPath.push({ ...pos })
    if (grid.value[pos.y][pos.x].isGoal) break
  }
  path.value = optPath
  agentPos.value = pos
}

function getCellClass(row: number, col: number): string {
  const cell = grid.value[row]?.[col]
  if (!cell) return ''
  if (cell.isGoal) return 'ql-cell--goal'
  if (cell.isObstacle) return 'ql-cell--obstacle'
  return ''
}

function isOnPath(row: number, col: number): boolean {
  return path.value.some(p => p.x === col && p.y === row)
}

function getArrow(row: number, col: number): string {
  if (grid.value[row]?.[col]?.isGoal || grid.value[row]?.[col]?.isObstacle) return ''
  const maxQ = getMaxQ(row, col)
  if (maxQ === 0) return ''
  const action = getBestAction(row, col)
  if (action === 'up') return '↑'
  if (action === 'down') return '↓'
  if (action === 'left') return '←'
  if (action === 'right') return '→'
  return ''
}

function getQColor(row: number, col: number): string {
  const maxQ = getMaxQ(row, col)
  if (maxQ > 50) return 'rgba(16,185,129,0.25)'
  if (maxQ > 10) return 'rgba(16,185,129,0.12)'
  if (maxQ < -5) return 'rgba(239,68,68,0.15)'
  return 'transparent'
}

// Initialize immediately so data exists during SSR
initializeGrid()

onMounted(() => {
  initializeGrid()
})
</script>

<template>
  <div class="ql-wrapper">
    <div class="ql-grid-card">
      <h3 class="ql-section-title">Q-Learning 网格世界</h3>
      <div class="ql-grid">
        <template v-for="row in GRID_SIZE" :key="'r' + row">
          <div
            v-for="col in GRID_SIZE" :key="'c' + col"
            :class="['ql-cell', getCellClass(row - 1, col - 1), isOnPath(row - 1, col - 1) ? 'ql-cell--path' : '']"
            :style="{ backgroundColor: getQColor(row - 1, col - 1) }"
          >
            <span v-if="agentPos.x === col - 1 && agentPos.y === row - 1" class="ql-agent">🤖</span>
            <span v-else-if="grid[row - 1]?.[col - 1]?.isGoal" class="ql-goal">🎯</span>
            <span v-else-if="grid[row - 1]?.[col - 1]?.isObstacle" class="ql-obstacle">🚧</span>
            <span v-else class="ql-arrow">{{ getArrow(row - 1, col - 1) }}</span>
            <span class="ql-qval">{{ getMaxQ(row - 1, col - 1).toFixed(1) }}</span>
          </div>
        </template>
      </div>
    </div>
    <div class="ql-stats-row">
      <div class="ql-stat-box">
        <div class="ql-stat-label">训练回合</div>
        <div class="ql-stat-value ql-c-brand">{{ episode }}</div>
      </div>
      <div class="ql-stat-box">
        <div class="ql-stat-label">当前步数</div>
        <div class="ql-stat-value ql-c-yellow">{{ step }}</div>
      </div>
      <div class="ql-stat-box">
        <div class="ql-stat-label">累计奖励</div>
        <div class="ql-stat-value ql-c-purple">{{ totalReward.toFixed(1) }}</div>
      </div>
      <div class="ql-stat-box">
        <div class="ql-stat-label">路径长度</div>
        <div class="ql-stat-value ql-c-green">{{ path.length }}</div>
      </div>
    </div>

    <div class="ql-controls-card">
      <div class="ql-control-row">
        <label class="ql-label">学习率 α: {{ alpha.toFixed(2) }}</label>
        <input type="range" min="0.01" max="1" step="0.01" v-model.number="alpha" class="ql-slider" :disabled="isTraining" />
      </div>
      <div class="ql-control-row">
        <label class="ql-label">折扣因子 γ: {{ gamma.toFixed(2) }}</label>
        <input type="range" min="0" max="1" step="0.05" v-model.number="gamma" class="ql-slider" :disabled="isTraining" />
      </div>
      <div class="ql-control-row">
        <label class="ql-label">探索率 ε: {{ epsilon.toFixed(2) }}</label>
        <input type="range" min="0" max="1" step="0.05" v-model.number="epsilon" class="ql-slider" :disabled="isTraining" />
      </div>
    </div>

    <div class="ql-btn-row">
      <button class="ql-btn ql-btn--secondary" @click="initializeGrid" :disabled="isTraining">🔄 重置</button>
      <button class="ql-btn ql-btn--primary" @click="trainEpisodes(1)" :disabled="isTraining">▶️ 训练 1 回合</button>
      <button class="ql-btn ql-btn--primary" @click="trainEpisodes(10)" :disabled="isTraining">⚡ 训练 10 回合</button>
      <button class="ql-btn ql-btn--accent" @click="trainEpisodes(100)" :disabled="isTraining">🚀 训练 100 回合</button>
      <button class="ql-btn ql-btn--green" @click="showOptimalPath" :disabled="isTraining">🏆 显示最优路径</button>
    </div>

    <div class="ql-legend">
      <h4 class="ql-legend-title">图例说明</h4>
      <div class="ql-legend-items">
        <div class="ql-legend-item"><span>🤖</span><span>智能体</span></div>
        <div class="ql-legend-item"><span>🎯</span><span>目标 (+100)</span></div>
        <div class="ql-legend-item"><span>🚧</span><span>障碍物 (-10)</span></div>
        <div class="ql-legend-item"><span>↑↓←→</span><span>最优动作方向</span></div>
      </div>
      <p class="ql-legend-note">单元格数字为最大Q值，颜色深浅反映Q值大小</p>
    </div>
  </div>
</template>

<style scoped>
.ql-wrapper { display: flex; flex-direction: column; gap: 16px; }
.ql-grid-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
}
.ql-section-title { font-size: 1.1em; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 12px; }
.ql-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  max-width: 420px;
  margin: 0 auto;
}
.ql-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  position: relative;
  background: var(--vp-c-bg);
  transition: background 0.2s;
}
.ql-cell--goal { background: rgba(16,185,129,0.15) !important; border-color: #10b981; }
.ql-cell--obstacle { background: rgba(239,68,68,0.12) !important; border-color: #ef4444; }
.ql-cell--path { box-shadow: inset 0 0 0 2px var(--vp-c-brand-1); }
.ql-agent { font-size: 1.6em; }
.ql-goal { font-size: 1.6em; }
.ql-obstacle { font-size: 1.4em; }
.ql-arrow { font-size: 1.2em; font-weight: 700; color: var(--vp-c-brand-1); }
.ql-qval {
  font-size: 0.6em; color: var(--vp-c-text-3);
  position: absolute; bottom: 2px; right: 4px;
}
.ql-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 640px) { .ql-stats-row { grid-template-columns: repeat(2, 1fr); } }
.ql-stat-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 14px;
}
.ql-stat-label { font-size: 0.8em; color: var(--vp-c-text-2); margin-bottom: 4px; }
.ql-stat-value { font-size: 1.6em; font-weight: 700; }
.ql-c-brand { color: var(--vp-c-brand-1); }
.ql-c-yellow { color: #eab308; }
.ql-c-purple { color: #a855f7; }
.ql-c-green { color: #10b981; }
.ql-controls-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ql-control-row { display: flex; flex-direction: column; gap: 4px; }
.ql-label { font-size: 0.9em; font-weight: 700; color: var(--vp-c-text-1); }
.ql-slider { width: 100%; accent-color: var(--vp-c-brand-1); }
.ql-btn-row { display: flex; flex-wrap: wrap; gap: 10px; }
.ql-btn {
  padding: 8px 16px; border: none; border-radius: 8px;
  font-weight: 600; font-size: 0.9em; cursor: pointer; transition: opacity 0.2s;
}
.ql-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ql-btn:hover:not(:disabled) { opacity: 0.85; }
.ql-btn--secondary {
  background: var(--vp-c-bg-soft); color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}
.ql-btn--primary { background: var(--vp-c-brand-1); color: #fff; }
.ql-btn--accent { background: #a855f7; color: #fff; }
.ql-btn--green { background: #10b981; color: #fff; }
.ql-legend {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
}
.ql-legend-title { font-size: 0.9em; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 10px; }
.ql-legend-items { display: flex; flex-wrap: wrap; gap: 16px; }
.ql-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--vp-c-text-2); }
.ql-legend-note { font-size: 0.75em; color: var(--vp-c-text-3); margin-top: 8px; }
</style>
