<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title><xsl:value-of select="/rss/channel/title"/> · RSS 订阅</title>
<style>
:root{--bg:#f6f8fc;--card:#fff;--text:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#3b5bdb;--soft:#eef2ff}
@media (prefers-color-scheme:dark){:root{--bg:#0b1020;--card:#111a33;--text:#e6ebff;--muted:#94a3c4;--line:#26335c;--accent:#8fa8ff;--soft:#14204a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;line-height:1.75}
.hero{background:linear-gradient(160deg,#0b1020 0%,#14204a 60%,#1d2f6b 100%);color:#fff;padding:44px 20px 36px;text-align:center}
.hero .tag{margin:0 0 6px;font-size:13px;letter-spacing:.2em;color:#8fa8ff}
.hero h1{margin:0;font-size:34px;line-height:1.25;letter-spacing:.03em}
.hero p.d{margin:10px auto 0;max-width:520px;color:#c9d3f5;font-size:15px}
main{max-width:720px;margin:0 auto;padding:24px 18px 56px}
.how{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:28px}
.how h2{margin:0 0 6px;font-size:18px}
.how p,.how li{margin:0;font-size:15px;color:var(--muted)}
.how ol{margin:8px 0 14px;padding-left:20px}
.url{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.url code{flex:1;min-width:0;padding:8px 12px;border-radius:8px;background:var(--soft);font-size:13px;word-break:break-all;color:var(--text)}
button{padding:8px 16px;border:0;border-radius:8px;background:var(--accent);color:#fff;font-size:14px;font-weight:600;cursor:pointer}
.back{display:inline-block;margin-top:12px;font-size:14px;color:var(--accent);text-decoration:none}
h2.list{font-size:20px;margin:0 0 14px}
article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:14px}
article h3{margin:0 0 4px;font-size:18px;line-height:1.4}
article h3 a{color:var(--text);text-decoration:none}
article h3 a:hover{color:var(--accent)}
article .date{font-size:13px;color:var(--muted)}
article p{margin:6px 0 8px;font-size:15px;color:var(--muted)}
.cats{display:flex;flex-wrap:wrap;gap:6px}
.cats span{font-size:12px;padding:1px 10px;border-radius:999px;background:var(--soft);color:var(--accent)}
</style>
</head>
<body>
<header class="hero">
<p class="tag">RSS FEED · 订阅源</p>
<h1><xsl:value-of select="/rss/channel/title"/></h1>
<p class="d"><xsl:value-of select="/rss/channel/description"/></p>
</header>
<main>
<section class="how">
<h2>如何订阅</h2>
<ol>
<li>复制下面的订阅地址</li>
<li>粘贴到 RSS 阅读器中，例如 Feedly、Inoreader、NetNewsWire、Reeder</li>
<li>以后有新文章，阅读器会自动提醒你</li>
</ol>
<div class="url"><code id="u"></code><button id="c" type="button">复制地址</button></div>
<a class="back"><xsl:attribute name="href"><xsl:value-of select="/rss/channel/link"/></xsl:attribute>← 返回网站</a>
</section>
<h2 class="list">最新文章</h2>
<xsl:for-each select="/rss/channel/item">
<article>
<h3><a><xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute><xsl:value-of select="title"/></a></h3>
<div class="date"><xsl:value-of select="substring(pubDate,13,4)"/> 年 <xsl:value-of select="(string-length(substring-before('JanFebMarAprMayJunJulAugSepOctNovDec', substring(pubDate,9,3))) div 3) + 1"/> 月 <xsl:value-of select="number(substring(pubDate,6,2))"/> 日</div>
<p><xsl:value-of select="description"/></p>
<div class="cats"><xsl:for-each select="category"><span><xsl:value-of select="."/></span></xsl:for-each></div>
</article>
</xsl:for-each>
</main>
<script>
var u = document.getElementById('u');
var c = document.getElementById('c');
u.textContent = window.location.href;
c.onclick = function () {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href).then(function () {
      c.textContent = '已复制';
      setTimeout(function () { c.textContent = '复制地址'; }, 2000);
    });
  }
};
</script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
