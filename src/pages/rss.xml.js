import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');

  return rss({
    title: '我的個人博客',
    description: '這是我的個人博客 RSS 訂閱源',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id || post.slug}/`,
    })),
    // 內建簡潔美觀的瀏覽器渲染排版
    customData: `
      <language>zh-cn</language>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; color: #111; }
        p { color: #666; }
        item, entry { display: block; background: #f9f9f9; padding: 15px 20px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #eee; }
        title { display: block; font-size: 1.2rem; font-weight: bold; color: #0066cc; margin-bottom: 5px; }
        pubdate, updated { display: block; font-size: 0.85rem; color: #888; margin-bottom: 8px; }
        description { display: block; color: #444; }
        link { display: inline-block; margin-top: 8px; color: #0066cc; word-break: break-all; }
      </style>
    `,
  });
}
