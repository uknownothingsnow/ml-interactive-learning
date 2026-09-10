<script setup lang="ts">
import { ref, computed } from 'vue'

interface ClassCount {
  name: string
  count: number
  color: string
}

const classes = ref<ClassCount[]>([
  { name: '正类', count: 50, color: '#3b82f6' },
  { name: '负类', count: 50, color: '#ef4444' }
])

const total = computed(() => classes.value.reduce((sum, c) => sum + c.count, 0))

const maxEntropy = computed(() => Math.log2(classes.value.length))

const entropy = computed(() => {
  const t = total.value
  if (t === 0) return 0
  let ent = 0
  for (const c of classes.value) {
    if (c.count > 0) {
      const p = c.count / t
      ent -= p * Math.log2(p)
    }
  }
  return ent
})

const entropyDesc = computed(() => {
  const e = entropy.value
  if (e < 0.3) return { text: '极低 - 数据非常纯', cls: 'ec-desc-green' }
  if (e < 0.7) return { text: '较低 - 数据较纯', cls: 'ec-desc-cyan' }
  if (e < 1.2) return { text: '中等 - 数据混合', cls: 'ec-desc-yellow' }
  if (e < 1.8) return { text: '较高 - 数据很混乱', cls: 'ec-desc-red' }
  return { text: '极高 - 数据极度混乱', cls: 'ec-desc-red' }
})

const entropyBarWidth = computed(() =>
  maxEntropy.value > 0 ? (entropy.value / maxEntropy.value) * 100 : 0
)

const computationSteps = computed(() =>
  classes.value.map((c, idx) => {
    const t = total.value
    const p = t > 0 ? c.count / t : 0
    const contribution = p > 0 ? -p * Math.log2(p) : 0
    return { idx, color: c.color, p, contribution, count: c.count, total: t }
  })
)

// Pie chart paths
const piePaths = computed(() => {
  const t = total.value
  if (t === 0) return []
  let currentAngle = -Math.PI / 2
  return classes.value.map((c) => {
    const pct = c.count / t
    const angle = pct * 2 * Math.PI
    const endAngle = currentAngle + angle
    const largeArc = angle > Math.PI ? 1 : 0
    const x1 = 120 * Math.cos(currentAngle)
    const y1 = 120 * Math.sin(currentAngle)
    const x2 = 120 * Math.cos(endAngle)
    const y2 = 120 * Math.sin(endAngle)
    const path = `M 0 0 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`
    const labelAngle = currentAngle + angle / 2
    const labelX = 80 * Math.cos(labelAngle)
    const labelY = 80 * Math.sin(labelAngle)
    currentAngle = endAngle
    return { path, color: c.color, pct, labelX, labelY }
  })
})

function updateCount(index: number, value: number) {
  classes.value[index].count = Math.max(0, Math.min(100, value))
}

function addClass() {
  if (classes.value.length >= 5) return
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
  classes.value.push({
    name: `类别 ${classes.value.length + 1}`,
    count: 20,
    color: colors[classes.value.length % colors.length]
  })
}

function removeClass(index: number) {
  if (classes.value.length <= 2) return
  classes.value.splice(index, 1)
}
</script>

<template>
  <div class="ec-root">
    <!-- Entropy display -->
    <div class="ec-entropy-card">
      <div class="ec-entropy-center">
        <div class="ec-entropy-label">当前信息熵</div>
        <div class="ec-entropy-value">{{ entropy.toFixed(3) }}</div>
        <div :class="['ec-entropy-desc', entropyDesc.cls]">{{ entropyDesc.text }}</div>
      </div>
      <div class="ec-bar-track">
        <div class="ec-bar-fill" :style="{ width: entropyBarWidth + '%' }"></div>
        <div class="ec-bar-labels">
          <span>0 (完全纯)</span>
          <span>{{ maxEntropy.toFixed(2) }} (最混乱)</span>
        </div>
      </div>
    </div>

    <!-- Formula & computation -->
    <div class="ec-formula-card">
      <div class="ec-formula-title">Ent(D) = -&Sigma; p<sub>k</sub> log<sub>2</sub> p<sub>k</sub></div>
      <div class="ec-formula-subtitle">计算过程：</div>
      <div class="ec-steps">
        <div v-for="s in computationSteps" :key="s.idx" class="ec-step-row">
          <span :style="{ color: s.color }">p<sub>{{ s.idx + 1 }}</sub> = {{ s.count }}/{{ s.total }} = {{ s.p.toFixed(3) }}</span>
          <span class="ec-step-arrow">&rarr;</span>
          <span>-{{ s.p.toFixed(3) }} &times; log<sub>2</sub>({{ s.p.toFixed(3) }}) = {{ s.contribution.toFixed(3) }}</span>
        </div>
        <div class="ec-step-total">
          <span>总和 =</span>
          <span>{{ entropy.toFixed(3) }}</span>
        </div>
      </div>
    </div>

    <!-- Class controls -->
    <div class="ec-controls">
      <div class="ec-controls-header">
        <h4>调整类别分布</h4>
        <span>总样本数: <strong>{{ total }}</strong></span>
      </div>

      <div v-for="(c, idx) in classes" :key="idx" class="ec-class-card">
        <div class="ec-class-header">
          <div class="ec-class-info">
            <div class="ec-color-dot" :style="{ backgroundColor: c.color }"></div>
            <input
              type="text"
              :value="c.name"
              @input="c.name = ($event.target as HTMLInputElement).value"
              class="ec-name-input"
            />
            <span class="ec-count-label">样本数: <strong>{{ c.count }}</strong></span>
            <span class="ec-pct-label">({{ total > 0 ? ((c.count / total) * 100).toFixed(1) : 0 }}%)</span>
          </div>
          <button v-if="classes.length > 2" class="ec-remove-btn" @click="removeClass(idx)">删除</button>
        </div>
        <input
          type="range" min="0" max="100"
          :value="c.count"
          @input="updateCount(idx, Number(($event.target as HTMLInputElement).value))"
          class="ec-slider"
        />
        <div class="ec-num-controls">
          <button class="ec-num-btn" @click="updateCount(idx, c.count - 5)">-5</button>
          <input
            type="number" min="0" max="100"
            :value="c.count"
            @input="updateCount(idx, Number(($event.target as HTMLInputElement).value) || 0)"
            class="ec-num-input"
          />
          <button class="ec-num-btn" @click="updateCount(idx, c.count + 5)">+5</button>
        </div>
      </div>

      <button v-if="classes.length < 5" class="ec-add-btn" @click="addClass">+ 添加类别</button>
    </div>

    <!-- Pie chart -->
    <div class="ec-pie-card">
      <h4>类别分布</h4>
      <div class="ec-pie-wrap">
        <svg width="280" height="280" viewBox="-140 -140 280 280">
          <g v-for="(slice, idx) in piePaths" :key="idx">
            <path :d="slice.path" :fill="slice.color" opacity="0.8" />
            <text
              v-if="slice.pct > 0.05"
              :x="slice.labelX" :y="slice.labelY"
              text-anchor="middle" dominant-baseline="middle"
              class="ec-pie-label"
            >{{ (slice.pct * 100).toFixed(0) }}%</text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Hint -->
    <div class="ec-hint">
      <span class="ec-hint-icon">💡</span>
      <div>
        <p class="ec-hint-title">观察要点：</p>
        <ul>
          <li>当所有样本属于一个类别时，熵为 0（完全纯）</li>
          <li>当各类别样本数量相等时，熵达到最大值（最混乱）</li>
          <li>信息熵衡量的是数据集的不确定性或混乱程度</li>
          <li>决策树的目标是通过划分降低熵，使子节点更"纯"</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ec-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}

/* Entropy display */
.ec-entropy-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
}
.ec-entropy-center { text-align: center; margin-bottom: 16px; }
.ec-entropy-label { font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.ec-entropy-value { font-size: 48px; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 4px; }
.ec-entropy-desc { font-size: 13px; font-weight: 600; }
.ec-desc-green { color: #10b981; }
.ec-desc-cyan { color: #06b6d4; }
.ec-desc-yellow { color: #f59e0b; }
.ec-desc-red { color: #ef4444; }

.ec-bar-track {
  position: relative;
  height: 32px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  overflow: hidden;
}
.ec-bar-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(to right, #10b981, #f59e0b, #ef4444);
  transition: width 0.3s;
}
.ec-bar-labels {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* Formula */
.ec-formula-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}
.ec-formula-title {
  text-align: center;
  font-size: 18px;
  font-family: monospace;
  color: #06b6d4;
  margin-bottom: 8px;
}
.ec-formula-subtitle { text-align: center; font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 8px; }
.ec-steps { font-size: 13px; font-family: monospace; }
.ec-step-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; color: var(--vp-c-text-1); }
.ec-step-arrow { color: var(--vp-c-text-3); margin: 0 8px; }
.ec-step-total {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 8px;
  margin-top: 8px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

/* Controls */
.ec-controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ec-controls-header h4 { font-size: 16px; font-weight: 600; color: var(--vp-c-text-1); margin: 0; }
.ec-controls-header span { font-size: 13px; color: var(--vp-c-text-2); }
.ec-controls-header strong { color: #06b6d4; }

.ec-class-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}
.ec-class-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.ec-class-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ec-color-dot { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }
.ec-name-input {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  width: 80px;
}
.ec-count-label { font-size: 13px; color: var(--vp-c-text-2); }
.ec-count-label strong { color: var(--vp-c-text-1); }
.ec-pct-label { font-size: 13px; color: var(--vp-c-text-3); }
.ec-remove-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.ec-remove-btn:hover { background: rgba(239, 68, 68, 0.1); }

.ec-slider { width: 100%; accent-color: var(--vp-c-brand-1); }
.ec-num-controls { display: flex; gap: 8px; margin-top: 8px; }
.ec-num-btn {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 13px;
}
.ec-num-btn:hover { background: var(--vp-c-bg); }
.ec-num-input {
  flex: 1;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 4px 8px;
  text-align: center;
  font-size: 13px;
}

.ec-add-btn {
  width: 100%;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 8px;
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}
.ec-add-btn:hover { background: rgba(59, 130, 246, 0.2); }

/* Pie chart */
.ec-pie-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 24px;
}
.ec-pie-card h4 { text-align: center; font-size: 16px; font-weight: 600; color: var(--vp-c-text-1); margin: 0 0 16px 0; }
.ec-pie-wrap { display: flex; justify-content: center; }
.ec-pie-label { fill: var(--vp-c-text-1); font-size: 14px; font-weight: 600; }

/* Hint */
.ec-hint {
  display: flex;
  gap: 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 16px;
}
.ec-hint-icon { font-size: 24px; flex-shrink: 0; }
.ec-hint-title { font-weight: 600; color: var(--vp-c-text-1); margin: 0 0 8px 0; font-size: 14px; }
.ec-hint ul { margin: 0; padding: 0; list-style: none; }
.ec-hint li { font-size: 13px; color: var(--vp-c-text-2); padding: 2px 0; }
.ec-hint li::before { content: '• '; color: var(--vp-c-text-3); }
</style>
