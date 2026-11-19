# logq demo video: script

Narrated screen recording for CSC 5323 "Advances": logq used in TeamMatch on branch `feat/infallible-albattani-7f1466`. Target 11 min (allowed 8–12). Background and numbers: [logq-pilot.md](logq-pilot.md).

Every command below was dry-run on 2026-11-18 against the `teammatch-logq` stack. The outputs shown come from that run; trace IDs and times will differ on the day.

Slides, diagrams and backup screenshots (1920×1080 PNGs) are in `~/Documents/LA Tech/Academics/Year 1/Fall 2026/CSC 5323/Advances demo assets/`. Its `README.md` maps each file to a part below.

Screen layout: **left**, Claude Code (`claude`, started in the worktree root); **right**, a shell in the worktree root; a browser for Jaeger. "Say" lines are suggested wording for what the tool does. Your own opinions go only where it says **⟦YOUR VIEW⟧**.

## Before recording (checklist)

Off camera, in this order.

1. Docker Desktop is running and `docker context show` prints `desktop-linux`.
2. In the right window: `cd /home/season101/Documents/GitHub/teammatch/.claude/worktrees/open-prs-review-c235bc`. Then `git status`: clean, on `feat/infallible-albattani-7f1466`.
3. Start Jaeger **before** opening the Claude Code session you record with: `logq ui`, then `logq ui --status` prints `running`. The `jaeger` MCP server connects only when a Claude Code session starts. If Jaeger was down then, the session has no Jaeger tools (fix: `/mcp`, reconnect `jaeger`, or restart `claude`).
4. Stack up and healthy: run the compose command from Part 2, then `logq ps -p teammatch-logq` shows four rows (api, db, redis, storage), none starting with `!`.
5. Reset state left over from a practice take:
   - Body capture off: run the Part 2 compose command again (no `LOGQ_CAPTURE_BODY=1` in front of it). It recreates the api only if capture was on.
   - Redis running: `docker start teammatch-logq-redis-1` (does nothing if it already runs).
   - No Monitor left running: start a fresh `claude` session for the recording.
6. Warm up the api: `curl -s -o /dev/null http://localhost:8010/api/v1/health/`. The first request after the api starts is slow (about 180 ms, mostly startup), which makes Part 4's trace look odd.
7. Make a chat trace for Part 4c. Jaeger keeps traces in memory only, so redo this whenever `logq-jaeger` restarts:
   ```bash
   python3 ~/.cache/teammatch-logq/login.py owner
   ```
   ```bash
   python3 ~/.cache/teammatch-logq/ws_chat.py 1 "hello team"
   ```
8. Left window: start `claude` in the worktree root, run `/mcp`, check that `jaeger` is connected. Then clear the screen (`/clear`).
9. Terminal: font 16–18 pt, each window at least 120 columns wide so logq lines do not wrap, short prompt, `clear` before each part.
10. Notifications off: turn on Do Not Disturb, close email, chat and other Claude windows. Browser: only the Jaeger tab, bookmarks bar hidden.
11. Never show `~/.cache/teammatch-logq/logq.env`, `docker compose config`, a full `docker inspect` or `docker exec … env`: they print the generated passwords. The helper scripts never print them.
12. OBS: record a 10 s test take; check the mic level and that the right screen is captured.
13. OBS: add the asset PNGs as image sources (one scene per slide is easiest), or open `slides/logq-slides.html` full screen (F11) in a browser window you can switch to.

## Time budget

| Part | Starts | Length |
|---|--:|--:|
| 1. Intro | 0:00 | 1:00 |
| 2. Setup | 1:00 | 1:15 |
| 3. Integration | 2:15 | 1:30 |
| 4. Workflow | 3:45 | 4:00 |
| 5. Redaction | 7:45 | 1:00 |
| 6. Experiment results | 8:45 | 1:00 |
| 7. Evaluation | 9:45 | 1:30 |
| 8. Close | 11:15 | 0:15 |
| **Total** | | **11:30** |

If a take runs long, skip the settings excerpt in Part 3 and the second Jaeger trace in Part 4c. Do Part 5 after Part 4: it recreates the api container, and the api's earlier log lines go with the old container (Jaeger keeps its traces).

## Part 1. Intro (0:00–1:00)

Show: the TeamMatch repo in your editor, or a title slide.

Say:
- "This is logq, a command-line tool I built. It reads Docker container logs, filters them by level, service, route or trace, redacts secrets, and links each line to its trace in a local Jaeger."
- "It is made for AI coding agents such as Claude Code. Instead of thousands of raw log lines, the agent gets a few filtered, redacted lines, plus trace links it can open through Jaeger's MCP server."
- "I'll show it in TeamMatch, our team project: a Django and Channels API with Postgres, Redis and S3 storage, run with Docker Compose. All the integration work is on this feature branch."
- "logq has four commands: `ps`, `query`, `follow` and `ui`."

## Part 2. Setup (1:00–2:15)

Right window:

```bash
logq --help
```

```bash
logq ui
```

Shows:

```
Jaeger UI: http://localhost:16686
Claude MCP (once): claude mcp add --transport http --scope user jaeger http://localhost:16686/api/ai/mcp/
App env:
  OTEL_TRACES_EXPORTER=otlp
  OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
  OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318
  OTEL_SERVICE_NAME=<compose service>
```

Say: "`logq ui` starts one shared Jaeger container for all my projects. It prints the environment variables an app needs to send traces, and the one-time command that registers Jaeger's MCP server with Claude Code. I already ran that once."

```bash
docker compose -p teammatch-logq -f compose.local.yml -f compose.logq.yml --env-file ~/.cache/teammatch-logq/logq.env up -d --wait api
```

Shows: db, redis, storage and api `Healthy`. It returns in a few seconds when the stack is already up, and took 42 s from a stopped stack in the dry run (pause OBS if you start cold).

Say: "`compose.logq.yml` is the one extra file. It is an overlay on our normal local compose file: it runs the API under `opentelemetry-instrument` and points it at Jaeger. The env file holds generated passwords and puts this stack on its own ports, so it does not clash with my other TeamMatch stacks."

## Part 3. Integration (2:15–3:45)

```bash
git log --oneline cd46d53..HEAD
```

```
3616eb4 docs(advances): logq pilot write-up with the 6-run debugging experiment
9360273 feat(api): opt-in request/response bodies in spans (LOGQ_CAPTURE_BODY=1)
0d5debb feat(api): OpenTelemetry traces to the local Jaeger (compose.logq.yml)
4c64ab5 feat(api): request finished log line and X-Request-ID header
5f63775 feat(api): JSON logs on stdout per logq's logging contract
```

Say, one sentence per commit:
- `5f63775`: logs become JSON, one object per line with severity, message, trace ID and span ID. That is logq's logging contract.
- `4c64ab5`: a middleware writes one `request finished` line per request and returns an `X-Request-ID` header that equals the trace ID.
- `0d5debb`: the compose overlay sends traces to Jaeger, with Django, Postgres, Redis and logging instrumentation; `asgi.py` wraps the chat WebSocket so it gets traces too.
- `9360273`: optional request and response bodies on the span, off by default (Part 5).

```bash
git diff --stat cd46d53..9360273 -- . ':!backend/uv.lock'
```

Shows 10 files, +244/−13: 65 lines are tests, the rest is settings, two middlewares, `asgi.py`, `pyproject.toml` and the overlay.

```bash
sed -n '23,48p' backend/config/request_log.py
```

Say: "This is the main piece of app code, a 25-line Django middleware. It sets `X-Request-ID` to the trace ID, logs one line with method, route, status and duration, and logs 4xx and 5xx responses itself, so those lines keep their trace ID. Django would log them after the span has ended."

```bash
sed -n '43,59p' backend/config/settings/base.py
```

Say: "It goes first in the middleware list so it times everything. The body-capture middleware goes last."

Say: "The tracing packages are in the dev dependency group only. The production image changes only by two small libraries, `python-json-logger` and `opentelemetry-api`."

## Part 4. Workflow (3:45–7:45)

### 4a. `ps`, one request, `query` by trace (1:00)

```bash
logq ps -p teammatch-logq
```

```
  teammatch-logq  api      teammatch-logq-api-1      running  healthy  up 42s  restarts=0
  teammatch-logq  db       teammatch-logq-db-1       running  healthy  up 48s  restarts=0
  teammatch-logq  redis    teammatch-logq-redis-1    running  healthy  up 49s  restarts=0
  teammatch-logq  storage  teammatch-logq-storage-1  running  healthy  up 48s  restarts=0
```

Say: "One row per container. Anything exited, restarting or unhealthy starts with an exclamation mark."

```bash
curl -si http://localhost:8010/api/v1/health/
```

Shows `x-request-id: 79cd423c705b10363f02ec32fcfbd34f` among the headers. Copy your ID; keep it for 4c.

```bash
logq query -p teammatch-logq --trace <id>
```

```
19:27:18.009 api    INFO  GET /api/v1/health/ 200 42ms process_response request finished trace=79cd423c
-- 1 of 1 matches · 4 containers (api, redis, db, storage) · project teammatch-logq · 15m · level>=debug · trace=79cd423c
-- view in Jaeger: http://localhost:16686/trace/79cd423c705b10363f02ec32fcfbd34f
```

Say: "With the request ID from the response header, logq finds every line of that request across all four containers, one line each, and ends with a link to the trace."

### 4b. Claude Code watches while I break Redis (1:15)

Left window (Claude Code), type:

> Watch the teammatch-logq containers live with logq while I break something.

Shows: Claude Code uses the docker-logs skill and starts the Monitor tool with `logq follow -p teammatch-logq`. First event: `-- following api, db, redis, storage · project teammatch-logq · level>=warn`.

Right window:

```bash
docker stop teammatch-logq-redis-1
```

```bash
curl -si http://localhost:8010/readyz
```

Shows `HTTP/1.1 503 Service Unavailable`, an `x-request-id` (copy it for 4d) and `"redis": {"ok": false, …, "error": "ConnectionError"}`.

Left window, Monitor events:

```
19:27:34.576 ! teammatch-logq-redis-1 died exit=0
19:27:34.679 api    ERROR 503 log_response Service Unavailable: /readyz trace=2096859c
```

Say: "`logq follow` prints warnings and errors only, plus container events such as died and started. Each line reaches the agent as one notification, so it sees the outage the moment it happens and I do not paste any logs."

Right window:

```bash
docker start teammatch-logq-redis-1
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8010/readyz
```

Shows `200`. Right after `docker start` it can still be `503` for a second while Redis starts; run it again. A second 503 within 30 s does not print again: `follow` later shows `↻ api ERROR 503 Service Unavailable: /readyz repeated 1x in 30s`.

Left window, Monitor events: `! teammatch-logq-redis-1 started`, then Redis's own WARN line that it has no password (normal for local development).

Left window, type:

> Stop watching.

Claude Code stops the Monitor.

### 4c. Jaeger UI (0:45)

Browser: `http://localhost:16686/trace/<id from 4a>`.

Shows the span tree: root `GET api/v1/health/`, children `SELECT` (Postgres `SELECT 1`) and `PING` (Redis), each with its time.

Then Search → Service `api` → Operation `HTTP /ws/teams/1/` → Find Traces, and open the chat trace from the checklist: 24 spans, with WebSocket receive and send, Postgres `INSERT`/`SELECT` and Redis `EVAL`, `ZADD`, `BZPOPMIN`.

Say: "Logs say what happened; the trace shows where the time went, down to each SQL query and Redis call. The chat socket gets a trace too. Django's instrumentation does not cover WebSockets, so that took the small wrapper in `asgi.py`."

Optional: open the 503 trace from 4b; its `PING` span is marked as an error.

### 4d. Jaeger MCP tools in Claude Code (1:00)

Left window, type (with the 503 ID from 4b):

> Use the Jaeger tools to show the topology, critical path and errors of trace `<503 id>`.

Shows: Claude Code calls `get_trace_topology`, `get_critical_path` and `get_trace_errors` (approve them if it asks). Dry-run results for the 503 trace: three spans, `GET readyz` with children `SELECT` and `PING`; the error is on `PING`: `Error -2 connecting to redis:6379. Name or service not known.`

Say: "Through Jaeger's MCP server, the agent reads the trace itself: the span tree, the critical path and the exception on the Redis span. It gets from a log line to the cause without me copying anything."

## Part 5. Redaction (7:45–8:45)

Right window:

```bash
LOGQ_CAPTURE_BODY=1 docker compose -p teammatch-logq -f compose.local.yml -f compose.logq.yml --env-file ~/.cache/teammatch-logq/logq.env up -d --wait api
```

About 25 s; pause OBS or talk over it.

Say: "When debugging, it helps to see request and response bodies on the span. That is off by default; this turns it on for the local stack only."

```bash
python3 ~/.cache/teammatch-logq/login.py owner
```

```
owner signed in: 200 X-Request-ID=fb8179cb2d1b3fa309139d9401c39256; X-CSRFToken for writes is the csrftoken cookie
```

Say: "This signs in a seed account through the real sign-in endpoint. The script never prints the password."

Wait about 5 s (spans reach Jaeger in batches; earlier you get `HTTP Error 404`), then:

```bash
python3 ~/.cache/teammatch-logq/bodies.py <id>
```

```
POST _allauth/browser/v1/auth/login http.request.body: {"email": "owner@latech.edu", "password": [REDACTED]}
POST _allauth/browser/v1/auth/login http.response.body: {"status": 200, "data": {"user": {"id": 1, "display": "owner@latech.edu", "email": "owner@latech.edu", "has_usable_password": [REDACTED]}, …
```

Optional: open `http://localhost:16686/trace/<id>` and expand the root span's tags to show `http.request.body`.

Say: "The password is replaced before it ever reaches Jaeger, and logq redacts secrets in log lines the same way. The redaction matches key names, so `has_usable_password` is hidden too, a harmless false positive. Emails are not redacted."

Turn it off again (also about 25 s):

```bash
docker compose -p teammatch-logq -f compose.local.yml -f compose.logq.yml --env-file ~/.cache/teammatch-logq/logq.env up -d --wait api
```

## Part 6. Experiment results (8:45–9:45)

Show: §5 of [logq-pilot.md](logq-pilot.md) in your editor's Markdown preview, or this table.

| Condition | Found | Turns | Tool calls | Cost (USD) | Log + trace chars | All tool output chars |
|---|--:|--:|--:|--:|--:|--:|
| B logq + Jaeger | 3/3 | 27 | 24 | 0.690 | 22,665 | 57,022 |
| A Docker CLI only | 3/3 | 30 | 27 | 0.863 | 34,208 | 87,447 |

Say:
- "I seeded three bugs in TeamMatch: an endpoint that returns 500, a slow N+1 query, and a Redis timeout in team chat. Headless Claude Code with Opus debugged each bug twice: once with only the Docker CLI, once with logq and the Jaeger MCP server."
- "Both conditions found all three root causes. With logq: 27 turns instead of 30, about 20 % lower cost, a third fewer log and trace characters, and 35 % less tool output overall."
- "Most of the gap is the chat bug, 4 turns against 9: one filtered `logq query` showed the Redis timeout. For the N+1 bug, the traces did not save any turns."
- "This is one run per cell, so it shows a trend, not proof."

## Part 7. Evaluation (9:45–11:15)

The brief asks five questions. Each has facts from the pilot you can cite; the opinion is yours. About 15–20 s each.

**Effective?**
Facts: both conditions found 3/3; with logq about 20 % lower cost and 35 % less tool output; the gain came from the chat bug, none from the N+1 bug; `follow` reported the Redis outage live.

> ⟦YOUR VIEW: is logq effective, and for which kinds of bugs?⟧

**Cumbersome?**
Facts: about 190 lines of app code plus a compose overlay; the pilot hit several contract gaps (4xx lines logged after the span ends, uvicorn logger setup, an extra package for ASGI tracing, a wrapper for WebSockets); Jaeger must be up before Claude Code starts or its tools are missing; body capture needs an api restart; spans reach Jaeger a few seconds late.

> ⟦YOUR VIEW: was it cumbersome to set up and to use day to day?⟧

**Accessible?**
Facts: logq is a CLI with plain-text, one-line-per-event output; it needs Docker and Python; Jaeger is a browser UI; the agent side needs Claude Code's Monitor tool and an MCP client.

> ⟦YOUR VIEW: accessible to whom (a new teammate, someone without Claude Code, other platforms)?⟧

**Appropriate for TeamMatch?**
Facts: local development only, opt-in through a compose overlay; the production image is unchanged apart from two small libraries; no TeamMatch endpoint uses S3 yet, so storage spans could not be shown.

> ⟦YOUR VIEW: is this the right tool for a project like TeamMatch?⟧

**Would you recommend it?**

> ⟦YOUR VIEW: recommend or not, to whom, and under what conditions?⟧

Limits to mention in a sentence: one run per cell, three bugs, one model; condition B had a longer system prompt and always ran first.

## Part 8. Close (11:15–11:30)

Say: "That was logq in TeamMatch: setup with `logq ui` and one compose overlay, four commits of integration, and an agent that watches the logs and reads the traces itself."

> ⟦YOUR VIEW: one closing sentence of your own.⟧

## If something goes wrong

| Symptom | Fix |
|---|---|
| Claude Code has no Jaeger tools | Jaeger was down when the session started: `logq ui`, then `/mcp` → reconnect `jaeger`, or restart `claude`. |
| Claude Code runs `docker logs` instead of the Monitor | Ask directly: "Use the Monitor tool with `logq follow -p teammatch-logq`." |
| `bodies.py` prints `HTTP Error 404` | The span has not reached Jaeger yet. Wait 5 s and run it again. |
| `/readyz` still 503 after `docker start` | Redis is still starting. Run the curl again. |
| `logq query --trace` finds no lines for an older ID | The api container was recreated since (Part 5) and its old logs went with it, or the request is older than 15 min (add `--since 1h`). Jaeger still has the trace. |
| `logq ps` shows `! … api … unhealthy` | `logq query -p teammatch-logq -s api --since 5m` shows why. |
| Jaeger search has no chat trace | Jaeger restarted since the checklist. Rerun checklist step 7. |
