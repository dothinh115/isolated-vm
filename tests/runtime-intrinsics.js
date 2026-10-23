const assert = require('node:assert/strict');
const ivm = require('isolated-vm');

const isolate = new ivm.Isolate({ memoryLimit: 32 });
try {
	const context = isolate.createContextSync();
	assert.strictEqual(context.evalSync('6 * 7'), 42);
	for (const name of ['process', 'require', 'Buffer', 'fetch', 'TextEncoder', 'URL']) {
		assert.strictEqual(context.evalSync(`typeof ${name}`), 'undefined', name);
	}
	if (Number(process.versions.node.split('.')[0]) === 26) {
		assert.strictEqual(context.evalSync('typeof Temporal'), 'object');
		assert.strictEqual(context.evalSync('Temporal.PlainDate.from("2026-10-23").add({ days: 1 }).toString()'), '2026-10-24');
		assert.strictEqual(context.evalSync('new Uint8Array([72, 105]).toBase64()'), 'SGk=');
		assert.strictEqual(context.evalSync('Uint8Array.fromBase64("SGk=").toHex()'), '4869');
		assert.strictEqual(context.evalSync('new Map().getOrInsert("key", 42)'), 42);
	}
	context.release();
	console.log('pass');
} finally {
	isolate.dispose();
}
