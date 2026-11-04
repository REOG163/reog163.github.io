/**
 * 软件端检查更新 + 提交反馈（适配 Vercel 部署）
 */

export class UpdateChecker {
  /**
   * @param {Object} options
   * @param {string} options.owner          - GitHub 用户名
   * @param {string} options.repo           - 仓库名
   * @param {string} options.currentVersion - 当前版本，如 "1.0.0"
   * @param {string} options.backendUrl     - 你的 Vercel 域名，如 https://xxx.vercel.app
   * @param {string} [options.apiKey]       - API_KEY
   */
  constructor(options) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.currentVersion = (options.currentVersion || '').replace(/^v/, '');
    this.backendUrl = options.backendUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey || '';
  }

  async check() {
    const params = new URLSearchParams({
      owner: this.owner,
      repo: this.repo,
      current: this.currentVersion,
    });

    const headers = {};
    if (this.apiKey) headers['x-api-key'] = this.apiKey;

    const res = await fetch(`${this.backendUrl}/api/update?${params}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }
}

/**
 * 提交反馈
 */
export async function submitFeedback({ backendUrl, apiKey = '' }, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: 'software',
      ...data,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Submit failed');
  return json;
}
