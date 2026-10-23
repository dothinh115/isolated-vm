const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const jobs = Number(process.env.PREBUILD_JOBS || 2);
if (!Number.isSafeInteger(jobs) || jobs < 1) throw new Error('PREBUILD_JOBS must be a positive integer');
const env = { ...process.env, MAKEFLAGS: `-j${jobs}`, npm_config_jobs: String(jobs) };

function run(command, args) {
	const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env, timeout: 600000 });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${command} failed: ${result.status ?? result.signal}`);
}

if (process.argv.length === 3 && process.argv[2] === '--current') {
	if (![24, 26].includes(Number(process.versions.node.split('.')[0]))) {
		throw new Error('Current-runtime prebuilds require Node 24 or Node 26');
	}
	const args = [require.resolve('node-gyp/bin/node-gyp.js'), 'rebuild', '--release', `--jobs=${jobs}`];
	const headers = process.env.npm_config_nodedir;
	if (headers) args.push(`--nodedir=${headers}`);
	run(process.execPath, args);
	const libc = process.platform === 'linux'
		? (process.report.getReport().header.glibcVersionRuntime ? 'glibc' : 'musl')
		: null;
	const directory = path.join(root, 'prebuilds', `${process.platform}-${process.arch}`);
	fs.mkdirSync(directory, { recursive: true });
	const filename = `isolated-vm.abi${process.versions.modules}${libc ? `.${libc}` : ''}.node`;
	const output = path.join(directory, filename);
	fs.copyFileSync(path.join(root, 'build/Release/isolated_vm.node'), output);
	console.log(`Built ${path.relative(root, output)} for Node ${process.versions.node}`);
} else {
	if (process.argv.length !== 2) throw new Error('Usage: yarn prebuild [--current]');
	const args = [
		require.resolve('prebuildify/bin.js'), '--strip', '--no-napi', '--name', 'isolated-vm',
		'--target', '24.22.1', '--target', '26.12.1',
	];
	if (process.platform === 'linux') args.push('--tag-libc');
	run(process.execPath, args);
}
