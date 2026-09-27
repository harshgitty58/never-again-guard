# Fixed: "Cannot find module ...\vitest\vitest.mjs" in verifier worktrees

This replaces the diagnosis in `error.md`, which named the wrong cause.

## Actual root cause

`shoplite/node_modules` was installed correctly. **The verifier itself deleted it.**

`removeWorktree()` in `guard/lib/git.mjs` ran `git worktree remove --force <dest>`.
On Windows, Git follows the `shoplite/node_modules` **junction** inside the worktree and
deletes everything in the folder it points to, which is the real `shoplite/node_modules`.

Order of events in `node guard/verify.mjs --all`:

1. INC-101 creates its worktree and junction. The tests run fine because packages are present.
2. INC-101 cleanup runs `git worktree remove --force`, which empties the real `shoplite/node_modules`.
3. INC-102 and INC-103 get a junction to an empty folder and fail with `MODULE_NOT_FOUND`.

That's why the packages seemed to "disappear after npm install" and why INC-101 got further than the others.
`createWorktree()` also calls `removeWorktree()` on stale worktrees, so `_debug-wt.mjs` caused the same wipe.

## Fix applied

`guard/lib/git.mjs`:

- New helper `unlinkModulesJunction(dest)`. It `lstat`s `dest/shoplite/node_modules`, and if that path is a
  link, removes **only the link** (`fs.unlinkSync`, falling back to a non-recursive `fs.rmdirSync`).
- `removeWorktree()` calls it **before** `git worktree remove --force`.

Bob's earlier changes (`mklink /J` in `createWorktree`, and calling `vitest/vitest.mjs` directly in
`run-test.mjs`) are unchanged.

## Verified

- Reinstalled with `npm install --prefix shoplite`, giving 133 packages.
- Ran `node guard/verify.mjs --all`. `shoplite/node_modules` still had 133 packages afterward,
  and `git worktree list` showed no leftover worktrees.
- Results:

```
INC-101  ✗ bug (assertion)  ✓ fix  → PARTIAL   (expected '2026-09-27' to be '2026-09-28')
INC-102  FAILED — bug proof: failedOn "error", empty excerpt, ms 30034
INC-103  ✗ bug (assertion)  ✓ fix  → PARTIAL   (expected [Function] to throw an error)
```

**Do not** reintroduce any cleanup that recursively deletes a worktree before its junction is removed.

---

## Open issues for Bob (not fixed)

### 1. INC-102 bug proof times out (the test design needs fixing, not the app)

`reports/INC-102.json` shows `"ms": 30034` with an empty excerpt, which means the run hit the
30s `timeout` in `guard/lib/run-test.mjs`. At `inc-102-bug`, the unbounded retry in `payment.js`
most likely keeps retrying (with real delays) until the process is killed, so there's no assertion failure.

**Confirmed cause: timer starvation, so a timer-based race cannot work.**
At `inc-102-bug`, `withRetry` runs with `backoffMs = 0`, so `if (delay > 0) await delayFn(delay)` never
runs. The loop only awaits a gateway that fails immediately, and the next attempt is queued before any
timer gets a chance to run. The loop never gives timers a turn, so
**no `setTimeout` can ever fire**. That means the 2s `Promise.race` in the current test never fires, and
neither does Vitest's own 10s test timeout. Only the verifier's 30s process kill stops it.
The same thing hung the ad-hoc `node --eval` simulation (300ms race) indefinitely.

Do **not** use `Promise.race` + `setTimeout`, and do **not** use `vi.useFakeTimers()`, to stop the bug path.
Neither can interrupt a loop that never gives timers a turn.

To fix `guards/INC-102/regression.test.js` (without touching `shoplite/src/`, per AGENTS.md):
**let the gateway end the loop.**

```js
let callCount = 0;
const gateway = async () => {
  callCount++;
  if (callCount >= 10) return { transactionId: 'cap' }; // safety cap: stops an unbounded loop
  throw new Error('gateway unavailable');
};
const client = makePaymentClient(gateway);
await client.charge({ customerId: 'c1', amountPaise: 1000 }).catch(() => {});
expect(callCount).toBeLessThanOrEqual(4);
```

- At the bug commit, 10 calls are made, then the gateway returns, so `callCount <= 4` fails on an **assertion**, fast.
- At the fix commit, the 4th attempt fails and `withRetry` throws, so the test passes (~1s due to real backoff).
- Optionally, also assert that the fix path rejected, for example with `await expect(client.charge(...)).rejects.toThrow()`.
  On the bug path it resolves, so that is also an assertion failure.
- Optionally, make `run-test.mjs` report a timeout explicitly (`err.signal === 'SIGTERM'` /
  `err.code === 'ETIMEDOUT'`, giving `failedOn: 'timeout'`) so this doesn't show up as a blank error.

### 2. Semgrep is not on PATH, so rule steps are silently skipped

The verifier logs `Rule / bug worktree … skipped (engine error: spawnSync semgrep ENOENT)`, but the
summary line still prints `rule ✓  variants 0 open`. That's a **false pass**: Semgrep never ran.

- Semgrep is installed as a Python module (`py -m semgrep` works) but its `Scripts` folder isn't on PATH.
  Either add it to PATH, or have `guard/lib/run-rule.mjs` fall back to `py -m semgrep` / `python -m semgrep`.
- The verifier should treat an engine error as **FAILED** (or at least not ✓) in both the
  summary line and the verdict. It must not report `rule ✓` or `0 variants` when the rule never ran.
- Expected once fixed: 2 open variants per incident, so all three are PARTIAL before Task 07b.

### 3. Housekeeping

- `error.md` describes the wrong cause and can be deleted.
- `_debug-wt.mjs` is a debug script and can be deleted.
- `reports/*.json` currently reflect the run above (with Semgrep skipped). Regenerate them after fixing #1 and #2.
