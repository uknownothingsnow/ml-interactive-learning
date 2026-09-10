<script setup lang="ts">
import { ref, computed } from 'vue'

type ActivationFunction = 'sigmoid' | 'relu' | 'tanh' | 'leakyRelu'

interface FunctionConfig {
  name: string
  displayName: string
  formula: string
  color: string
  calculate: (x: number) => number
  description: string
  range: string
  pros: string[]
  cons: string[]
}

const funcConfigs: Record<ActivationFunction, FunctionConfig> = {
  sigmoid: {
    name: 'sigmoid', displayName: 'Sigmoid',
    formula: 'σ(x) = 1 / (1 + e⁻ˣ)',
    color: '#06b6d4',
    calculate: (x: number) => 1 / (1 + Math.exp(-x)),
    description: '将输入压缩到 (0, 1) 区间，常用于二分类输出层',
    range: '(0, 1)',
    pros: ['输出范围有界，适合概率解释', '平滑可导，便于梯度计算'],
    cons: ['梯度消失问题严重（饱和区梯度接近0）', '输出非零中心，影响收敛速度', '计算代价较高（指数运算）']
  },
  relu: {
    name: 'relu', displayName: 'ReLU',
    formula: 'ReLU(x) = max(0, x)',
    color: '#a855f7',
    calculate: (x: number) => Math.max(0, x),
    description: '最流行的激活函数，计算简单高效',
    range: '[0, +∞)',
    pros: ['计算简单，训练速度快', '缓解梯度消失问题', '稀疏激活（约50%神经元）'],
    cons: ['神经元"死亡"问题（负值梯度为0）', '输出非零中心', '在负半轴不可导']
  },
  tanh: {
    name: 'tanh', displayName: 'Tanh',
    formula: 'tanh(x) = (eˣ - e⁻ˣ) / (eˣ + e⁻ˣ)',
    color: '#fb923c',
    calculate: (x: number) => Math.tanh(x),
    description: '双曲正切函数，输出零中心，比 Sigmoid 收敛更快',
    range: '(-1, 1)',
    pros: ['输出零中心，收敛速度快', '输出范围有界', '比 Sigmoid 梯度更大'],
    cons: ['仍存在梯度消失问题', '计算代价较高', '饱和区梯度小']
  },
  leakyRelu: {
    name: 'leakyRelu', displayName: 'Leaky ReLU',
    formula: 'f(x) = max(0.01x, x)',
    color: '#22c55e',
    calculate: (x: number) => x > 0 ? x : 0.01 * x,
    description: 'ReLU 的改进版本，避免神经元死亡',
    range: '(-∞, +∞)',
    pros: ['解决 ReLU 神经元死亡问题', '计算简单高效', '负值仍有小梯度'],
    cons: ['需要调整负半轴斜率超参数', '效果提升有限', '负值响应较弱']
  }
}

const allFuncKeys: ActivationFunction[] = ['sigmoid', 'relu', 'tanh', 'leakyRelu']

const selectedFunctions = ref<ActivationFunction[]>([...allFuncKeys])
const highlightedFunction = ref<ActivationFunction | null>(null)
const showDerivative = ref(false)

function toggleFunction(key: ActivationFunction) {
  const idx = selectedFunctions.value.indexOf(key)
  if (idx >= 0) {
    if (selectedFunctions.value.length > 1) selectedFunctions.value.splice(idx, 1)
  } else {
    selectedFunctions.value.push(key)
  }
}

const xMin = -5, xMax = 5, numPoints = 200
const xStep = (xMax - xMin) / numPoints

function generatePoints(func: FunctionConfig, derivative: boolean) {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + i * xStep
    let y: number
    if (derivative) {
      const h = 0.0001
      y = (func.calculate(x + h) - func.calculate(x - h)) / (2 * h)
    } else {
      y = func.calculate(x)
    }
    pts.push({ x, y })
  }
  return pts
}

function toSVG(x: number, y: number): { sx: number; sy: number } {
  const svgW = 700, svgH = 400, pad = 60
  const plotW = svgW - 2 * pad, plotH = svgH - 2 * pad
  const yMin = showDerivative.value ? -0.5 : -1.5
  const yMax = showDerivative.value ? 1.5 : 1.5
  return {
    sx: pad + ((x - xMin) / (xMax - xMin)) * plotW,
    sy: svgH - pad - ((y - yMin) / (yMax - yMin)) * plotH
  }
}

function pointsToPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => {
    const c = toSVG(p.x, p.y)
    return `${i === 0 ? 'M' : 'L'} ${c.sx} ${c.sy}`
  }).join(' ')
}

const curvePaths = computed(() =>
  selectedFunctions.value.map(key => {
    const func = funcConfigs[key]
    const pts = generatePoints(func, showDerivative.value)
    return { key, color: func.color, path: pointsToPath(pts) }
  })
)

// Grid lines
const vGridLines = computed(() => [-4,-3,-2,-1,0,1,2,3,4].map(x => toSVG(x, 0)))
const hGridLines = computed(() => [-1,-0.5,0,0.5,1].map(y => toSVG(0, y)))

const displayedFunc = computed(() => {
  const key = highlightedFunction.value || selectedFunctions.value[0]
  return funcConfigs[key]
})
const displayedKey = computed(() => highlightedFunction.value || selectedFunctions.value[0])

// Comparison table data
const comparisonData = computed(() => allFuncKeys.map(key => {
  const f = funcConfigs[key]
  return {
    key, name: f.displayName, color: f.color, range: f.range,
    zeroCentered: f.name === 'tanh',
    vanishing: f.name === 'sigmoid' || f.name === 'tanh' ? '严重' : f.name === 'relu' ? '较轻' : '很轻',
    vanishingColor: f.name === 'sigmoid' || f.name === 'tanh' ? '#ef4444' : f.name === 'relu' ? '#f59e0b' : '#22c55e',
    speed: f.name === 'relu' || f.name === 'leakyRelu' ? '快' : '较慢',
    speedColor: f.name === 'relu' || f.name === 'leakyRelu' ? '#22c55e' : '#f59e0b'
  }
}))
</script>

<template>
  <div class="af-root">
    <!-- Function selector -->
    <div class="af-selector">
      <button
        v-for="key in allFuncKeys" :key="key"
        class="af-func-btn"
        :class="{ 'af-func-active': selectedFunctions.includes(key), 'af-func-hl': highlightedFunction === key }"
        :style="selectedFunctions.includes(key) ? { borderColor: funcConfigs[key].color } : {}"
        @click="toggleFunction(key)"
        @mouseenter="highlightedFunction = key"
        @mouseleave="highlightedFunction = null"
      >
        <div class="af-func-name">{{ funcConfigs[key].displayName }}</div>
        <div class="af-func-formula">{{ funcConfigs[key].formula }}</div>
      </button>
    </div>

    <!-- Derivative toggle -->
    <div class="af-toggle-row">
      <span>显示导数</span>
      <button class="af-toggle" :class="{ 'af-toggle-on': showDerivative }" @click="showDerivative = !showDerivative">
        <div class="af-toggle-thumb" :class="{ 'af-toggle-thumb-on': showDerivative }"></div>
      </button>
    </div>

    <!-- Chart -->
    <div class="af-chart-wrap">
      <svg viewBox="0 0 700 400" class="af-chart-svg">
        <!-- Grid -->
        <g opacity="0.1">
          <line v-for="(g, i) in vGridLines" :key="'vg-'+i" :x1="g.sx" y1="20" :x2="g.sx" y2="380" stroke="var(--vp-c-text-1)" stroke-width="1" />
          <line v-for="(g, i) in hGridLines" :key="'hg-'+i" x1="20" :y1="g.sy" x2="680" :y2="g.sy" stroke="var(--vp-c-text-1)" stroke-width="1" />
        </g>
        <!-- Axes -->
        <line x1="60" :y1="toSVG(0,0).sy" x2="640" :y2="toSVG(0,0).sy" stroke="var(--vp-c-text-1)" stroke-width="2" opacity="0.5" />
        <line :x1="toSVG(0,0).sx" y1="40" :x2="toSVG(0,0).sx" y2="360" stroke="var(--vp-c-text-1)" stroke-width="2" opacity="0.5" />
        <text x="660" :y="toSVG(0,0).sy + 5" class="af-axis-label">x</text>
        <text :x="toSVG(0,0).sx + 5" y="35" class="af-axis-label">y</text>

        <!-- Curves -->
        <g v-for="curve in curvePaths" :key="curve.key">
          <path
            v-if="highlightedFunction === curve.key || highlightedFunction === null"
            :d="curve.path" fill="none" :stroke="curve.color"
            stroke-width="8" opacity="0.15"
          />
          <path
            :d="curve.path" fill="none" :stroke="curve.color"
            :stroke-width="(highlightedFunction === curve.key || highlightedFunction === null) ? 3 : 2"
            :opacity="(highlightedFunction === curve.key || highlightedFunction === null) ? 1 : 0.3"
          />
        </g>
      </svg>
    </div>

    <!-- Function details -->
    <div class="af-detail" :style="{ borderColor: displayedFunc.color }">
      <div class="af-detail-header">
        <span class="af-detail-dot" :style="{ backgroundColor: displayedFunc.color }"></span>
        <h3>{{ displayedFunc.displayName }}</h3>
        <code>{{ displayedFunc.formula }}</code>
      </div>
      <p class="af-detail-desc">{{ displayedFunc.description }}</p>
      <div class="af-detail-grid">
        <div>
          <h4>✅ 优点</h4>
          <ul>
            <li v-for="(pro, i) in displayedFunc.pros" :key="i" class="af-pro">{{ pro }}</li>
          </ul>
        </div>
        <div>
          <h4>⚠️ 缺点</h4>
          <ul>
            <li v-for="(con, i) in displayedFunc.cons" :key="i" class="af-con">{{ con }}</li>
          </ul>
        </div>
      </div>
      <div class="af-detail-range">
        <span>值域:</span>
        <code>{{ displayedFunc.range }}</code>
      </div>
    </div>

    <!-- Comparison table -->
    <div class="af-table-wrap">
      <table class="af-table">
        <thead>
          <tr>
            <th>函数</th><th>值域</th><th>零中心</th><th>梯度消失</th><th>计算速度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in comparisonData" :key="row.key">
            <td><strong :style="{ color: row.color }">{{ row.name }}</strong></td>
            <td class="af-mono">{{ row.range }}</td>
            <td>
              <span v-if="row.zeroCentered" style="color:#22c55e">✓</span>
              <span v-else style="color:#ef4444">✗</span>
            </td>
            <td><span :style="{ color: row.vanishingColor }">{{ row.vanishing }}</span></td>
            <td><span :style="{ color: row.speedColor }">{{ row.speed }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.af-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}

/* Selector */
.af-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 640px) { .af-selector { grid-template-columns: repeat(4, 1fr); } }
.af-func-btn {
  padding: 14px;
  border-radius: 10px;
  border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}
.af-func-active { border-width: 2px; }
.af-func-hl { transform: scale(1.03); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.af-func-name { font-size: 15px; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 4px; }
.af-func-formula { font-size: 11px; font-family: monospace; color: var(--vp-c-text-2); }

/* Toggle */
.af-toggle-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 12px;
}
.af-toggle-row span { font-weight: 600; color: var(--vp-c-text-1); font-size: 14px; }
.af-toggle {
  position: relative;
  width: 48px;
  height: 24px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  transition: background 0.3s;
}
.af-toggle-on { background: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.af-toggle-thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.3s;
}
.af-toggle-thumb-on { transform: translateX(24px); }

/* Chart */
.af-chart-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 16px;
}
.af-chart-svg { width: 100%; height: auto; }
.af-axis-label { fill: var(--vp-c-text-1); font-size: 12px; font-weight: 700; }

/* Detail */
.af-detail {
  border: 2px solid;
  border-radius: 12px;
  padding: 20px;
  background: var(--vp-c-bg);
}
.af-detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.af-detail-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.af-detail-header h3 { font-size: 20px; font-weight: 700; color: var(--vp-c-text-1); margin: 0; }
.af-detail-header code {
  font-size: 13px;
  background: var(--vp-c-bg-soft);
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--vp-c-text-1);
}
.af-detail-desc { font-size: 14px; color: var(--vp-c-text-2); margin-bottom: 16px; }
.af-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 640px) { .af-detail-grid { grid-template-columns: 1fr; } }
.af-detail-grid h4 { font-size: 13px; font-weight: 700; color: var(--vp-c-text-1); margin: 0 0 8px 0; }
.af-detail-grid ul { margin: 0; padding: 0; list-style: none; }
.af-detail-grid li { font-size: 13px; color: var(--vp-c-text-2); padding: 3px 0; }
.af-pro::before { content: '• '; color: #22c55e; }
.af-con::before { content: '• '; color: #ef4444; }
.af-detail-range {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.af-detail-range span { font-weight: 600; color: var(--vp-c-text-1); }
.af-detail-range code {
  font-family: monospace;
  background: var(--vp-c-bg-soft);
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--vp-c-text-1);
}

/* Table */
.af-table-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.af-table { width: 100%; border-collapse: collapse; }
.af-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.af-table td {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
}
.af-table tr:last-child td { border-bottom: none; }
.af-mono { font-family: monospace; font-size: 12px; }
</style>
