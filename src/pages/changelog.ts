// 建站日志：新到旧排列
export type ChangeItem = {
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: ChangeItem[] = [
  {
    date: '2026-11-05',
    title: '写作仪表盘 · 小工具 · 专注模式',
    items: [
      '新增 /stats 写作数据页（字数、标签、写作日历）',
      '新增 /changelog 建站日志',
      '新增 /now 此刻状态，并在页脚展示',
      '新增 /tools 浏览器内小工具（哈希、时间戳、去重）',
      '文章页支持专注模式（隐藏导航与页脚）',
    ],
  },
  {
    date: '2026-11-04',
    title: '导航动效 · 下雪 · 深色模式完善',
    items: [
      '导航栏滑动胶囊点击动效',
      '主页下雪特效',
      '深色模式全局变量与各页面对比度修复',
    ],
  },
  {
    date: '2026-11',
    title: '站点上线',
    items: [
      '基于 Astro 搭建个人站',
      '博客、作品、关于、搜索、RSS、评论',
    ],
  },
];
