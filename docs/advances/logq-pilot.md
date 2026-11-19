# logq pilot on TeamMatch

CSC 5323 "Advances in Software Engineering", individual assignment. This note records how logq was added to TeamMatch's `api`, how it was checked, a small debugging experiment with headless Claude Code, and the steps for the demo video.

Branch `feat/infallible-albattani-7f1466`, based on `cd46d53` (main). Local development only; nothing here changes production.

## 1. What was added

logq reads Docker logs, filters and redacts them, and links each line to its trace in a local Jaeger. To do that, an app must follow logq's logging contract (`~/Documents/GitHub/logq/docs/logging-contract.md`). The pilot ported the para-dashboard pilot to TeamMatch's Django API, which runs under uvicorn (ASGI) instead of gunicorn (WSGI).

| Commit | Change |
|---|---|
| `5f63775` | JSON logs on stdout: one object per line with `severity_text`, `body`, `trace_id`, `span_id`, `service.name`, `code.function` (`python-json-logger`). |
| `4c64ab5` | `config.request_log.RequestLogMiddleware`: one `request finished` line per request (`http.request.method`, `http.route`, `http.response.status_code`, `duration_ms`) and an `X-Request-ID` header that equals the trace ID. |
| `0d5debb` | `compose.logq.yml`: runs the api under `opentelemetry-instrument` and exports spans to the shared Jaeger. Django, psycopg, redis and logging instrumentations; the ASGI middleware wraps the chat WebSocket. |
| `9360273` | `config.logq_body_capture.BodyCaptureMiddleware`: with `LOGQ_CAPTURE_BODY=1`, redacted JSON request and response bodies (first 2 KB) go on the span. Off by default. |

Integration effort: 11 files, +629/−14 lines, of which 386 are `uv.lock` and 65 are tests. App code: about 190 lines across settings, two middlewares, `asgi.py`, `pyproject.toml` and the compose overlay. The tracing packages are in the dev dependency group only; `asgi.py` skips the WebSocket middleware when they are missing, so the production image is unchanged apart from `python-json-logger` and `opentelemetry-api`.

## 2. Setup

Commands run from the repository root. The compose project `teammatch-logq` uses its own ports so it does not collide with `teammatch-local`, `teammatch-verify` or `teammatch-walk`.

```bash
logq ui    # starts the shared Jaeger (logq-jaeger: UI and MCP on :16686, OTLP on :4318)
```

```bash
docker compose -p teammatch-logq -f compose.local.yml -f compose.logq.yml --env-file ~/.cache/teammatch-logq/logq.env up -d --build db redis storage storage-init api
```

The env file sits outside the repo (mode 600) and sets generated passwords plus the ports: api 8010, Postgres 5460, Redis 6396, storage 8340. The web container is not needed for the pilot.

## 3. Verification

| Check | Result |
|---|---|
| `X-Request-ID` on responses | Present on every response, 32 hex characters, equal to the trace ID (`POST /api/v1/projects/` → `d14cfd50…`). |
| `logq query -p teammatch-logq --trace <id>` | `01:10:55.235 api INFO POST /api/v1/projects/ 201 36ms process_response request finished trace=d14cfd50`, then `-- view in Jaeger: http://localhost:16686/trace/d14cfd50…`. |
| Django and SQL spans | `POST api/v1/projects/`: 5 spans (Django root, psycopg INSERT/SELECT). |
| Redis spans | `GET api/v1/health/`: Django root, `SELECT 1`, redis `PING`. |
| WebSocket spans | `/ws/teams/1/` chat post: 24 spans (asgi connect/receive/send, psycopg, redis `EVAL`, `ZADD`, `EXPIRE`, `BZPOPMIN`). |
| Storage spans | Not possible: no TeamMatch endpoint uses S3 yet (no `FileField`, no `default_storage` call), so botocore instrumentation was left out. |
| `logq follow` catches a forced error | With only `teammatch-logq-redis-1` stopped, `/readyz` returned 503. `follow` printed `! teammatch-logq-redis-1 died exit=0`, then `api ERROR 503 log_response Service Unavailable: /readyz trace=4f155331`, then `redis-1 started` after the restart. |
| Body capture on | Sign-in trace `0221c5bb…`: `http.request.body` = `{"email": "owner@latech.edu", "password": [REDACTED]}`. |
| Body capture off | Trace `9cae5c84…`: no body attributes on any span. |
| Tests | 7 new tests (`test_request_log.py`, `test_body_capture.py`) pass. Full backend suite: see §6. |

## 4. Contract gaps and observations

Compared with the para-dashboard pilot (gunicorn/WSGI):

Recurred, same fix:
- `OTEL_PYTHON_LOG_CORRELATION=true` needs `opentelemetry-instrumentation-logging`; the distro does not ship it.
- Django logs 4xx/5xx responses after the request span ends, so they carry `trace_id "0"`. Calling `django.utils.log.log_response()` inside the middleware fixes it; Django then skips its own copy.
- `logging.captureWarnings(True)` is needed for one-line JSON warnings.

Did not recur:
- `DJANGO_SETTINGS_MODULE` must be set before `opentelemetry-instrument` starts. Compose already sets it in the environment.
- boto3 thread spans: no S3 calls in TeamMatch.
- Forked workers: uvicorn `--reload` spawns a child process and its spans arrive without any hook.

New with ASGI and Channels:
- Django's instrumentation traces ASGI requests only when `opentelemetry-instrumentation-asgi` is installed too. The contract names only the Django package.
- WebSocket consumers get no span from the Django instrumentation. Wrapping the Channels router in `OpenTelemetryMiddleware` (`asgi.py`) gives each socket a trace, so consumer log lines carry a `trace_id`.
- An exception that escapes a consumer is logged by uvicorn (`Exception in ASGI application`) after the ASGI span has ended, so that line has no `trace=`. Same pattern as the 4xx gap; not fixed here.
- Configuring the `uvicorn` logger in Django's `LOGGING` makes `dictConfig` reset its existing child `uvicorn.access` to propagate, which undoes `--no-access-log`. Configure `uvicorn.error` only.
- The uvicorn reloader parent prints 3–4 plain-text lines before Django's `LOGGING` applies, and uvicorn adds a `color_message` field with ANSI codes on some startup lines.
- The compose healthcheck hits `/healthz` every 5 s. `OTEL_PYTHON_DJANGO_EXCLUDED_URLS` keeps it out of Jaeger, but it still writes an INFO `request finished` line each time (hidden at logq's default `warn` level).

logq and Jaeger:
- Jaeger 2.23 returns 404 for the v1 `/api/services` and `/api/traces?service=` endpoints; `/api/traces/<id>` still works, and `/api/v3/…` covers search.
- Body capture redacts `has_usable_password` (key contains "password"), a harmless false positive. Emails are not redacted.
- Records outside a request have `trace_id "0"` and an extra `otelTraceSampled` field.

## 5. Experiment: does logq help an agent debug?

**Question.** With the same app, logs and code, does a coding agent find a bug's root cause with less effort and less log reading when it has logq and the Jaeger MCP server, compared with the Docker CLI alone?

**This is n = 1 per cell (3 bugs × 2 conditions = 6 runs). It shows a trend; it does not prove a result.**

### Design

Three bugs were seeded, each on a local throwaway branch off this one (never pushed). Each branch was exported with `git archive` into its own folder without `.git`, so the agent could not find the change with `git diff`. Before each run, only the `api` container was recreated from that folder in the same `teammatch-logq` project, keeping the volumes. The script then signed in a seed account and triggered the symptom once, as the user would have.

| Bug | Seeded change | Symptom given to the agent | Evidence available |
|---|---|---|---|
| B1 endpoint 500 | `apps/matching/serializers.py:12`: `if not obj.skills_total:` became `if obj.skills_total is None:`. A role with no required skills (one added to the data) then divides by zero. | "The swipe deck won't load for students any more; it shows an error instead of cards. It happens with the candidate account." | 500 on `GET /api/v1/feed/`, `ZeroDivisionError` traceback in the api log, error span. |
| B2 slow endpoint, no errors | `apps/matching/services.py`: dropped `.select_related("project__owner__profile", "project__term").prefetch_related("required_skills")` from `feed_roles`. | "The swipe deck got noticeably slower after the last merge. Nothing errors, it is just slow. Seen with the candidate account." | Feed stays 200; 6 → 95 SQL queries and 48 → 171 ms (measured in Jaeger). No error lines. |
| B3 Channels/Redis | `config/settings/base.py:89`: channel layer `socket_timeout` 15 → 1, below the layer's 5 s blocking read. | "Team chat keeps disconnecting, and messages I send only show up for my teammates after they refresh the page. Seen on team 1 with the owner account." | The socket closes about 1.2 s after connecting; `redis.exceptions.TimeoutError` in `await_many_dispatch` in the api log. |

The planned storage bug was swapped for B2, because no TeamMatch endpoint uses S3.

**Agent.** Claude Code 2.1.317, headless (`claude -p --output-format stream-json --verbose`), model `claude-opus-5-5` for every run, `--max-turns 40`. A fresh session per run with a clean environment (`env -i`), `--setting-sources project,local` (no user settings, hooks or plugins), `--disable-slash-commands` and `--strict-mcp-config`. The working directory was the bug's exported tree.

**Conditions.**
- **A, Docker CLI only:** no MCP servers; `logq` and anything touching Jaeger's ports (16686, 4318) denied.
- **B, logq + Jaeger:** the docker-logs skill text appended to the system prompt (`--append-system-prompt-file`), and the `jaeger` MCP server (`http://localhost:16686/api/ai/mcp/`) allowed.
- **Both:** Bash, Read, Grep and Glob allowed. Edit, Write, WebFetch, WebSearch and subagents denied, as were `docker rm/stop/kill/restart`, `docker volume/system/context` and `docker compose … up/down/stop/restart/rm/kill`. A Haiku dry run checked these limits in both conditions before the Opus runs.

**Prompt** (identical in both conditions apart from the symptom):

> You are debugging TeamMatch, a Django 5.2 + DRF + Channels app. Its source is the current directory (there is no git history). It runs locally in Docker: compose project `teammatch-logq`, services api, db, redis, storage. The api serves http://localhost:8010 and runs ./backend bind-mounted, with auto-reload. [Helper scripts: sign in a seed account, call the API, post on a team chat socket.] A user reports: "<symptom>". Find the root cause. Rules: do not edit any file; change data only by using the app as a user would; touch only the teammatch-logq containers, never stop, restart, remove or recreate a container, never touch volumes; use only the current Docker context. End with `ROOT CAUSE: <file>:<line> — <one sentence>` and `FIX: <one sentence>`.

**Order.** For each bug, B ran before A, so an A run could not reuse traces from its own bug. A had no Jaeger access either way.

**Measures.** All measures come from the stream-json transcript.
- **Root cause:** graded against the seeded change.
- **Effort:** `num_turns`, tool calls, `duration_ms`, token usage (uncached input, cache write, cache read, output) and `total_cost_usd`.
- **Log + trace chars:** characters returned by Bash calls that ran `logq` or `docker … logs`, plus the `mcp__jaeger__*` tools.
- **All tool output chars:** characters from every tool result, including source reads.

Cost is the CLI's API-price figure. These runs used a Claude Max subscription, so they counted against plan usage rather than being billed.

### Results

| Run | Bug | Condition | Root cause | Turns | Tool calls | Wall (s) | Input | Cache write | Cache read | Output | Cost (USD) | Log + trace chars | All tool output chars |
|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| b1-B | B1 feed 500 | B logq + Jaeger | found | 9 | 8 | 32 | 18 | 15,143 | 227,855 | 2,130 | 0.209 | 5,679 | 14,674 |
| b1-A | B1 feed 500 | A docker CLI | found | 8 | 7 | 27 | 16 | 30,274 | 165,952 | 1,986 | 0.315 | 9,391 | 18,358 |
| b2-B | B2 feed N+1 | B logq + Jaeger | found | 14 | 13 | 37 | 28 | 21,236 | 330,683 | 3,076 | 0.298 | 11,505 | 23,948 |
| b2-A | B2 feed N+1 | A docker CLI | found | 13 | 12 | 37 | 24 | 24,634 | 375,926 | 3,164 | 0.336 | 7,836 | 45,272 |
| b3-B | B3 chat timeout | B logq + Jaeger | found | 4 | 3 | 22 | 8 | 16,526 | 91,292 | 1,624 | 0.183 | 5,481 | 18,400 |
| b3-A | B3 chat timeout | A docker CLI | found | 9 | 8 | 31 | 14 | 16,653 | 176,671 | 2,196 | 0.213 | 16,981 | 23,817 |

| Condition | Found | Turns | Tool calls | Wall (s) | Cache write | Cache read | Output | Cost (USD) | Log + trace chars | All tool output chars |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| B logq + Jaeger | 3/3 | 27 | 24 | 91 | 52,905 | 649,830 | 6,830 | 0.690 | 22,665 | 57,022 |
| A docker CLI | 3/3 | 30 | 27 | 95 | 71,561 | 718,549 | 7,346 | 0.863 | 34,208 | 87,447 |

All six runs gave the right file and cause. In B2, both runs pointed at the start of the `feed_roles` queryset (`services.py:33`/`:34`), because the removed lines no longer exist in that tree. Total for the six runs: $1.55 and 186 s of agent time.

How each run got there:
- **b1-B:** `logq ps`, called the feed, then `logq query --trace <X-Request-ID> --full` gave the traceback; read the serializer and the annotation.
- **b1-A:** `docker compose -p teammatch-logq logs api --since 5m | grep -B2 -A40 ZeroDivision`; read the serializer.
- **b2-B:** timed the feed and loaded the Jaeger tools. `logq query --trace` showed only the `request finished` line. `get_trace_topology` and `get_span_details` (9.8 k chars) showed the repeated SELECTs. Read the service and serializer, then found the feed's query-count test.
- **b2-A:** read views, services and serializers, found the same query-count test, timed the feed, then counted queries itself with `CaptureQueriesContext` in `manage.py shell` via `docker exec`. One call used `docker --context "$(docker context show)"`, which is the active context.
- **b3-B:** one call ran the chat helper and `logq query`, which surfaced the Redis `TimeoutError`. Then one Grep for `socket_timeout`. 3 tool calls in all.
- **b3-A:** read the consumer and chat service, ran the chat helper and `docker compose logs` (17 k chars), read the settings, then read channels_redis's source inside the container to confirm the 5 s blocking read.

No transcript contains a seed password, and no run read `accounts.env`.

### What the numbers suggest (trend only)

- **Success does not separate the conditions.** All three bugs were found in both. With JSON logs, source access and a test that spells out the feed's query budget, these bugs were easy for Opus either way.
- **Effort was a bit lower with logq + Jaeger:** 27 vs 30 turns, about 20 % lower cost, a third fewer log and trace characters, and 35 % less tool output overall. Almost all of the gap comes from B3 (4 vs 9 turns): one filtered `logq query` showed the Redis timeout, where A read 17 k characters of raw logs and library source.
- **Traces did not shorten the N+1 hunt.** In B2, Jaeger showed the repeated queries directly, but A got the same answer by counting queries in a Django shell, in the same number of turns.
- **Wall time** was 22–37 s per run, so a few seconds' difference is noise.

### Limitations

- n = 1 per cell, three bugs, one model, so it shows a trend, not proof. Repeating each cell 3–5 times would be the next step.
- B's system prompt is about 7 KB longer (the skill text). B also ran first for every bug.
- Both conditions had the pilot's JSON logs. This compares the tooling, not the logging contract.
- The agents had the full source, including tests; the feed's query-count test pointed both B2 runs at `select_related`.
- My estimate before the runs (4–10 min and 0.5–1.5 M input tokens per run) was far too high. The runs took 22–37 s and 0.09–0.38 M cache-read tokens each.

### Reproducing

The harness lives outside the repo in `~/.cache/tm-exp/`:
- `run.sh <b1|b2|b3> <A|B>` does one run.
- `swap.sh <tree>` recreates the api from a tree.
- `metrics.py` turns transcripts into the numbers above.
- `prompt-common.md` and `symptoms.tsv` hold the prompt.

The transcripts (`runs/*.jsonl`) stay there because they hold whole log excerpts. The bug branches are `exp/logq-b1-feed-500`, `exp/logq-b2-feed-n1` and `exp/logq-b3-chat-timeout` (local only).

## 6. Full backend suite

`ruff check`, `ruff format --check` and `pytest` on the pilot branch, under `config.settings.test`, in a one-off container of the dev image: **378 passed** in 100 s, lint clean.

```bash
docker compose -p teammatch-logq -f compose.local.yml --env-file ~/.cache/teammatch-logq/logq.env run --rm --no-deps -T -e DJANGO_SETTINGS_MODULE=config.settings.test api sh -c 'ruff check . && ruff format --check . && pytest -q'
```

Pass `-e DJANGO_SETTINGS_MODULE=config.settings.test` explicitly. pytest-django prefers that environment variable over `pyproject.toml`, and the api container sets it to `config.settings.local`. A first run through `docker exec` into the live api therefore ran under local settings, with Redis channels and a permissive origin check, and `test_another_origin_is_refused` failed (377 passed). That failure came from the setup, not from the code.

## 7. Demo steps for the video

Run from the worktree root, in this order. Each step lists what it shows on screen.

1. `logq ui`
   Starts (or confirms) the shared Jaeger container and prints the four `OTEL_*` lines an app needs.
2. `docker compose -p teammatch-logq -f compose.local.yml -f compose.logq.yml --env-file ~/.cache/teammatch-logq/logq.env up -d --wait api`
   Brings up db, redis, storage and the api. `--wait` returns once the api is healthy.
3. `logq ps -p teammatch-logq`
   One row per container with state and health; a container that is exited, restarting or unhealthy starts with `!`. Four rows: api, db, redis, storage (`up api` does not start `storage-init`, which nothing in the pilot needs).
4. `curl -si http://localhost:8010/api/v1/health/`
   The response headers include `x-request-id: <32 hex>`. Copy it.
5. `logq query -p teammatch-logq --trace <id>`
   The `request finished` line: method, route, status, duration, function, `trace=`. It ends with `-- view in Jaeger: http://localhost:16686/trace/<id>`.
6. In Claude Code: ask it to watch the project. It starts the Monitor tool with `logq follow -p teammatch-logq` (start line appears).
7. `docker stop teammatch-logq-redis-1`, then `curl -si http://localhost:8010/readyz`
   The curl returns 503. In Claude Code the Monitor shows `! teammatch-logq-redis-1 died exit=0` and `api ERROR 503 … Service Unavailable: /readyz trace=…`.
8. `docker start teammatch-logq-redis-1`
   The Monitor shows `! teammatch-logq-redis-1 started`, then Redis's WARN line about running without a password. `/readyz` returns 200 again (it can still be 503 for a second while Redis starts). Stop the Monitor.
9. Open the Jaeger link from step 5 in a browser (http://localhost:16686).
   The trace's span tree: the Django root span with its `SELECT 1` and redis `PING` children and their timings. Search service `api` to show other traces: operation `HTTP /ws/teams/1/` is a chat post, with the WebSocket spans and their redis and SQL children. Jaeger keeps traces in memory, so after it restarts post one first with `python3 ~/.cache/teammatch-logq/login.py owner` and `python3 ~/.cache/teammatch-logq/ws_chat.py 1`.
10. In Claude Code: "Use the Jaeger tools to show the topology and critical path of trace `<id>`."
    It calls `mcp__jaeger__get_trace_topology` and `mcp__jaeger__get_critical_path` and answers from the spans. Start that Claude Code session after step 1: the `jaeger` MCP server fails to connect if Jaeger is down at startup (reconnect it with `/mcp`).
11. Optional: section 5's results table, to close with the experiment.

The narrated script with timings and a pre-recording checklist is [logq-demo-script.md](logq-demo-script.md).
