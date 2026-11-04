import { getCollection } from 'astro:content';

export async function GET() {
	const posts = await getCollection('blog');
	const data = posts.map((p: any) => ({
		title: p.data.title,
		description: p.data.description,
		category: p.data.category ?? '',
		tags: p.data.tags ?? [],
		date: p.data.pubDate.toISOString().slice(0, 10),
		url: `/blog/${p.slug ?? p.id}/`,
		text: String(p.body ?? '')
			.replace(/```[\s\S]*?```/g, ' ')
			.replace(/[#>*`|_\[\]()!]/g, ' ')
			.replace(/\s+/g, ' ')
			.slice(0, 6000),
	}));
	return new Response(JSON.stringify(data), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}
