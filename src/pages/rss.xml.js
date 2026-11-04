import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');

  return rss({
    title: '我的个人博客',
    description: '这是我的个人博客 RSS 订阅源',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id || post.slug}/`,
    })),
    // 引入一套精美的开源浏览器端排版样式表 (XSL)
    stylesheet: 'https://cdn.jsdelivr.net/npm/bootstrap-rss@1.0.1/rss.xsl',
    customData: `<language>zh-cn</language>`,
  });
}
