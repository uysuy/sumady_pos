/**
 * PM2 — Coffee Plus POS (@sveltejs/adapter-node → build/index.js).
 * Port 4003 avoids sumady-test :4002 and transmitter :4000.
 *
 *   npm ci && npm run build && pm2 start ecosystem.config.cjs
 * After .env change: pm2 restart sumady-pos-web --update-env
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(name) {
	const p = path.join(__dirname, name);
	if (!fs.existsSync(p)) return {};
	const out = {};
	for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
		const t = line.trim();
		if (!t || t.startsWith('#')) continue;
		const eq = t.indexOf('=');
		if (eq <= 0) continue;
		const key = t.slice(0, eq).trim();
		let v = t.slice(eq + 1).trim();
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		) {
			v = v.slice(1, -1);
		}
		out[key] = v;
	}
	return out;
}

const fromEnvFile = loadEnvFile('.env');

module.exports = {
	apps: [
		{
			name: 'sumady-pos-web',
			cwd: __dirname,
			script: 'build/index.js',
			interpreter: 'node',
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			watch: false,
			env: {
				...fromEnvFile,
				NODE_ENV: 'production',
				HOST: '127.0.0.1',
				PORT: 4003
			}
		}
	]
};
