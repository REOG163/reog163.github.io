// 轻量二维码生成器（字节模式，纠错等级默认 M，支持版本 1–20），无任何依赖
// 返回 { size, modules }，modules[y][x] 为 true 表示深色模块

const ECC_CW = [
	[-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28],
	[-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26],
	[-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30],
	[-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28],
];
const NUM_BLOCKS = [
	[-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8],
	[-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16],
	[-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20],
	[-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25],
];
const FORMAT_BITS = [1, 0, 3, 2]; // L M Q H
const MAX_VERSION = 20;

const getBit = (x, i) => ((x >>> i) & 1) !== 0;

function rawDataModules(ver) {
	let r = (16 * ver + 128) * ver + 64;
	if (ver >= 2) {
		const n = Math.floor(ver / 7) + 2;
		r -= (25 * n - 10) * n - 55;
		if (ver >= 7) r -= 36;
	}
	return r;
}
const dataCodewords = (ver, ecl) => Math.floor(rawDataModules(ver) / 8) - ECC_CW[ecl][ver] * NUM_BLOCKS[ecl][ver];

function rsMul(x, y) {
	let z = 0;
	for (let i = 7; i >= 0; i--) {
		z = (z << 1) ^ ((z >>> 7) * 0x11d);
		z ^= ((y >>> i) & 1) * x;
	}
	return z;
}
function rsGenerator(degree) {
	const res = new Array(degree).fill(0);
	res[degree - 1] = 1;
	let root = 1;
	for (let i = 0; i < degree; i++) {
		for (let j = 0; j < res.length; j++) {
			res[j] = rsMul(res[j], root);
			if (j + 1 < res.length) res[j] ^= res[j + 1];
		}
		root = rsMul(root, 2);
	}
	return res;
}
function rsRemainder(data, div) {
	const res = div.map(() => 0);
	for (const b of data) {
		const f = b ^ res.shift();
		res.push(0);
		div.forEach((c, i) => (res[i] ^= rsMul(c, f)));
	}
	return res;
}

function alignPositions(ver) {
	if (ver === 1) return [];
	const n = Math.floor(ver / 7) + 2;
	const size = ver * 4 + 17;
	const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
	const res = [6];
	for (let i = 0, pos = size - 7; i < n - 1; i++, pos -= step) res.splice(1, 0, pos);
	return res;
}

function penalty(m, size) {
	let r = 0;
	for (let pass = 0; pass < 2; pass++) {
		const get = pass === 0 ? (a, b) => m[a][b] : (a, b) => m[b][a];
		for (let a = 0; a < size; a++) {
			let run = 1;
			for (let b = 1; b < size; b++) {
				if (get(a, b) === get(a, b - 1)) {
					run++;
					if (run === 5) r += 3;
					else if (run > 5) r++;
				} else run = 1;
			}
			// 类似定位图案的 1:1:3:1:1 序列
			for (let b = 0; b + 11 <= size; b++) {
				const s = [];
				for (let k = 0; k < 11; k++) s.push(get(a, b + k) ? 1 : 0);
				const t = s.join('');
				if (t === '10111010000' || t === '00001011101') r += 40;
			}
		}
	}
	for (let y = 0; y < size - 1; y++)
		for (let x = 0; x < size - 1; x++) {
			const c = m[y][x];
			if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) r += 3;
		}
	let dark = 0;
	for (const row of m) for (const c of row) if (c) dark++;
	const total = size * size;
	r += Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
	return r;
}

export function makeQr(text, ecl = 1) {
	const bytes = Array.from(new TextEncoder().encode(text));
	let ver = 1;
	for (; ver <= MAX_VERSION; ver++) {
		const ccBits = ver <= 9 ? 8 : 16;
		if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
	}
	if (ver > MAX_VERSION) throw new Error('内容过长，无法生成二维码');

	// ---- 组装数据位 ----
	const bits = [];
	const put = (val, len) => {
		for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
	};
	put(0b0100, 4);
	put(bytes.length, ver <= 9 ? 8 : 16);
	bytes.forEach((b) => put(b, 8));
	const capBits = dataCodewords(ver, ecl) * 8;
	put(0, Math.min(4, capBits - bits.length));
	while (bits.length % 8) bits.push(0);
	for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) put(pad, 8);
	const data = new Array(bits.length / 8).fill(0);
	bits.forEach((b, i) => (data[i >>> 3] |= b << (7 - (i & 7))));

	// ---- 纠错码并交错 ----
	const numBlocks = NUM_BLOCKS[ecl][ver];
	const eccLen = ECC_CW[ecl][ver];
	const raw = Math.floor(rawDataModules(ver) / 8);
	const numShort = numBlocks - (raw % numBlocks);
	const shortLen = Math.floor(raw / numBlocks);
	const blocks = [];
	const div = rsGenerator(eccLen);
	for (let i = 0, k = 0; i < numBlocks; i++) {
		const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
		k += dat.length;
		const ecc = rsRemainder(dat, div);
		if (i < numShort) dat.push(0);
		blocks.push(dat.concat(ecc));
	}
	const all = [];
	for (let i = 0; i < blocks[0].length; i++)
		blocks.forEach((blk, j) => {
			if (i !== shortLen - eccLen || j >= numShort) all.push(blk[i]);
		});

	// ---- 绘制 ----
	const size = ver * 4 + 17;
	const m = Array.from({ length: size }, () => new Array(size).fill(false));
	const fn = Array.from({ length: size }, () => new Array(size).fill(false));
	const setFn = (x, y, dark) => {
		m[y][x] = dark;
		fn[y][x] = true;
	};
	for (let i = 0; i < size; i++) {
		setFn(6, i, i % 2 === 0);
		setFn(i, 6, i % 2 === 0);
	}
	const finder = (cx, cy) => {
		for (let dy = -4; dy <= 4; dy++)
			for (let dx = -4; dx <= 4; dx++) {
				const d = Math.max(Math.abs(dx), Math.abs(dy));
				const x = cx + dx;
				const y = cy + dy;
				if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
			}
	};
	finder(3, 3);
	finder(size - 4, 3);
	finder(3, size - 4);
	const ap = alignPositions(ver);
	ap.forEach((cx, i) =>
		ap.forEach((cy, j) => {
			if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return;
			for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
		}),
	);
	const drawFormat = (mask) => {
		const d = (FORMAT_BITS[ecl] << 3) | mask;
		let rem = d;
		for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
		const bitsF = ((d << 10) | rem) ^ 0x5412;
		for (let i = 0; i <= 5; i++) setFn(8, i, getBit(bitsF, i));
		setFn(8, 7, getBit(bitsF, 6));
		setFn(8, 8, getBit(bitsF, 7));
		setFn(7, 8, getBit(bitsF, 8));
		for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(bitsF, i));
		for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(bitsF, i));
		for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(bitsF, i));
		setFn(8, size - 8, true);
	};
	drawFormat(0);
	if (ver >= 7) {
		let rem = ver;
		for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
		const vb = (ver << 12) | rem;
		for (let i = 0; i < 18; i++) {
			const color = getBit(vb, i);
			const a = size - 11 + (i % 3);
			const b = Math.floor(i / 3);
			setFn(a, b, color);
			setFn(b, a, color);
		}
	}
	// 数据蛇形填充
	let idx = 0;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		for (let vert = 0; vert < size; vert++)
			for (let j = 0; j < 2; j++) {
				const x = right - j;
				const upward = ((right + 1) & 2) === 0;
				const y = upward ? size - 1 - vert : vert;
				if (!fn[y][x] && idx < all.length * 8) {
					m[y][x] = getBit(all[idx >>> 3], 7 - (idx & 7));
					idx++;
				}
			}
	}
	// 选择掩码
	const applyMask = (mask) => {
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				let inv;
				switch (mask) {
					case 0: inv = (x + y) % 2 === 0; break;
					case 1: inv = y % 2 === 0; break;
					case 2: inv = x % 3 === 0; break;
					case 3: inv = (x + y) % 3 === 0; break;
					case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
					case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
					case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
					default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
				}
				if (inv && !fn[y][x]) m[y][x] = !m[y][x];
			}
	};
	let best = 0;
	let bestP = Infinity;
	for (let mask = 0; mask < 8; mask++) {
		applyMask(mask);
		drawFormat(mask);
		const p = penalty(m, size);
		if (p < bestP) {
			bestP = p;
			best = mask;
		}
		applyMask(mask);
	}
	applyMask(best);
	drawFormat(best);
	return { size, modules: m, version: ver };
}
