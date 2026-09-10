---
title: '第12章 计算学习理论'
description: 'PAC学习、样本复杂度、VC维、Rademacher复杂度'
prev:
  text: '第11章 特征选择与稀疏学习'
  link: '/chapter-11/'
next:
  text: '第13章 半监督学习'
  link: '/chapter-13/'
---

# 第12章 计算学习理论

<div class="learning-objectives">

### 🎯 学习目标

- 理解PAC学习框架的基本概念
- 掌握VC维的定义和意义
- 了解样本复杂度和计算复杂度
- 理解泛化误差界和模型复杂度的关系

</div>

## 12.1 基础知识

::: tip 什么是计算学习理论
**计算学习理论（Computational Learning Theory）** 研究机器学习的理论基础，试图回答以下关键问题：

- 在什么条件下学习是可能的？
- 需要多少训练样本才能学到好的模型？
- 学习算法的计算复杂度是多少？
- 如何刻画学习任务的难度？

计算学习理论为机器学习提供了严格的数学框架，帮助我们理解学习算法的本质和局限性。
:::

::: info PAC学习框架
**PAC（Probably Approximately Correct）学习** 是Valiant于1984年提出的经典学习框架。

**PAC可学习定义**

对于任意 ε > 0（误差）和 δ > 0（置信度），存在学习算法 $\mathcal{L}$ 和多项式函数 poly(·,·,·,·)，使得对于任意分布 $\mathcal{D}$ 和目标概念 c，当样本数量满足：

$$m \geq \text{poly}(1/\varepsilon, 1/\delta, \text{size}(c), \text{size}(x))$$

算法 $\mathcal{L}$ 能够以至少 $1-\delta$ 的概率学习到假设 h，使得误差 $\text{error}(h) \leq \varepsilon$
:::

::: tip 💡 理解PAC
- **Probably**（概率上）：以高概率（$1-\delta$）成功
- **Approximately**（近似地）：误差不超过 ε
- **Correct**（正确）：学到的假设近似正确
:::

## 12.2 PAC学习

::: tip 样本复杂度
**样本复杂度（Sample Complexity）** 是指学习算法达到预定精度所需的最少样本数量，是PAC学习理论的核心概念。

**有限假设空间的样本复杂度**

对于有限假设空间 $|\mathcal{H}| < \infty$，要保证以 $1-\delta$ 的概率找到误差不超过 ε 的假设，样本数量需满足：

$$m \geq \frac{1}{\varepsilon} \left( \ln|\mathcal{H}| + \ln\frac{1}{\delta} \right)$$

这个界告诉我们：假设空间越大，需要的样本越多；要求的精度越高（ε越小）或置信度越高（δ越小），需要的样本也越多。
:::

::: info 不可知PAC学习
标准PAC学习假设目标概念 c 存在于假设空间 $\mathcal{H}$ 中（**可实现假设**）。**不可知PAC学习（Agnostic PAC Learning）** 放宽了这一假设，允许 $\mathcal{H}$ 中不存在完美的假设。

**不可知PAC可学习定义**

算法输出的假设 h 满足：

$$\text{error}(h) \leq \min_{h' \in \mathcal{H}} \text{error}(h') + \varepsilon$$

即学到的假设 h 的误差与假设空间中最优假设的误差相差不超过 ε。

不可知PAC学习更贴近实际情况，因为真实世界中目标概念往往不在我们的假设空间中。
:::

## 12.3 有限假设空间

::: tip 一致性学习算法
**一致性（Consistent）学习算法** 输出的假设在训练集上零错误，即能完美拟合训练数据。

**Hoeffding不等式**

对于任意假设 h，其训练误差和泛化误差的差异满足：

$$P(|\text{error}(h) - \hat{\text{error}}(h)| > \varepsilon) \leq 2\exp(-2m\varepsilon^2)$$

其中 $\hat{\text{error}}(h)$ 是训练误差，$\text{error}(h)$ 是泛化误差，m 是样本数量。

**Union Bound**

对假设空间 $\mathcal{H}$ 中所有假设应用Hoeffding不等式，利用Union Bound：

$$P(\exists h \in \mathcal{H}: |\text{error}(h) - \hat{\text{error}}(h)| > \varepsilon) \leq 2|\mathcal{H}|\exp(-2m\varepsilon^2)$$

令右侧 $\leq \delta$，解出样本数量 $m \geq \frac{1}{2\varepsilon^2}(\ln|\mathcal{H}| + \ln(2/\delta))$
:::

::: info 版本空间
**版本空间（Version Space）** 是假设空间 $\mathcal{H}$ 中所有与训练集一致的假设的集合。

**候选消除算法**

候选消除（Candidate Elimination）算法维护版本空间，通过训练样本逐步缩小版本空间：

1. 初始化：版本空间 = 整个假设空间 $\mathcal{H}$
2. 对于每个训练样本 (x, y)：从版本空间中移除所有与 (x, y) 不一致的假设
3. 重复直到处理完所有训练样本
4. 最终版本空间中的任意假设都是一致的

当版本空间只剩一个假设时，学习任务完成。实际中版本空间可能包含多个假设，需要选择策略（如投票）。
:::

## 12.4 VC维

::: tip VC维定义
**VC维（Vapnik-Chervonenkis Dimension）** 是衡量假设空间复杂度的重要指标，适用于无限假设空间。

**打散（Shatter）**

如果假设空间 $\mathcal{H}$ 能够实现数据集 D 上所有可能的标记（$2^m$ 种），则称 $\mathcal{H}$ 能够**打散** D。

**VC维** 是 $\mathcal{H}$ 能打散的最大数据集大小：

$$\text{VC}(\mathcal{H}) = \max\{m: \mathcal{H} \text{ 能打散某个大小为 m 的数据集}\}$$
:::

::: info 经典例子：线性分类器的VC维
- **二维平面上的线性分类器**：VC维 = 3。可以打散任意3个点（不共线），但无法打散某些4个点的配置（如XOR）
- **d维空间的线性分类器**：VC维 = d + 1。可以打散 d+1 个一般位置的点
:::

::: tip 💡 VC维的意义
VC维越大，假设空间的表达能力越强，但也越容易过拟合。VC维为学习算法的泛化能力提供了理论保证。
:::

通过放置点和调整标签，理解线性分类器的VC维（能打散3点，不能打散4点）：

<VCDimensionDemo />

::: info VC维与样本复杂度
VC维将样本复杂度的分析扩展到无限假设空间。

**基于VC维的样本复杂度界**

对于VC维为 d 的假设空间，要以 $1-\delta$ 的概率保证误差不超过 ε，样本数量需满足：

$$m = O\left(\frac{d}{\varepsilon} \cdot \log\frac{1}{\varepsilon} + \frac{1}{\varepsilon} \cdot \log\frac{1}{\delta}\right)$$

这个界说明：模型越复杂（d越大），需要的样本越多才能保证泛化性能。

**结构风险最小化（SRM）**

SRM原则：在训练误差和模型复杂度之间权衡，选择使**结构风险**最小的模型：

$$\text{Structural Risk} = \text{Training Error} + \text{Complexity Penalty}$$

这与正则化、奥卡姆剃刀原则的思想一致。
:::

## 12.5 Rademacher复杂度

::: tip Rademacher复杂度
**Rademacher复杂度** 是另一种衡量假设空间复杂度的方法，相比VC维更加精细，能考虑数据分布的影响。

**经验Rademacher复杂度**

给定样本集 $S = \{x_1, \ldots, x_m\}$，假设空间 $\mathcal{H}$ 的经验Rademacher复杂度定义为：

$$\hat{R}_S(\mathcal{H}) = \mathbb{E}_{\sigma}\left[\sup_{h \in \mathcal{H}} \frac{1}{m} \sum_i \sigma_i h(x_i)\right]$$

其中 $\sigma_i$ 是独立的Rademacher随机变量（以0.5概率取+1或-1）。
:::

::: tip 💡 直观理解
Rademacher复杂度衡量假设空间 $\mathcal{H}$ 拟合**随机噪声**的能力。如果 $\mathcal{H}$ 能很好地拟合随机标记，说明它很容易过拟合，复杂度高。
:::

::: info 基于Rademacher复杂度的泛化界
以至少 $1-\delta$ 的概率，对所有 $h \in \mathcal{H}$：

$$\text{error}(h) \leq \hat{\text{error}}(h) + 2R_m(\mathcal{H}) + \sqrt{\frac{\ln(1/\delta)}{2m}}$$

其中 $R_m(\mathcal{H})$ 是假设空间的Rademacher复杂度。

Rademacher复杂度与VC维相比：更加数据依赖，能更紧地刻画泛化能力，但计算更复杂。
:::

## 12.6 稳定性

::: tip 算法稳定性
**稳定性（Stability）** 从算法角度分析泛化能力，衡量训练集的微小变化对学习结果的影响。

**均匀稳定性**

学习算法 $\mathcal{L}$ 具有 **β-均匀稳定性**，如果对于任意两个只差一个样本的训练集 S 和 S'：

$$\sup_z |\ell(\mathcal{L}_S, z) - \ell(\mathcal{L}_{S'}, z)| \leq \beta$$

其中 $\ell(h, z)$ 是假设 h 在样本 z 上的损失。

**稳定性与泛化**

如果算法 $\mathcal{L}$ 是 β-均匀稳定的，则以至少 $1-\delta$ 的概率：

$$\text{error}(\mathcal{L}_S) \leq \hat{\text{error}}(\mathcal{L}_S) + 2\beta + (4m\beta + 1)\sqrt{\frac{\ln(1/\delta)}{2m}}$$
:::

::: tip 💡 提高稳定性的方法
- **正则化**：L2正则化可以提高算法稳定性
- **集成学习**：Bagging等方法通过平均降低方差，提高稳定性
- **Early Stopping**：限制训练迭代次数

**稳定性视角的优势**：直接分析算法本身，不依赖假设空间结构；能够解释为什么正则化、集成学习等技术能提高泛化能力。
:::
