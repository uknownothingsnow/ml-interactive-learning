---
title: '第2章 模型评估与选择'
description: '混淆矩阵、ROC曲线、AUC、偏差方差权衡'
next:
  text: '第3章 线性模型'
  link: '/chapter-03/'
---

# 第2章 模型评估与选择

<div class="learning-objectives">

### 🎯 学习目标

- 理解分类任务中的核心评估指标：准确率、精确率、召回率、F1分数
- 掌握混淆矩阵的构成及其各元素的含义
- 理解 ROC 曲线和 AUC 指标的原理与应用
- 认识阈值调整对模型性能的影响
- 了解偏差-方差分解的权衡关系

</div>

## 2.1 评估指标基础

::: tip 🎯 为什么需要评估指标？
在监督学习中，我们需要定量地评估模型的性能。不同的应用场景对模型有不同的要求：

- **医疗诊断**：更关注召回率（不能漏诊）
- **垃圾邮件过滤**：更关注精确率（不能误判正常邮件）
- **信用评估**：需要平衡准确率和公平性
:::

### 混淆矩阵 (Confusion Matrix)

混淆矩阵是理解分类器性能的基础工具，它展示了预测结果与真实标签的对应关系：

<div class="confusion-grid">
  <div class="confusion-cell correct">
    <div style="font-size: 1.5em;">TP</div>
    <div>真正例</div>
    <div style="font-size: 0.8em; opacity: 0.7;">正确预测为正</div>
  </div>
  <div class="confusion-cell incorrect">
    <div style="font-size: 1.5em;">FP</div>
    <div>假正例</div>
    <div style="font-size: 0.8em; opacity: 0.7;">错误预测为正</div>
  </div>
  <div class="confusion-cell incorrect">
    <div style="font-size: 1.5em;">FN</div>
    <div>假负例</div>
    <div style="font-size: 0.8em; opacity: 0.7;">错误预测为负</div>
  </div>
  <div class="confusion-cell correct">
    <div style="font-size: 1.5em;">TN</div>
    <div>真负例</div>
    <div style="font-size: 0.8em; opacity: 0.7;">正确预测为负</div>
  </div>
</div>

::: info 💡 提示
所有评估指标都基于混淆矩阵的这四个值计算得出。
:::

### 核心评估指标

基于混淆矩阵，我们可以定义以下指标：

$$\text{准确率 (Accuracy)} = \frac{TP + TN}{TP + FP + TN + FN}$$

$$\text{精确率 (Precision)} = \frac{TP}{TP + FP}$$

$$\text{召回率 (Recall)} = \frac{TP}{TP + FN}$$

$$\text{F1 分数} = \frac{2 \times \text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

### TPR 与 FPR

**真正例率 (True Positive Rate)**，又称召回率或灵敏度：

$$TPR = \frac{TP}{TP + FN}$$

表示所有正样本中，被正确分类的比例。

**假正例率 (False Positive Rate)**，又称误报率：

$$FPR = \frac{FP}{FP + TN}$$

表示所有负样本中，被错误分类为正的比例。

::: tip 🎯 关键洞察
- **理想分类器**：TPR → 1（捕获所有正例），FPR → 0（避免误报）
- ROC 曲线绘制了不同阈值下 (FPR, TPR) 的变化轨迹
- 调整阈值是在**召回率**和**误报率**之间做权衡
:::

### 公式推导动画

<FormulaDerivation />

## 2.2 ROC 曲线与 AUC

::: tip 📈 什么是 ROC 曲线？
**ROC (Receiver Operating Characteristic) 曲线** 是一种图形化工具，用于评估二分类模型在所有可能的分类阈值下的性能。

- **横轴：假正例率 (FPR)** — 所有负样本中被错误分类为正的比例，理想情况下应接近 0
- **纵轴：真正例率 (TPR)** — 所有正样本中被正确分类的比例，理想情况下应接近 1
:::

### AUC 的含义

**AUC (Area Under Curve)** 是 ROC 曲线下的面积，取值范围在 0 到 1 之间：

| AUC 范围 | 含义 |
|----------|------|
| AUC = 1.0 | 完美分类器，所有样本都被正确分类 |
| AUC = 0.9–1.0 | 优秀的分类器 |
| AUC = 0.7–0.9 | 良好的分类器 |
| AUC = 0.5 | 随机猜测的性能基线 |
| AUC < 0.5 | 比随机猜测还差（可能标签反了） |

### 交互式演示

拖动滑块调整分类阈值，观察 ROC 曲线上的操作点如何移动，以及各项指标如何变化。

<ROCCurveDemo />

## 2.3 偏差与方差

::: warning ⚖️ 偏差-方差权衡
模型的泛化误差可以分解为三个部分：
:::

**偏差 (Bias)**
: 模型预测的期望值与真实值之间的差距。高偏差导致**欠拟合**。

**方差 (Variance)**
: 模型在不同训练集上预测结果的变化程度。高方差导致**过拟合**。

**噪声 (Noise)**
: 数据本身的随机性，无法通过模型消除。

::: info 💡 关键洞察
降低偏差通常会增加方差，反之亦然。找到最佳平衡点是模型优化的核心目标。
:::

## 2.4 实践练习

::: details 💪 练习1：理解阈值调整
使用上方的 ROC 交互式演示：

1. 将阈值设为 0.2，观察混淆矩阵和评估指标
2. 将阈值设为 0.8，再次观察变化
3. 思考：什么情况下应该选择较低的阈值？什么情况下应该选择较高的阈值？
:::

::: details 💪 练习2：指标权衡
考虑以下场景，选择最合适的优化目标：

- **场景A：癌症筛查模型** — 应该优化召回率（TPR），避免漏诊，宁可多一些假阳性。
- **场景B：垃圾邮件过滤** — 应该优化精确率，避免将重要邮件标记为垃圾邮件。
- **场景C：欺诈检测** — 需要平衡召回率和精确率，可以使用 F1 分数作为综合指标。
:::

::: details 💡 练习3：解释 AUC
**思考题**：为什么 AUC 是一个好的综合性能指标？

**答案**：AUC 衡量了模型在所有可能的阈值下的平均性能，不依赖于特定阈值的选择。它表示随机选择一个正样本和一个负样本，模型给正样本打分更高的概率。AUC 对类别不平衡问题也相对鲁棒，是评估排序质量的好指标。
:::

## 📝 本章小结

::: tip 总结
- ✅ 混淆矩阵是理解分类性能的基础，包含 TP、FP、TN、FN 四个要素
- ✅ 不同应用场景需要关注不同�指标：准确率、精确率、召回率、F1分数
- ✅ ROC 曲线展示了模型在不同阈值下的性能权衡
- ✅ AUC 提供了一个与阈值无关的综合性能度量
- ✅ 偏差-方差权衡是模型选择和优化的核心考虑因素
:::
