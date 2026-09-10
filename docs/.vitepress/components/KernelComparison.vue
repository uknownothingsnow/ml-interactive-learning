<script setup lang="ts">
import { ref, computed } from 'vue'

type KernelType = 'linear' | 'polynomial' | 'rbf' | 'sigmoid'

interface KernelInfo {
  displayName: string
  formula: string
  description: string
  parameters: string
  advantages: string[]
  disadvantages: string[]
  useCase: string
}

const kernelInfo: Record<KernelType, KernelInfo> = {
  linear: {
    displayName: '线性核',
    formula: 'K(x, z) = x · z',
    description: '最简单的核函数，对应线性SVM，适用于线性可分问题',
    parameters: '无参数',
    advantages: ['计算速度最快', '模型可解释性强', '适合高维稀疏数据（如文本）', '不容易过拟合'],
    disadvantages: ['只能处理线性可分问题', '表达能力有限', '对非线性数据效果差'],
    useCase: '文本分类、线性可分的二分类问题'
  },
  polynomial: {
    displayName: '多项式核',
    formula: 'K(x, z) = (γ·x·z + r)^d',
    description: '可以处理非线性问题，相当于在高维空间中构造多项式特征',
    parameters: 'd: 多项式次数, γ: 系数, r: 常数项',
    advantages: ['可以捕捉特征间的交互作用', '适合特征维度不是很高的数据', '通过调整d可以控制复杂度'],
    disadvantages: ['参数较多，调参困难', '高次多项式容易过拟合', '计算复杂度随d增长快'],
    useCase: '图像识别、自然语言处理中的特征交互建模'
  },
  rbf: {
    displayName: 'RBF核（高斯核）',
    formula: 'K(x, z) = exp(-γ·||x-z||²)',
    description: '最常用的核函数，可以将数据映射到无穷维空间',
    parameters: 'γ: 核宽度参数，控制影响范围',
    advantages: ['可以处理任意非线性问题', '只有一个超参数γ', '适用于大多数情况', '决策边界平滑'],
    disadvantages: ['γ选择很关键，需要仔细调参', 'γ过大导致过拟合，过小导致欠拟合', '计算开销相对较大'],
    useCase: '通用分类问题、模式识别、生物信息学'
  },
  sigmoid: {
    displayName: 'Sigmoid核',
    formula: 'K(x, z) = tanh(γ·x·z + r)',
    description: '源于神经网络，但在SVM中不总是正定的',
    parameters: 'γ: 斜率参数, r: 偏移参数',
    advantages: ['类似于神经网络的激活函数', '可以近似某些神经网络'],
    disadvantages: ['不总是正定的，可能导致训练不收敛', '实际应用较少', '效果通常不如RBF核'],
    useCase: '神经网络相关的研究、某些特定的信号处理任务'
  }
}

const selectedKernel = ref<KernelType>('rbf')
const current = computed(() => kernelInfo[selectedKernel.value])
const kernelKeys: KernelType[] = ['linear', 'polynomial', 'rbf', 'sigmoid']

const tableData = [
  { name: '线性核', cls: 'kc-cyan', complexity: '低', complexCls: 'kc-green', params: '0', nonlinear: '无', nlCls: 'kc-red', stars: '⭐⭐⭐' },
  { name: '多项式核', cls: 'kc-purple', complexity: '中', complexCls: 'kc-amber', params: '3', nonlinear: '中等', nlCls: 'kc-amber', stars: '⭐⭐' },
  { name: 'RBF核', cls: 'kc-blue', complexity: '中', complexCls: 'kc-amber', params: '1', nonlinear: '强', nlCls: 'kc-green', stars: '⭐⭐⭐⭐⭐' },
  { name: 'Sigmoid核', cls: 'kc-orange', complexity: '中', complexCls: 'kc-amber', params: '2', nonlinear: '中等', nlCls: 'kc-amber', stars: '⭐' },
]
</script>

<template>
  <div class="kc-demo">
    <!-- Kernel selector buttons -->
    <div class="kc-selector">
      <button
        v-for="key in kernelKeys" :key="key"
        :class="['kc-sel-btn', selectedKernel === key ? 'kc-sel-active' : '']"
        @click="selectedKernel = key"
      >
        <div class="kc-sel-name">{{ kernelInfo[key].displayName }}</div>
        <div class="kc-sel-formula">{{ kernelInfo[key].formula }}</div>
      </button>
    </div>

    <!-- Detail card -->
    <div class="kc-detail">
      <h3 class="kc-detail-title">{{ current.displayName }}</h3>

      <div class="kc-formula-box">
        <div class="kc-formula-label">核函数公式:</div>
        <div class="kc-formula-text">{{ current.formula }}</div>
      </div>

      <p class="kc-desc">{{ current.description }}</p>

      <div class="kc-param-box">
        <div class="kc-param-label">参数说明:</div>
        <div class="kc-param-text">{{ current.parameters }}</div>
      </div>

      <div class="kc-pros-cons">
        <div class="kc-pros">
          <h4 class="kc-pc-title kc-green">✅ 优点</h4>
          <ul class="kc-pc-list">
            <li v-for="(adv, i) in current.advantages" :key="i">
              <span class="kc-bullet kc-green">•</span> {{ adv }}
            </li>
          </ul>
        </div>
        <div class="kc-cons">
          <h4 class="kc-pc-title kc-red">⚠️ 缺点</h4>
          <ul class="kc-pc-list">
            <li v-for="(dis, i) in current.disadvantages" :key="i">
              <span class="kc-bullet kc-red">•</span> {{ dis }}
            </li>
          </ul>
        </div>
      </div>

      <div class="kc-usecase">
        <div class="kc-usecase-label">典型应用场景:</div>
        <div class="kc-usecase-text">{{ current.useCase }}</div>
      </div>
    </div>

    <!-- Comparison table -->
    <div class="kc-table-wrap">
      <table class="kc-table">
        <thead>
          <tr>
            <th>核函数</th><th>计算复杂度</th><th>参数数量</th><th>非线性能力</th><th>推荐度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in tableData" :key="i">
            <td :class="['kc-bold', row.cls]">{{ row.name }}</td>
            <td :class="row.complexCls">{{ row.complexity }}</td>
            <td>{{ row.params }}</td>
            <td :class="row.nlCls">{{ row.nonlinear }}</td>
            <td>{{ row.stars }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tips -->
    <div class="kc-tips">
      <div class="kc-tips-icon">💡</div>
      <div class="kc-tips-body">
        <h5 class="kc-tips-title">核函数选择建议</h5>
        <ul class="kc-tips-list">
          <li><strong>首选RBF核</strong>：适用于大多数情况，只需调整一个参数γ</li>
          <li><strong>高维稀疏数据</strong>：使用线性核（如文本分类）</li>
          <li><strong>小数据集</strong>：可以尝试多项式核</li>
          <li><strong>先简单后复杂</strong>：从线性核开始，再尝试RBF核</li>
          <li><strong>交叉验证</strong>：通过网格搜索找到最佳参数</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kc-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.kc-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
@media (min-width: 768px) { .kc-selector { grid-template-columns: repeat(4, 1fr); } }
.kc-sel-btn {
  padding: 12px; border-radius: 10px; border: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg); cursor: pointer; text-align: left; transition: all 0.2s;
}
.kc-sel-btn:hover { border-color: var(--vp-c-brand-1); }
.kc-sel-active { border-color: var(--vp-c-brand-1); background: rgba(59,130,246,0.08); transform: scale(1.03); }
.kc-sel-name { font-weight: 700; color: var(--vp-c-text-1); font-size: 13px; }
.kc-sel-formula { font-size: 11px; color: var(--vp-c-text-2); font-family: monospace; margin-top: 4px; }
.kc-detail {
  background: var(--vp-c-bg); border: 2px solid rgba(59,130,246,0.3);
  border-radius: 12px; padding: 24px; margin-bottom: 20px;
}
.kc-detail-title { font-size: 20px; font-weight: 700; color: #3b82f6; margin: 0 0 16px 0; }
.kc-formula-box, .kc-param-box {
  background: var(--vp-c-bg-soft); border-radius: 8px; padding: 12px; margin-bottom: 12px;
}
.kc-formula-label, .kc-param-label { font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.kc-formula-text { font-family: monospace; font-size: 16px; color: var(--vp-c-text-1); }
.kc-param-label { color: #d97706; font-weight: 700; }
.kc-param-text { font-size: 14px; color: var(--vp-c-text-1); }
.kc-desc { color: var(--vp-c-text-2); margin-bottom: 12px; font-size: 14px; }
.kc-pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
@media (max-width: 640px) { .kc-pros-cons { grid-template-columns: 1fr; } }
.kc-pros, .kc-cons { background: var(--vp-c-bg-soft); border-radius: 8px; padding: 12px; }
.kc-pc-title { font-size: 13px; font-weight: 700; margin: 0 0 8px 0; }
.kc-pc-list { list-style: none; padding: 0; margin: 0; font-size: 13px; color: var(--vp-c-text-2); }
.kc-pc-list li { margin-bottom: 4px; }
.kc-bullet { margin-right: 4px; }
.kc-green { color: #16a34a; }
.kc-red { color: #dc2626; }
.kc-blue { color: #3b82f6; }
.kc-purple { color: #8b5cf6; }
.kc-cyan { color: #06b6d4; }
.kc-orange { color: #ea580c; }
.kc-amber { color: #d97706; }
.kc-bold { font-weight: 700; }
:global(.dark) .kc-green { color: #4ade80; }
:global(.dark) .kc-red { color: #f87171; }
.kc-usecase {
  background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.3);
  border-radius: 8px; padding: 12px;
}
.kc-usecase-label { font-size: 13px; font-weight: 700; color: #3b82f6; margin-bottom: 4px; }
.kc-usecase-text { font-size: 14px; color: var(--vp-c-text-1); }
.kc-table-wrap {
  overflow-x: auto; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 12px; margin-bottom: 20px;
}
.kc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.kc-table th {
  padding: 10px 14px; text-align: left; font-weight: 700;
  color: var(--vp-c-text-1); background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.kc-table td {
  padding: 10px 14px; color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}
.kc-table tr:last-child td { border-bottom: none; }
.kc-table tr:hover td { background: var(--vp-c-bg-soft); }
.kc-tips {
  display: flex; gap: 12px; padding: 16px; border-radius: 12px;
  background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3);
}
.kc-tips-icon { font-size: 24px; flex-shrink: 0; }
.kc-tips-title { font-size: 14px; font-weight: 700; color: #d97706; margin: 0 0 8px 0; }
.kc-tips-list { list-style: none; padding: 0; margin: 0; font-size: 13px; color: var(--vp-c-text-2); }
.kc-tips-list li { margin-bottom: 4px; }
.kc-tips-list strong { color: var(--vp-c-text-1); }
</style>
