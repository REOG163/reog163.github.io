// Vercel Serverless Function: /api/feedback
// 接收网站和软件提交的反馈，转发到 GitHub Issues / Discord / 邮件

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS
  const origin = req.headers.origin || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length === 0 || allowed.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 校验 API Key（推荐开启）
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const provided = req.headers['x-api-key'];
    if (provided !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }

  try {
    const {
      name = '',
      email = '',
      title = '',
      message = '',
      type = 'feedback',
      source = 'website',
      version = '',
      platform = '',
      extra = {},
    } = req.body || {};

    if (!message || String(message).trim().length < 5) {
      return res.status(400).json({ error: 'Message is required (min 5 chars)' });
    }

    const payload = {
      name: String(name).trim(),
      email: String(email).trim(),
      title: String(title).trim() || `[${type}] from ${source}`,
      message: String(message).trim(),
      type,
      source,
      version,
      platform,
      extra,
      submittedAt: new Date().toISOString(),
    };

    const results = {};

    // 1. GitHub Issues
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
      try {
        results.github = await createGitHubIssue(payload);
      } catch (e) {
        console.error('GitHub error:', e.message);
        results.github = { error: e.message };
      }
    }

    // 2. Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        results.discord = await sendDiscord(payload);
      } catch (e) {
        console.error('Discord error:', e.message);
        results.discord = { error: e.message };
      }
    }

    const anySuccess = Object.values(results).some(r => r && !r.error);
    if (!anySuccess) {
      return res.status(500).json({ error: 'All feedback channels failed', details: results });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback received, thank you!',
      channels: results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createGitHubIssue(payload) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_ISSUE_LABELS } = process.env;

  const labels = (GITHUB_ISSUE_LABELS || 'feedback')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (payload.type) labels.push(payload.type);

  const body = [
    `**来源**: ${payload.source}`,
    payload.version ? `**版本**: ${payload.version}` : null,
    payload.platform ? `**平台**: ${payload.platform}` : null,
    payload.name ? `**姓名**: ${payload.name}` : null,
    payload.email ? `**邮箱**: ${payload.email}` : null,
    '',
    '---',
    '',
    payload.message,
    '',
    `_提交时间: ${payload.submittedAt}_`,
  ].filter(Boolean).join('\n');

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Vercel-Feedback',
      },
      body: JSON.stringify({
        title: payload.title,
        body,
        labels: [...new Set(labels)],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return { issueNumber: data.number, url: data.html_url };
}

async function sendDiscord(payload) {
  const content = {
    embeds: [{
      title: payload.title,
      description: payload.message.slice(0, 4000),
      color: payload.type === 'bug' ? 0xff0000 : 0x00ff00,
      fields: [
        { name: '来源', value: payload.source, inline: true },
        { name: '类型', value: payload.type, inline: true },
        payload.version ? { name: '版本', value: payload.version, inline: true } : null,
        payload.name ? { name: '姓名', value: payload.name, inline: true } : null,
        payload.email ? { name: '邮箱', value: payload.email, inline: true } : null,
      ].filter(Boolean),
      timestamp: payload.submittedAt,
    }],
  };

  const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });

  if (!res.ok) throw new Error(`Discord ${res.status}`);
  return { ok: true };
}
