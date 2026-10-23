const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const failures = [];

for (const [arch, machine] of [['x64', 62], ['arm64', 183]]) {
	for (const abi of [137, 147]) {
		const relative = `prebuilds/linux-${arch}/isolated-vm.abi${abi}.musl.node`;
		const filename = path.join(root, relative);
		if (!fs.existsSync(filename)) {
			failures.push(`Missing ${relative}`);
			continue;
		}
		const binary = fs.readFileSync(filename);
		if (
			binary.length < 64 ||
			binary.subarray(0, 4).toString('hex') !== '7f454c46' ||
			binary[4] !== 2 || binary[5] !== 1 ||
			binary.readUInt16LE(18) !== machine
		) {
			failures.push(`Invalid Linux ${arch} ELF binary: ${relative}`);
			continue;
		}
		console.log(`${createHash('sha256').update(binary).digest('hex')}  ${relative}`);
	}
}

if (failures.length) {
	console.error(failures.join('\n'));
	process.exitCode = 1;
}
