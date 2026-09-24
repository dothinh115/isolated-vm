## v7.0.4
- Timer queue: a timer callback that calls `timer_t::chain()` no longer re-enters the drain while it is running, so draining a backlog can no longer recurse and exhaust the timer thread's native stack. Fixes `SIGSEGV` under a large set of concurrently expiring or cancelled timers.
- Linux musl prebuilds for Node 24 (ABI 137) rebuilt for both `linux-x64` and `linux-arm64`.

## v7.0.3
- Timer queue: discarded and paused due timers are now drained iteratively instead of by mutual recursion between `run_next()` and `maybe_run_next()`.
- First release to ship musl prebuilds for both `linux-x64` and `linux-arm64`.

## v4.3.0
- v8 inspector API fixed in nodejs v16.x
- `release` method added to `Module`

## v4.2.0
- `accessors` option added to `reference.get()`

## v4.1.0
- Support for nodejs v16.x
- `onCatastrophicError` added
- Fix for `null` error thrown from callback

## v4.0.0
- `Callback` class addeed.
- When possible, `reference.get()` will return a function delegate instead of a `Reference`.
- `reference.get()` will no longer return inherited properties by default.
- `result` property on `eval` and `evalClosure` has been removed. The result is now just the return
value.
- All `isolated-vm` class prototypes, and most instances are frozen.
- `isolate.cpuTime` and `isolate.wallTime` now return bigints.
- Proxies and accessors are no longer tolerated via `reference.get`, and related functions.
