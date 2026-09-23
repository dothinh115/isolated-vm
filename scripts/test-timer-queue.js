const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const directory = mkdtempSync(path.join(tmpdir(), 'isolated-vm-timer-'));
const binary = path.join(directory, 'timer-queue');

try {
	const compiler = spawnSync(process.env.CXX || 'c++', [
		'-std=c++20', '-O2', '-pthread', '-I', root,
		path.join(root, 'src/lib/timer.cc'),
		path.join(root, 'test-timer-queue.cpp'), '-o', binary,
	], { stdio: 'inherit', timeout: 120000 });
	if (compiler.status !== 0) throw new Error(`Timer test compilation failed: ${compiler.status || compiler.signal}`);
	const result = spawnSync(binary, [], { stdio: 'inherit', timeout: 30000 });
	if (result.status !== 0) throw new Error(`Timer queue failed: ${result.status || result.signal}`);
	console.log('Timer queue survives cancelled backlog and remains responsive');
} finally {
	rmSync(directory, { recursive: true, force: true });
}
