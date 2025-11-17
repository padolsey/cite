# Test Logging Guide

LLM test runs now automatically capture raw payloads and responses to git-ignored files for analysis.

## Quick Start

### Run tests with logging enabled:

```bash
# Simple logging
pnpm test:llm:log

# Debug mode (more verbose)
pnpm test:llm:debug

# Or set manually
LOG_LLM_CALLS=true pnpm test:llm
```

### View logs:

```bash
# List all test sessions
ls test-logs/

# View latest session
ls -lt test-logs/ | head -2

# Check metadata
cat test-logs/2025-11-17T*/metadata.json

# View a specific call
cat test-logs/2025-11-17T*/call-0001-request.json | jq
cat test-logs/2025-11-17T*/call-0001-response.json | jq
```

## What Gets Logged

Each test run creates a timestamped directory with:

```
test-logs/2025-11-17T07-21-45/
├── metadata.json                 # Session info
├── summary.json                  # Created at end (total calls, duration)
├── session.jsonl                 # All calls in JSONL format
├── call-0001-request.json        # Request payload
├── call-0001-response.json       # Response with chunks
├── call-0002-request.json
└── call-0002-response.json
```

### Request Log Example

```json
{
  "call_id": 1,
  "timestamp": "2025-11-17T07:21:45.535Z",
  "type": "request",
  "model": "anthropic/claude-haiku-4.5",
  "request": {
    "messages": [
      {
        "role": "system",
        "content": "You are a mental health safety classifier..."
      },
      {
        "role": "user",
        "content": "What's the capital of France?"
      }
    ],
    "temperature": 0.1,
    "max_tokens": 1000
  }
}
```

### Response Log Example

```json
{
  "call_id": 1,
  "timestamp": "2025-11-17T07:21:47.792Z",
  "type": "response",
  "response": {
    "fullText": "<language>en</language>\n<reflection>...</reflection>\n<classification>CLASS_NONE</classification>",
    "chunks": [
      { "choices": [{ "delta": { "content": "<language>" } }] },
      { "choices": [{ "delta": { "content": "en" } }] }
    ]
  },
  "metadata": {
    "duration_ms": 2257
  }
}
```

## Analysis Examples

### Find slow calls

```bash
jq -s 'sort_by(.metadata.duration_ms) | reverse | .[0:5] | .[] | "\(.metadata.duration_ms)ms - call-\(.call_id)"' test-logs/*/call-*-response.json
```

### Count calls by model

```bash
jq -r '.model' test-logs/*/call-*-request.json | sort | uniq -c
```

### Extract all risk classifications

```bash
jq -r '.response.fullText' test-logs/*/call-*-response.json | grep -o 'CLASS_[A-Z]*' | sort | uniq -c
```

### Find all errors

```bash
jq 'select(.response.error != null)' test-logs/*/call-*-response.json
```

### Calculate average response time

```bash
jq -s 'map(.metadata.duration_ms) | add / length' test-logs/*/call-*-response.json
```

## Python Analysis

```python
import json
from pathlib import Path
from collections import Counter

# Load all calls from a session
session_dir = Path("test-logs/2025-11-17T07-21-45")

calls = []
for req_file in sorted(session_dir.glob("call-*-request.json")):
    call_id = req_file.stem.split("-")[1]
    resp_file = session_dir / f"call-{call_id}-response.json"

    with open(req_file) as f:
        request = json.load(f)
    with open(resp_file) as f:
        response = json.load(f)

    calls.append({
        "id": call_id,
        "model": request["model"],
        "user_message": request["request"]["messages"][-1]["content"],
        "response_text": response["response"]["fullText"],
        "duration_ms": response["metadata"]["duration_ms"],
        "error": response["response"].get("error")
    })

# Analyze
print(f"Total calls: {len(calls)}")
print(f"Average duration: {sum(c['duration_ms'] for c in calls) / len(calls):.2f}ms")
print(f"Models used: {Counter(c['model'] for c in calls)}")
print(f"Errors: {sum(1 for c in calls if c['error'])}")

# Find longest calls
longest = sorted(calls, key=lambda c: c["duration_ms"], reverse=True)[:3]
for call in longest:
    print(f"Call {call['id']}: {call['duration_ms']}ms - {call['user_message'][:50]}...")
```

## Clean Up

```bash
# Remove all logs
rm -rf test-logs/20*

# Remove logs older than 7 days
find test-logs -type d -name "20*" -mtime +7 -exec rm -rf {} \;

# Keep only latest 5 sessions
ls -t test-logs/ | tail -n +6 | xargs -I {} rm -rf test-logs/{}
```

## Privacy Note

⚠️ **These logs may contain sensitive test data.**

- Logs are git-ignored by default
- Never commit `test-logs/` to version control
- Be careful when sharing logs externally
- Consider redacting before sharing

## Implementation

The logging system is implemented in:
- `lib/utils/TestLogger.ts` - Logger singleton
- `lib/providers/OpenRouterProvider.ts` - Integration point

Controlled by environment variables:
- `LOG_LLM_CALLS=true` - Enable logging
- `DEBUG_LLM=true` - Additional debug info

See `test-logs/README.md` for more details.
