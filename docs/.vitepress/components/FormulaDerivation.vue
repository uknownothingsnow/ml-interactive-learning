<script setup lang="ts">
import { ref } from 'vue'

const currentStep = ref(0)
const isAnimating = ref(false)

const steps = [
  { label: '混淆矩阵', description: '展示四个核心元素' },
  { label: 'TPR 公式', description: '真正例率推导' },
  { label: 'FPR 公式', description: '假正例率推导' },
  { label: '关键洞察', description: 'ROC 曲线的含义' },
]

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    isAnimating.value = true
    currentStep.value++
    setTimeout(() => { isAnimating.value = false }, 500)
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    isAnimating.value = true
    currentStep.value--
    setTimeout(() => { isAnimating.value = false }, 500)
  }
}

function reset() {
  currentStep.value = 0
  isAnimating.value = false
}

function playAll() {
  currentStep.value = 0
  isAnimating.value = true
  const interval = setInterval(() => {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++
    } else {
      clearInterval(interval)
      isAnimating.value = false
    }
  }, 1500)
}
</script>

<template>
  <div class="derivation-container">
    <h3 class="derivation-title">ROC 曲线核心指标推导</h3>
    <p class="derivation-subtitle">理解 TPR 和 FPR 的数学定义</p>

    <!-- 控制按钮 -->
    <div class="controls">
      <button @click="playAll" :disabled="isAnimating" class="btn btn-primary">
        {{ isAnimating ? '播放中...' : '▶ 自动播放' }}
      </button>
      <button @click="prevStep" :disabled="currentStep === 0" class="btn">← 上一步</button>
      <button @click="nextStep" :disabled="currentStep === steps.length - 1" class="btn">下一步 →</button>
      <button @click="reset" class="btn">重置</button>
    </div>

    <!-- 进度指示器 -->
    <div class="progress-dots">
      <span
        v-for="(step, i) in steps"
        :key="i"
        class="dot"
        :class="{ active: i <= currentStep }"
        :title="step.label"
      />
    </div>

    <!-- 步骤 0：混淆矩阵 -->
    <Transition name="fade">
      <div v-if="currentStep >= 0" class="step-section">
        <div class="matrix-grid">
          <div class="matrix-cell tp">
            <div class="cell-value">TP</div>
            <div class="cell-label">真正例</div>
            <div class="cell-sublabel">True Positive</div>
          </div>
          <div class="matrix-cell fp">
            <div class="cell-value">FP</div>
            <div class="cell-label">假正例</div>
            <div class="cell-sublabel">False Positive</div>
          </div>
          <div class="matrix-cell fn">
            <div class="cell-value">FN</div>
            <div class="cell-label">假负例</div>
            <div class="cell-sublabel">False Negative</div>
          </div>
          <div class="matrix-cell tn">
            <div class="cell-value">TN</div>
            <div class="cell-label">真负例</div>
            <div class="cell-sublabel">True Negative</div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 步骤 1：TPR 公式 -->
    <Transition name="fade">
      <div v-if="currentStep >= 1" class="formula-section">
        <div class="formula-row">
          <span class="formula-label">TPR</span>
          <span>=</span>
          <div class="formula-fraction">
            <span class="formula-numerator green">TP</span>
            <div class="fraction-line" />
            <span>
              <span style="color: #16a34a;">TP</span> + <span style="color: #dc2626;">FN</span>
            </span>
          </div>
        </div>
        <div class="formula-explanation">
          真正例率 (True Positive Rate) = 正确识别的正例 / 全部正例
        </div>
        <div class="formula-alias">
          又称为 <strong>召回率 (Recall)</strong> 或 <strong>灵敏度 (Sensitivity)</strong>
        </div>
      </div>
    </Transition>

    <!-- 步骤 2：FPR 公式 -->
    <Transition name="fade">
      <div v-if="currentStep >= 2" class="formula-section">
        <div class="formula-row">
          <span class="formula-label fpr">FPR</span>
          <span>=</span>
          <div class="formula-fraction">
            <span class="formula-numerator red">FP</span>
            <div class="fraction-line" />
            <span>
              <span style="color: #dc2626;">FP</span> + <span style="color: #16a34a;">TN</span>
            </span>
          </div>
        </div>
        <div class="formula-explanation">
          假正例率 (False Positive Rate) = 错误识别的负例 / 全部负例
        </div>
        <div class="formula-alias" style="color: #eab308;">
          又称为 <strong>误报率</strong>
        </div>
      </div>
    </Transition>

    <!-- 步骤 3：关键洞察 -->
    <Transition name="fade">
      <div v-if="currentStep >= 3" class="insight-box">
        <div class="insight-title">🎯 关键洞察</div>
        <ul class="insight-list">
          <li><span style="color: #16a34a;">✓</span> <strong>理想分类器</strong>：TPR → 1（尽可能捕获所有正例）</li>
          <li><span style="color: #16a34a;">✓</span> <strong>理想分类器</strong>：FPR → 0（尽可能避免误报）</li>
          <li><span style="color: var(--vp-c-brand-1);">→</span> ROC 曲线绘制了不同阈值下 <strong>(FPR, TPR)</strong> 的变化轨迹</li>
          <li><span style="color: #eab308;">⚖</span> 调整阈值是在 <strong>召回率</strong> 和 <strong>误报率</strong> 之间做权衡</li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.derivation-container {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 24px;
  margin: 1.5em 0;
}

.derivation-title {
  text-align: center;
  font-size: 1.3em;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 0 0 4px;
}

.derivation-subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
  font-size: 0.9em;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
}

.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-border);
  transition: background 0.3s;
}

.dot.active {
  background: var(--vp-c-brand-1);
}

.step-section {
  margin: 16px 0;
}

/* 混淆矩阵 */
.matrix-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 380px;
  margin: 0 auto;
}

.matrix-cell {
  padding: 20px 16px;
  border-radius: 10px;
  text-align: center;
  border: 2px solid var(--vp-c-border);
  transition: all 0.3s;
}

.matrix-cell.tp,
.matrix-cell.tn {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.3);
}

.matrix-cell.fp,
.matrix-cell.fn {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.cell-value {
  font-size: 1.8em;
  font-weight: 700;
}

.tp .cell-value, .tn .cell-value { color: #16a34a; }
.fp .cell-value, .fn .cell-value { color: #dc2626; }

:global(.dark) .tp .cell-value,
:global(.dark) .tn .cell-value { color: #4ade80; }
:global(.dark) .fp .cell-value,
:global(.dark) .fn .cell-value { color: #f87171; }

.cell-label {
  font-weight: 600;
  font-size: 0.95em;
  color: var(--vp-c-text-1);
  margin-top: 4px;
}

.cell-sublabel {
  font-size: 0.75em;
  color: var(--vp-c-text-3);
  margin-top: 2px;
}

/* 公式区域 */
.formula-section {
  background: var(--vp-c-bg);
  border-radius: 10px;
  padding: 20px;
  margin: 16px 0;
  text-align: center;
}

.formula-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 1.6em;
  font-weight: 700;
  margin-bottom: 12px;
}

.formula-label { color: var(--vp-c-brand-1); }
.formula-label.fpr { color: #eab308; }
.formula-numerator.green { color: #16a34a; }
.formula-numerator.red { color: #dc2626; }

:global(.dark) .formula-numerator.green { color: #4ade80; }
:global(.dark) .formula-numerator.red { color: #f87171; }

.formula-fraction {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fraction-line {
  width: 100px;
  height: 2px;
  background: var(--vp-c-text-1);
  margin: 4px 0;
}

.formula-explanation {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  margin-top: 8px;
}

.formula-alias {
  font-size: 0.85em;
  color: var(--vp-c-brand-1);
  margin-top: 4px;
}

/* 关键洞察 */
.insight-box {
  background: var(--vp-c-brand-soft);
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 10px;
  padding: 20px;
  margin-top: 16px;
}

.insight-title {
  font-size: 1.1em;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  text-align: center;
  margin-bottom: 12px;
}

.insight-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.insight-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
