const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// 网站地址：App 每次启动都直接加载线上网站，所以网站更新后 App 自动同步
const SITE = 'https://reog163.github.io';
const SITE_HOST = new URL(SITE).host;
// 评论登录（giscus / GitHub）需要在应用内打开
const INAPP_HOSTS = [SITE_HOST, 'giscus.app', 'github.com'];

let win = null;

function isInApp(url) {
	try {
		const h = new URL(url).host;
		return INAPP_HOSTS.some((x) => h === x || h.endsWith('.' + x));
	} catch {
		return false;
	}
}

function go(p) {
	if (win) win.loadURL(SITE + p);
}

function buildMenu() {
	const template = [
		{
			label: '导航',
			submenu: [
				{ label: '首页', accelerator: 'CmdOrCtrl+1', click: () => go('/') },
				{ label: '博客', accelerator: 'CmdOrCtrl+2', click: () => go('/blog') },
				{ label: '作品', accelerator: 'CmdOrCtrl+3', click: () => go('/projects') },
				{ label: '关于', accelerator: 'CmdOrCtrl+4', click: () => go('/about') },
				{ label: '搜索', accelerator: 'CmdOrCtrl+F', click: () => go('/search') },
				{ type: 'separator' },
				{ label: '后退', accelerator: 'Alt+Left', click: () => win && win.webContents.goBack() },
				{ label: '前进', accelerator: 'Alt+Right', click: () => win && win.webContents.goForward() },
				{ label: '刷新', accelerator: 'CmdOrCtrl+R', click: () => win && win.webContents.reload() },
				{ type: 'separator' },
				{ label: '退出', role: 'quit' },
			],
		},
		{
			label: '视图',
			submenu: [
				{ label: '放大', role: 'zoomIn' },
				{ label: '缩小', role: 'zoomOut' },
				{ label: '重置缩放', role: 'resetZoom' },
				{ label: '全屏', role: 'togglefullscreen' },
			],
		},
		{
			label: '帮助',
			submenu: [{ label: '在浏览器中打开网站', click: () => shell.openExternal(SITE) }],
		},
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 420,
		minHeight: 600,
		title: 'REOG Lab',
		icon: path.join(__dirname, 'build', 'icon.png'),
		backgroundColor: '#0b1020',
		autoHideMenuBar: true,
		show: false,
		webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
	});

	// 标记 UA，网站据此在 App 内隐藏「下载 App」按钮
	win.webContents.setUserAgent(win.webContents.getUserAgent() + ' REOGApp/1.0');

	win.once('ready-to-show', () => win.show());

	// 站外链接用系统浏览器打开，站内与评论登录留在应用内
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (isInApp(url)) return { action: 'allow' };
		shell.openExternal(url);
		return { action: 'deny' };
	});
	win.webContents.on('will-navigate', (e, url) => {
		if (!isInApp(url) && !url.startsWith('file://')) {
			e.preventDefault();
			shell.openExternal(url);
		}
	});

	// 加载失败（断网等）时显示离线提示页
	win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
		if (isMainFrame && code !== -3) {
			win.loadFile(path.join(__dirname, 'offline.html'));
		}
	});

	// 每次启动先清缓存，确保拿到最新内容
	win.webContents.session.clearCache().finally(() => win.loadURL(SITE));

	win.on('closed', () => (win = null));
}

const locked = app.requestSingleInstanceLock();
if (!locked) {
	app.quit();
} else {
	app.on('second-instance', () => {
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}
	});
	app.whenReady().then(() => {
		buildMenu();
		createWindow();
	});
	app.on('window-all-closed', () => app.quit());
}
