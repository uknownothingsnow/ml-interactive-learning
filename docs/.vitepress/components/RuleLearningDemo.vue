<script setup lang="ts">
import { ref } from 'vue'

interface Example {
  天气: string
  温度: string
  湿度: string
  风力: string
  打球: string
}

interface Rule {
  conditions: { feature: string; value: string }[]
  conclusion: string
  coverage: number
  accuracy: number
}

const data: Example[] = [
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

const rules = ref<Rule[]>([])
const selectedExample = ref<number | null>(null)

function learnRules() {
  const newRules: Rule[] = []
  const r1 = data.filter(d => d.湿度 === '正常')
  newRules.push({
    conditions: [{ feature: '湿度', value: '正常' }],
    conclusion: '是',
    coverage: r1.length,
    accuracy: (r1.filter(d => d.打球 === '是').length / r1.length) * 100
  })
  const r2 = data.filter(d => d.天气 === '阴')
  newRules.push({
    conditions: [{ feature: '天气', value: '阴' }],
    conclusion: '是',
    coverage: r2.length,
    accuracy: (r2.filter(d => d.打球 === '是').length / r2.length) * 100
  })
  const r3 = data.filter(d => d.天气 === '雨' && d.风力 === '强')
  newRules.push({
    conditions: [{ feature: '天气', value: '雨' }, { feature: '风力', value: '强' }],
    conclusion: '否',
    coverage: r3.length,
    accuracy: (r3.filter(d => d.打球 === '否').length / r3.length) * 100
  })
  newRules.push({
    conditions: [],
    conclusion: '是',
    coverage: data.length,
    accuracy: (data.filter(d => d.打球 === '是').length / data.length) * 100
  })
  rules.value = newRules
}

function getApplicableRule(example: Example): Rule | null {
  for (const rule of rules.value) {
    if (rule.conditions.length === 0) continue
    const matches = rule.conditions.every(cond => {
      return (example as any)[cond.feature] === cond.value
    })
    if (matches) return rule
  }
  return rules.value[rules.value.length - 1] || null
}

function toggleExample(idx: number) {
  selectedExample.value = selectedExample.value === idx ? null : idx
}
</script>

<template>
  <div class="rl-wrapper">
    <div class="rl-btn-row">
      <button class="rl-btn rl-btn--primary" @click="learnRules">🧠 学习规则</button>
    </div>

    <div v-if="rules.length > 0" class="rl-rules-card">
      <h3 class="rl-section-title">学到的规则</h3>
      <div class="rl-rules-list">
        <div
          v-for="(rule, idx) in rules" :key="idx"
          :class="['rl-rule', rule.conditions.length === 0 ? 'rl-rule--default' : '']"
        >
          <div class="rl-rule-header">
            <span class="rl-rule-icon">{{ rule.conditions.length === 0 ? '🏁' : '📏' }}</span>
            <span class="rl-rule-name">{{ rule.conditions.length === 0 ? '默认规则' : '规则 ' + (idx + 1) }}</span>
          </div>
          <div class="rl-rule-body">
            <template v-if="rule.conditions.length > 0">
              <span class="rl-kw-if">IF</span>
              <template v-for="(cond, ci) in rule.conditions" :key="ci">
                <span v-if="ci > 0" class="rl-kw-and"> AND </span>
                <span class="rl-feat">{{ cond.feature }}</span>
                <span> = </span>
                <span class="rl-val">{{ cond.value }}</span>
              </template>
              <br />
            </template>
            <span class="rl-kw-then">THEN</span>
            <span :class="['rl-conclusion', rule.conclusion === '是' ? 'rl-c-green' : 'rl-c-red']">
              打球 = {{ rule.conclusion }}
            </span>
          </div>
          <div class="rl-rule-footer">
            <span>覆盖: {{ rule.coverage }} 样本</span>
            <span class="rl-c-brand">准确率: {{ rule.accuracy.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="rl-table-card">
      <h3 class="rl-section-title">训练数据 (点击查看应用的规则)</h3>
      <div class="rl-table-scroll">
        <table class="rl-table">
          <thead>
            <tr>
              <th>#</th><th>天气</th><th>温度</th><th>湿度</th><th>风力</th><th>打球</th>
              <th v-if="rules.length > 0">预测</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(example, idx) in data" :key="idx"
              :class="{ 'rl-row-selected': selectedExample === idx }"
              @click="toggleExample(idx)"
            >
              <td class="rl-td-muted">{{ idx + 1 }}</td>
              <td>{{ example.天气 }}</td>
              <td>{{ example.温度 }}</td>
              <td>{{ example.湿度 }}</td>
              <td>{{ example.风力 }}</td>
              <td>
                <span :class="['rl-badge', example.打球 === '是' ? 'rl-badge--green' : 'rl-badge--red']">
                  {{ example.打球 }}
                </span>
              </td>
              <td v-if="rules.length > 0">
                <span
                  :class="['rl-badge', getApplicableRule(example)?.conclusion === example.打球 ? 'rl-badge--green' : 'rl-badge--red']"
                >
                  {{ getApplicableRule(example)?.conclusion || '?' }}
                  {{ getApplicableRule(example)?.conclusion === example.打球 ? '✓' : '✗' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedExample !== null && rules.length > 0" class="rl-applied-rule">
        <div class="rl-applied-title">应用于样本 {{ selectedExample + 1 }} 的规则：</div>
        <div class="rl-rule-body">
          <template v-if="getApplicableRule(data[selectedExample])?.conditions?.length">
            <span class="rl-kw-if">IF</span>
            <template v-for="(cond, ci) in getApplicableRule(data[selectedExample])!.conditions" :key="ci">
              <span v-if="ci > 0" class="rl-kw-and"> AND </span>
              <span class="rl-feat">{{ cond.feature }}</span>
              <span> = </span>
              <span class="rl-val">{{ cond.value }}</span>
            </template>
            <br />
            <span class="rl-kw-then">THEN</span>
            <span :class="['rl-conclusion', getApplicableRule(data[selectedExample])!.conclusion === '是' ? 'rl-c-green' : 'rl-c-red']">
              打球 = {{ getApplicableRule(data[selectedExample])!.conclusion }}
            </span>
          </template>
          <template v-else>
            <span class="rl-kw-then">默认规则</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rl-wrapper { display: flex; flex-direction: column; gap: 16px; }
.rl-btn-row { display: flex; gap: 10px; }
.rl-btn {
  padding: 10px 20px; border: none; border-radius: 8px;
  font-weight: 700; font-size: 0.95em; cursor: pointer; transition: opacity 0.2s;
}
.rl-btn--primary { background: var(--vp-c-brand-1); color: #fff; }
.rl-btn:hover { opacity: 0.85; }
.rl-rules-card, .rl-table-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
}
.rl-section-title { font-size: 1.05em; font-weight: 700; color: var(--vp-c-text-1); margin-bottom: 12px; }
.rl-rules-list { display: flex; flex-direction: column; gap: 10px; }
.rl-rule {
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 10px; padding: 14px; transition: border-color 0.2s;
}
.rl-rule:hover { border-color: var(--vp-c-brand-1); }
.rl-rule--default { border-color: #eab308; }
.rl-rule-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rl-rule-icon { font-size: 1.3em; }
.rl-rule-name { font-size: 0.9em; font-weight: 700; color: var(--vp-c-text-1); }
.rl-rule-body { font-family: monospace; font-size: 0.85em; color: var(--vp-c-text-2); }
.rl-kw-if { color: #eab308; font-weight: 700; }
.rl-kw-and { color: #a855f7; font-weight: 700; }
.rl-kw-then { color: #a855f7; font-weight: 700; }
.rl-feat { color: var(--vp-c-brand-1); }
.rl-val { color: var(--vp-c-text-1); font-weight: 700; }
.rl-conclusion { font-weight: 700; }
.rl-c-green { color: #10b981; }
.rl-c-red { color: #ef4444; }
.rl-c-brand { color: var(--vp-c-brand-1); }
.rl-rule-footer {
  margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--vp-c-divider);
  display: flex; justify-content: space-between; font-size: 0.75em; color: var(--vp-c-text-2);
}
.rl-table-scroll { overflow-x: auto; }
.rl-table { width: 100%; font-size: 0.85em; border-collapse: collapse; }
.rl-table th {
  text-align: left; padding: 8px 10px; font-weight: 700;
  color: var(--vp-c-text-2); border-bottom: 2px solid var(--vp-c-divider);
}
.rl-table td {
  padding: 8px 10px; color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
}
.rl-table tr { cursor: pointer; transition: background 0.15s; }
.rl-table tr:hover { background: var(--vp-c-bg); }
.rl-row-selected { background: rgba(var(--vp-c-brand-1), 0.06) !important; }
.rl-td-muted { color: var(--vp-c-text-3); }
.rl-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 0.8em; font-weight: 700;
}
.rl-badge--green { background: rgba(16,185,129,0.15); color: #10b981; }
.rl-badge--red { background: rgba(239,68,68,0.15); color: #ef4444; }
.rl-applied-rule {
  margin-top: 14px; padding: 14px; border-radius: 10px;
  background: rgba(var(--vp-c-brand-1), 0.04);
  border: 1px solid var(--vp-c-brand-1);
}
.rl-applied-title { font-size: 0.85em; font-weight: 700; color: var(--vp-c-brand-1); margin-bottom: 8px; }
</style>
