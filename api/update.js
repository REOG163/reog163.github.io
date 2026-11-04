// Vercel Serverless Function: /api/update
// 检查 GitHub Releases 是否有新版本（供软件调用）

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length === 0 || allowed.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API Key 校验
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const provided = req.headers['x-api-key'] || req.query.api_key;
    if (provided !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }

  try {
    const { owner, repo, current } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo are required' });
    }

    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Vercel-Update-Checker',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Failed to fetch release', details: text });
    }

    const release = await response.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const currentVersion = (current || '').replace(/^v/, '');

    const updateAvailable = currentVersion
      ? compareVersions(latestVersion, currentVersion) > 0
      : true;

    return res.status(200).json({
      updateAvailable,
      currentVersion: currentVersion || null,
      latestVersion,
      releaseName: release.name,
      htmlUrl: release.html_url,
      body: release.body,
      publishedAt: release.published_at,
      assets: (release.assets || []).map(a => ({
        name: a.name,
        size: a.size,
        downloadUrl: a.browser_download_url,
      })),
      prerelease: release.prerelease,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function compareVersions(a, b) {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
