# Sandbox Design Document

## 1. Goal
Let strangers run arbitrary Python and JavaScript on our platform without being able to damage the server, read other users' data, or attack other systems.

## 2. Threat model
| Threat | Example |
| --- | --- |
| Resource exhaustion | `while True: pass`, fork bombs, allocating GBs of RAM, huge output |
| Host compromise | reading `/etc`, our `.env`, JWT secret, the SQLite DB; writing files |
| Network abuse | scanning our network, calling cloud metadata, sending spam |
| Privilege escalation | container escape, setuid binaries, extra capabilities |
| Cheating | printing a fake "all tests passed" line |
| Cross-user impact | one learner's code affecting another's run |

## 3. Design: one ephemeral container per run
`server/src/sandbox.js` receives code, writes it to a fresh temp directory, runs the test harness inside a new container, parses the result, and deletes everything.

| Control | Flag | Stops |
| --- | --- | --- |
| No network | `--network none` | scanning, exfiltration, metadata endpoints |
| Memory cap | `--memory 128m --memory-swap 128m` | memory bombs |
| CPU cap | `--cpus 0.5` | CPU hogging |
| Process cap | `--pids-limit 64` | fork bombs |
| Read-only root FS | `--read-only` | persistence, tampering with the image |
| Tiny scratch space | `--tmpfs /tmp:noexec,size=8m` | disk fill, executing dropped binaries |
| Code mounted read-only | `-v dir:/work:ro` | modifying the harness |
| Non-root user | `--user 65534:65534` | root-level actions in the container |
| No capabilities | `--cap-drop ALL` | raw sockets, mount, etc. |
| No privilege gain | `--security-opt no-new-privileges` | setuid escalation |
| Hard timeout | 8s, then `docker kill` | infinite loops |
| `--rm` | automatic | leftover containers, cross-run state |

Additional controls outside the container:
- **Output cap** of 64 KB per stream; the API returns at most 4,000 characters.
- **Input cap** of 20,000 characters and a 64 KB JSON body limit.
- **Concurrency limit** (default 4 simultaneous runs, rest queue) so bursts cannot exhaust the host.
- **Per-user rate limit** of 20 runs per minute.
- **No secrets inside:** the container gets no env vars except a one-time result token; the app's `.env`, database, and JWT secret are never mounted.
- **Result integrity:** the harness prints its results on a line prefixed with a random per-run token, which is removed from the environment before learner code is imported. Output lacking the token is ignored. A determined learner could still read `/proc/self/environ`; the impact is only awarding XP to themselves, so we accept it.
- **Server-side verdicts:** XP is awarded only from server-run tests, never from a client claim.

## 4. Browser-side execution (XSS challenge)
The *Exploit* demo and the *Preview* run in the learner's browser:
- Payloads render in `<iframe sandbox="allow-scripts">` **without** `allow-same-origin`, so injected script gets an opaque origin and cannot reach our cookies, storage, or DOM.
- The learner's `sanitize()` runs in a **Web Worker** that is terminated after 2s, so an infinite loop cannot freeze the page.
- The official pass/fail verdict still comes from the server sandbox.

## 5. Vulnerable mini-apps are simulated
The SQLi and IDOR exploit panels use `src/exploits.js` with a **throwaway in-memory SQLite database containing fake rows**. Learners can inject SQL, but there is nothing real to read or damage and each request starts clean.

## 6. Residual risk and hardening roadmap
Containers share the host kernel, so a kernel exploit could escape. For a hostile public audience:
1. Run the API on a dedicated, disposable VM with no sensitive data.
2. Use **gVisor** (`--runtime=runsc`) or Firecracker microVMs for a stronger boundary.
3. Run Docker **rootless** and add a custom seccomp profile.
4. Use a separate worker service for sandbox runs instead of giving the web API Docker access.

## 7. Local mode
`SANDBOX_MODE=local` runs the harness as a normal subprocess (timeout and stripped environment only). It exists so contributors can develop without Docker. The server prints a warning at startup. **Never enable it in production.**
