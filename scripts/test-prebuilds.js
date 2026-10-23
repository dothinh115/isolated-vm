const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function fixture(t) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'isolated-vm-prebuilds-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	for (const [arch, machine] of [['x64', 62], ['arm64', 183]]) {
		const directory = path.join(root, 'prebuilds', `linux-${arch}`);
		fs.mkdirSync(directory, { recursive: true });
		for (const abi of [137, 147]) {
			const binary = Buffer.alloc(64);
			binary.write('7f454c46', 'hex');
			binary[4] = 2;
			binary[5] = 1;
			binary.writeUInt16LE(machine, 18);
			fs.writeFileSync(path.join(directory, `isolated-vm.abi${abi}.musl.node`), binary);
		}
	}
	return root;
}

function verify(root) {
	const result = spawnSync(process.execPath, [path.join(__dirname, 'verify-prebuilds.js'), root], {
		encoding: 'utf8', timeout: 5000,
	});
	assert.ifError(result.error);
	return result;
}

test('release gate requires both supported Node ABIs on each Linux architecture', t => {
	const root = fixture(t);
	assert.equal(verify(root).status, 0);
	fs.unlinkSync(path.join(root, 'prebuilds/linux-x64/isolated-vm.abi147.musl.node'));
	const result = verify(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Missing .*abi147/);
});

test('release gate rejects a binary for the wrong architecture', t => {
	const root = fixture(t);
	const filename = path.join(root, 'prebuilds/linux-arm64/isolated-vm.abi147.musl.node');
	const binary = fs.readFileSync(filename);
	binary.writeUInt16LE(62, 18);
	fs.writeFileSync(filename, binary);
	const result = verify(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Invalid Linux arm64 ELF/);
});
