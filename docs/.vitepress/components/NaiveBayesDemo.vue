<script setup lang="ts">
import { ref, computed } from 'vue'

interface Example {
  天气: string
  温度: string
  湿度: string
  风力: string
  打球: string
}

const trainingData: Example[] = [
  { 天气: '晴', 温度: '高', 湿度: '高', 风力: '弱', 打球: '否' },
  { 天气: '晴', 温度: '高', 湿度: '高', 风力: '强', 打球: '否' },
  { 天气: '阴', 温度: '高', 湿度: '高', 风力: '弱', 打球: '是' },
  { 天气: '雨', 温度: '适中', 湿度: '高', 风力: '弱', 打球: '是' },
  { 天气: '雨', 温度: '低', 湿度: '正常', 风力: '弱', 打球: '是' },
  { 天气: '雨', 温度: '低', 湿度: '正常', 风力: '强', 打球: '否' },
  { 天气: '阴', 温度: '低', 湿度: '正常', 风力: '强', 打球: '是' },
  { 天气: '晴', 温度: '适中', 湿度: '高', 风力: '弱', 打球: '否' },
  { 天气: '晴', 温度: '低', 湿度: '正常', 风力: '弱', 打球: '是' },
  { 天气: '雨', 温度: '适中', 湿度: '正常', 风力: '弱', 打球: '是' },
  { 天气: '晴', 温度: '适中', 湿度: '正常', 风力: '强', 打球: '是' },
  { 天气: '阴', 温度: '适中', 湿度: '高', 风力: '强', 打球: '是' },
  { 天气: '阴', 温度: '高', 湿度: '正常', 风力: '弱', 打球: '是' },
  { 天气: '雨', 温度: '适中', 湿度: '高', 风力: '强', 打球: '否' },
]

const testCase = ref({ 天气: '晴', 温度: '适中', 湿度: '正常', 风力: '弱' })
const showCalculation = ref(false)

const features = ['天气', '温度', '湿度', '风力'] as const

function calculatePrior(label: string): number {
  return trainingData.filter(d => d.打球 === label).length / trainingData.length
}

function calculateConditional(feature: string, value: string, label: string): number {
  const labelData = trainingData.filter(d => d.打球 === label)
  const key = feature as keyof Example
  const count = labelData.filter(d => d[key] === value).length
  const uniqueValues = new Set(trainingData.map(d => d[key])).size
  return (count + 1) / (labelData.length + uniqueValues)
}

const result = computed(() => {
  const probs: Record<string, number> = {}
  for (const label of ['是', '否']) {
    let prob = calculatePrior(label)
    for (const f of features) {
      prob *= calculateConditional(f, testCase.value[f], label)
    }
    probs[label] = prob
  }
  const total = probs['是'] + probs['否']
  return { 是: probs['是'] / total, 否: probs['否'] / total, raw: probs }
})

const prediction = computed(() => result.value.是 > result.value.否 ? '是' : '否')
const yesCount = trainingData.filter(d => d.打球 === '是').length
const noCount = trainingData.filter(d => d.打球 === '否').length
</script>

<template>
  <div class="nb-demo">
    <!-- Test case input -->
    <div class="nb-input-card">
      <h3 class="nb-section-title nb-purple">测试样本</h3>
      <div class="nb-input-grid">
        <div class="nb-field">
          <label class="nb-field-label">天气</label>
          <select v-model="testCase.天气" class="nb-select">
            <option value="晴">晴</option>
            <option value="阴">阴</option>
            <option value="雨">雨</option>
          </select>
        </div>
        <div class="nb-field">
          <label class="nb-field-label">温度</label>
          <select v-model="testCase.温度" class="nb-select">
            <option value="高">高</option>
            <option value="适中">适中</option>
            <option value="低">低</option>
          </select>
        </div>
        <div class="nb-field">
          <label class="nb-field-label">湿度</label>
          <select v-model="testCase.湿度" class="nb-select">
            <option value="高">高</option>
            <option value="正常">正常</option>
          </select>
        </div>
        <div class="nb-field">
          <label class="nb-field-label">风力</label>
          <select v-model="testCase.风力" class="nb-select">
            <option value="强">强</option>
            <option value="弱">弱</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Prediction result -->
    <div class="nb-result-card">
      <h3 class="nb-section-title nb-cyan">预测结果</h3>
      <div class="nb-result-grid">
        <div class="nb-bars">
          <div class="nb-bar-group">
            <div class="nb-bar-header">
              <span>打球 = 是</span>
              <strong class="nb-green">{{ (result.是 * 100).toFixed(1) }}%</strong>
            </div>
            <div class="nb-bar-track">
              <div class="nb-bar-fill nb-bar-green" :style="{ width: (result.是 * 100) + '%' }">
                <span v-if="result.是 > 0.3" class="nb-bar-text">{{ (result.是 * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
          <div class="nb-bar-group">
            <div class="nb-bar-header">
              <span>打球 = 否</span>
              <strong class="nb-red">{{ (result.否 * 100).toFixed(1) }}%</strong>
            </div>
            <div class="nb-bar-track">
              <div class="nb-bar-fill nb-bar-red" :style="{ width: (result.否 * 100) + '%' }">
                <span v-if="result.否 > 0.3" class="nb-bar-text">{{ (result.否 * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="nb-prediction-box">
          <div class="nb-pred-label">最终预测</div>
          <div :class="['nb-pred-icon', prediction === '是' ? 'nb-green' : 'nb-red']">
            {{ prediction === '是' ? '✓' : '✗' }}
          </div>
          <div :class="['nb-pred-text', prediction === '是' ? 'nb-green' : 'nb-red']">
            {{ prediction === '是' ? '适合打球' : '不适合打球' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle calculation -->
    <button class="nb-toggle-btn" @click="showCalculation = !showCalculation">
      {{ showCalculation ? '隐藏计算过程 ▲' : '显示计算过程 ▼' }}
    </button>

    <!-- Detailed calculation -->
    <div v-if="showCalculation" class="nb-calc-card">
      <h3 class="nb-section-title">详细计算过程</h3>

      <div class="nb-calc-section">
        <h4 class="nb-calc-heading nb-cyan">1. 先验概率 P(c)</h4>
        <div class="nb-calc-row">
          <span>P(打球=是) = {{ yesCount }} / {{ trainingData.length }}</span>
          <span class="nb-green nb-mono">{{ calculatePrior('是').toFixed(4) }}</span>
        </div>
        <div class="nb-calc-row">
          <span>P(打球=否) = {{ noCount }} / {{ trainingData.length }}</span>
          <span class="nb-red nb-mono">{{ calculatePrior('否').toFixed(4) }}</span>
        </div>
      </div>

      <div class="nb-calc-section">
        <h4 class="nb-calc-heading nb-green">2. 条件概率 P(x|打球=是)</h4>
        <div class="nb-calc-row" v-for="f in features" :key="'yes-' + f">
          <span class="nb-mono">P({{ f }}={{ testCase[f] }}|是)</span>
          <span class="nb-green nb-mono">{{ calculateConditional(f, testCase[f], '是').toFixed(4) }}</span>
        </div>
        <div class="nb-calc-row nb-calc-total">
          <span class="nb-mono">P(是) × ∏P(xᵢ|是)</span>
          <span class="nb-green nb-mono">{{ result.raw.是.toExponential(4) }}</span>
        </div>
      </div>

      <div class="nb-calc-section">
        <h4 class="nb-calc-heading nb-red">3. 条件概率 P(x|打球=否)</h4>
        <div class="nb-calc-row" v-for="f in features" :key="'no-' + f">
          <span class="nb-mono">P({{ f }}={{ testCase[f] }}|否)</span>
          <span class="nb-red nb-mono">{{ calculateConditional(f, testCase[f], '否').toFixed(4) }}</span>
        </div>
        <div class="nb-calc-row nb-calc-total">
          <span class="nb-mono">P(否) × ∏P(xᵢ|否)</span>
          <span class="nb-red nb-mono">{{ result.raw.否.toExponential(4) }}</span>
        </div>
      </div>

      <div class="nb-calc-section nb-calc-final">
        <h4 class="nb-calc-heading nb-cyan">4. 归一化得到后验概率</h4>
        <div class="nb-calc-row nb-mono" style="flex-wrap: wrap;">
          P(是|x) = {{ result.raw.是.toExponential(4) }} / ({{ result.raw.是.toExponential(4) }} + {{ result.raw.否.toExponential(4) }})
          <span class="nb-green"> = {{ (result.是 * 100).toFixed(2) }}%</span>
        </div>
        <div class="nb-calc-row nb-mono" style="flex-wrap: wrap;">
          P(否|x) = {{ result.raw.否.toExponential(4) }} / ({{ result.raw.是.toExponential(4) }} + {{ result.raw.否.toExponential(4) }})
          <span class="nb-red"> = {{ (result.否 * 100).toFixed(2) }}%</span>
        </div>
      </div>
    </div>

    <!-- Training data table -->
    <div class="nb-data-card">
      <h3 class="nb-section-title">训练数据集 ({{ trainingData.length }} 条)</h3>
      <div class="nb-table-wrap">
        <table class="nb-table">
          <thead>
            <tr><th>天气</th><th>温度</th><th>湿度</th><th>风力</th><th>打球</th></tr>
          </thead>
          <tbody>
            <tr v-for="(ex, i) in trainingData" :key="i">
              <td>{{ ex.天气 }}</td>
              <td>{{ ex.温度 }}</td>
              <td>{{ ex.湿度 }}</td>
              <td>{{ ex.风力 }}</td>
              <td>
                <span :class="['nb-badge', ex.打球 === '是' ? 'nb-badge-green' : 'nb-badge-red']">
                  {{ ex.打球 }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Formula explanation -->
    <div class="nb-formula-card">
      <h4 class="nb-tips-title">💡 朴素贝叶斯公式</h4>
      <div class="nb-formula-display">P(c|x) = P(c) × ∏ᵢ P(xᵢ|c) / P(x)</div>
      <ul class="nb-tips-list">
        <li><strong>条件独立假设</strong>：假设特征之间相互独立</li>
        <li><strong>拉普拉斯平滑</strong>：避免零概率问题，P(x|c) = (count + 1) / (total + N)</li>
        <li><strong>归一化</strong>：使后验概率和为1</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.nb-demo {
  border: 1px solid var(--vp-c-divider); border-radius: 12px;
  padding: 24px; background: var(--vp-c-bg-soft); margin: 16px 0;
}
.nb-section-title { font-size: 16px; font-weight: 700; color: var(--vp-c-text-1); margin: 0 0 16px 0; }
.nb-purple { color: #8b5cf6; }
.nb-cyan { color: #06b6d4; }
.nb-green { color: #16a34a; }
.nb-red { color: #dc2626; }
.nb-mono { font-family: monospace; }
:global(.dark) .nb-green { color: #4ade80; }
:global(.dark) .nb-red { color: #f87171; }

/* Input card */
.nb-input-card {
  background: var(--vp-c-bg); border: 2px solid rgba(139,92,246,0.3);
  border-radius: 12px; padding: 20px; margin-bottom: 20px;
}
.nb-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 640px) { .nb-input-grid { grid-template-columns: 1fr; } }
.nb-field-label { display: block; font-size: 13px; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 6px; }
.nb-select {
  width: 100%; padding: 8px 12px; border-radius: 8px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1); font-size: 14px;
}

/* Result card */
.nb-result-card {
  background: var(--vp-c-bg); border: 2px solid rgba(6,182,212,0.3);
  border-radius: 12px; padding: 20px; margin-bottom: 20px;
}
.nb-result-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 768px) { .nb-result-grid { grid-template-columns: 1fr 1fr; } }
.nb-bar-group { margin-bottom: 12px; }
.nb-bar-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: var(--vp-c-text-1); }
.nb-bar-track { height: 28px; background: var(--vp-c-bg-soft); border-radius: 6px; overflow: hidden; }
.nb-bar-fill { height: 100%; transition: width 0.4s; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; border-radius: 6px; }
.nb-bar-green { background: linear-gradient(90deg, #22c55e, #06b6d4); }
.nb-bar-red { background: linear-gradient(90deg, #ef4444, #f97316); }
.nb-bar-text { font-size: 11px; font-weight: 700; color: #fff; }
.nb-prediction-box { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.nb-pred-label { font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.nb-pred-icon { font-size: 48px; font-weight: 700; }
.nb-pred-text { font-size: 20px; font-weight: 700; margin-top: 4px; }

/* Toggle button */
.nb-toggle-btn {
  width: 100%; padding: 10px; border-radius: 8px; cursor: pointer;
  font-weight: 700; font-size: 14px; margin-bottom: 20px;
  background: rgba(139,92,246,0.1); border: 1px solid #8b5cf6; color: #8b5cf6;
  transition: background 0.2s;
}
.nb-toggle-btn:hover { background: rgba(139,92,246,0.2); }

/* Calculation card */
.nb-calc-card {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 12px; padding: 20px; margin-bottom: 20px;
}
.nb-calc-section { background: var(--vp-c-bg-soft); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.nb-calc-heading { font-size: 13px; font-weight: 700; margin: 0 0 8px 0; }
.nb-calc-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--vp-c-text-2); padding: 3px 0; }
.nb-calc-total { border-top: 1px solid var(--vp-c-divider); margin-top: 6px; padding-top: 8px; font-weight: 700; }
.nb-calc-final { background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.3); }

/* Data table */
.nb-data-card {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 12px; padding: 20px; margin-bottom: 20px;
}
.nb-table-wrap { overflow-x: auto; }
.nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.nb-table th {
  text-align: left; padding: 8px 12px; font-weight: 700;
  color: var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-divider);
}
.nb-table td { padding: 8px 12px; color: var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-divider); }
.nb-table tr:hover td { background: var(--vp-c-bg-soft); }
.nb-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
.nb-badge-green { background: rgba(34,197,94,0.15); color: #16a34a; }
.nb-badge-red { background: rgba(239,68,68,0.15); color: #dc2626; }
:global(.dark) .nb-badge-green { color: #4ade80; }
:global(.dark) .nb-badge-red { color: #f87171; }

/* Formula card */
.nb-formula-card {
  background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3);
  border-radius: 12px; padding: 16px;
}
.nb-tips-title { font-size: 14px; font-weight: 700; color: #d97706; margin: 0 0 12px 0; }
.nb-formula-display {
  background: var(--vp-c-bg-soft); border-radius: 8px; padding: 10px;
  text-align: center; font-family: monospace; font-size: 15px;
  color: var(--vp-c-text-1); margin-bottom: 12px;
}
.nb-tips-list { list-style: none; padding: 0; margin: 0; font-size: 13px; color: var(--vp-c-text-2); }
.nb-tips-list li { margin-bottom: 4px; }
.nb-tips-list strong { color: var(--vp-c-text-1); }
</style>
