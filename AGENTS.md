# Enfyra isolated-vm fork

- This repository is the ISC-licensed `@enfyra/isolated-vm` fork. Keep the upstream copyright and LICENSE in every distribution.
- The native timer queue is owned by `src/lib/timer.cc`. `timer_thread_t::run_next()` drains discarded or paused due timers iteratively; do not restore recursive `run_next()` ↔ `maybe_run_next()` traversal.
- `yarn test:timer-queue` exercises a large cancelled backlog and verifies the timer thread remains responsive. `CI=1 NODE_PATH="$PWD" yarn test` also runs the upstream suite; the CPU-profiler sampling case is intentionally skipped by its own CI guard.
- Release packaging must include both `prebuilds/linux-x64/isolated-vm.abi137.musl.node` and `prebuilds/linux-arm64/isolated-vm.abi137.musl.node` for Node 24 Linux musl. The server runtime image has no compiler. Verify the actual packed tarball loads on both image architectures without a build toolchain before publishing.
- Kernel imports `isolated-vm` and pins the exact npm alias `isolated-vm: npm:@enfyra/isolated-vm@<published-version>`. Server does not import it directly; its installed Kernel owns the native dependency. Keep one addon version per process.
- Do not publish, commit, push, or deploy without the user's explicit request.
