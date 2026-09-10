import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '机器学习交互式学习',
  description: '基于周志华《机器学习》教材的交互式学习平台',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  markdown: {
    math: true,
  },

  vite: {
    ssr: {
      noExternal: [
        'd3',
        'd3-array', 'd3-axis', 'd3-brush', 'd3-chord', 'd3-color',
        'd3-contour', 'd3-delaunay', 'd3-dispatch', 'd3-drag', 'd3-dsv',
        'd3-ease', 'd3-fetch', 'd3-force', 'd3-format', 'd3-geo',
        'd3-hierarchy', 'd3-interpolate', 'd3-path', 'd3-polygon',
        'd3-quadtree', 'd3-random', 'd3-scale', 'd3-scale-chromatic',
        'd3-selection', 'd3-shape', 'd3-time', 'd3-time-format',
        'd3-timer', 'd3-transition', 'd3-zoom',
        'three',
        'internmap', 'delaunator', 'robust-predicates',
      ],
    },
  },

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: '机器学习交互式学习',

    nav: [
      { text: '首页', link: '/' },
      { text: '开始学习', link: '/chapter-02/' },
    ],

    sidebar: [
      {
        text: '基础篇',
        items: [
          { text: '第2章 模型评估与选择', link: '/chapter-02/' },
          { text: '第3章 线性模型', link: '/chapter-03/' },
        ],
      },
      {
        text: '经典算法',
        items: [
          { text: '第4章 决策树', link: '/chapter-04/' },
          { text: '第5章 神经网络', link: '/chapter-05/' },
          { text: '第6章 支持向量机', link: '/chapter-06/' },
          { text: '第7章 贝叶斯分类器', link: '/chapter-07/' },
          { text: '第8章 集成学习', link: '/chapter-08/' },
        ],
      },
      {
        text: '进阶主题',
        items: [
          { text: '第9章 聚类', link: '/chapter-09/' },
          { text: '第10章 降维与度量学习', link: '/chapter-10/' },
          { text: '第11章 特征选择与稀疏学习', link: '/chapter-11/' },
          { text: '第12章 计算学习理论', link: '/chapter-12/' },
        ],
      },
      {
        text: '前沿方向',
        items: [
          { text: '第13章 半监督学习', link: '/chapter-13/' },
          { text: '第14章 概率图模型', link: '/chapter-14/' },
          { text: '第15章 规则学习', link: '/chapter-15/' },
          { text: '第16章 强化学习', link: '/chapter-16/' },
        ],
      },
    ],

    outline: {
      level: [2, 3],
      label: '目录',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除',
            footer: { selectText: '选择', navigateText: '导航', closeText: '关闭' },
          },
        },
      },
    },

    docFooter: {
      prev: '上一章',
      next: '下一章',
    },

    lastUpdated: {
      text: '最后更新',
    },

    footer: {
      message: '基于周志华《机器学习》教材',
      copyright: 'MIT License',
    },
  },
})
