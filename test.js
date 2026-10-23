#!/usr/bin/env node
let fs = require('fs');
let spawn = require('child_process').spawn;
let path = require('path');
const testDirectory = path.join(__dirname, 'tests');

const timeoutMs = Number(process.env.TEST_TIMEOUT_MS || 60000);
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error('TEST_TIMEOUT_MS must be a positive integer');
const selected = new Set(process.argv.slice(2));
let ret = 0;
let passCount = 0, failCount = 0;
function runTest(test, cb) {
	// Copy env variables
	let env = {};
	for (let ii in process.env) {
		env[ii] = process.env[ii];
	}
	env.NODE_PATH = __dirname;

	// Get extra args
	let args = [ '--no-node-snapshot' ];
	let testPath = path.join(testDirectory, test);
	let content = fs.readFileSync(testPath, 'utf8');
	let match = /node-args: *(.+)/.exec(content);
	if (match) {
		args.push(...match[1].split(/ /g));
	}
	args.push(testPath);

	// Launch process
	let proc = spawn(process.execPath, args, { env, cwd: __dirname });
	proc.stdout.setEncoding('utf8');
	proc.stderr.setEncoding('utf8');

	let stdout = '', stderr = '';
	proc.stdout.on('data', function(data) {
		stdout += data;
	});
	proc.stderr.on('data', function(data) {
		stderr += data;
	});
	proc.stdin.end();

	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		proc.kill('SIGKILL');
	}, timeoutMs);
	process.stderr.write(`${test}: `);
	proc.on('error', error => { stderr += String(error); });
	proc.on('close', function(code, signal) {
		clearTimeout(timer);
		if (timedOut) stderr += `Test exceeded ${timeoutMs}ms`;
		if (stdout !== 'pass\n' || stderr !== '') {
			++failCount;
			ret = 1;
			console.error(
				`*fail*\n`+
				`code: ${code} signal: ${signal}\n`+
				`stderr: ${stderr}\n`+
				`stdout: ${stdout}`
			);
		} else if (code !== 0) {
			++failCount;
			ret = 1;
			console.error(`fail (${code})`);
		} else {
			++passCount;
			console.error(`pass`);
		}
		cb();
	});
}

let cb = function() {
	if (passCount + failCount === 0) {
		console.error('No tests matched the selection');
		process.exit(1);
	}
	console.log('\nCompleted: '+ passCount+ ' passed, '+ failCount+ ' failed.');
	process.exit(ret);
};
const files = fs.readdirSync(testDirectory).filter(file => /\.js$/.test(file));
for (const file of selected) {
	if (!files.includes(file)) throw new Error(`Unknown test: ${file}`);
}
files.sort().reverse().forEach(function(file) {
	if (/\.js$/.test(file) && (!selected.size || selected.has(file))) {
		cb = new function(cb) {
			return function(err) {
				if (err) return cb(err);
				runTest(file, cb);
			};
		}(cb);
	}
});
cb();
