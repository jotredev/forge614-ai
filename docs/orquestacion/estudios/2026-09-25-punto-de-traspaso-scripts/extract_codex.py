#!/usr/bin/env python3
"""
Read-only extraction of Codex rollouts (~/.codex/sessions/2026/**/rollout-*.jsonl).
Writes codex_turns.csv (one row per token_count event_msg, cumulative + last-turn usage)
and codex_sessions.csv (per-file summary: model(s), context window, compaction count,
rate_limits used_percent samples) into OUT/data/.

Never writes/modifies anything under ~/.codex. Skips any rollout-*.jsonl modified within
the last 10 minutes.
"""
import json, os, sys, time, csv, glob
from concurrent.futures import ProcessPoolExecutor, as_completed

HOME = os.path.expanduser("~")
SESS_ROOT = os.path.join(HOME, ".codex", "sessions")
OUT = "/private/tmp/claude-501/-Users-jorgeetrejoo-Desktop-forge614-ai/ac7d9050-8724-4a7b-9a7d-17038f96474a/scratchpad/traspaso"
DATA_DIR = os.path.join(OUT, "data")
os.makedirs(DATA_DIR, exist_ok=True)

SKIP_SECONDS = 600
NOW = time.time()


def list_target_files():
    files = []
    skipped = []
    for root, dirs, fnames in os.walk(SESS_ROOT):
        for fn in fnames:
            if not (fn.startswith("rollout-") and fn.endswith(".jsonl")):
                continue
            fp = os.path.join(root, fn)
            try:
                mtime = os.path.getmtime(fp)
            except OSError:
                continue
            if NOW - mtime < SKIP_SECONDS:
                skipped.append(fp)
                continue
            files.append(fp)
    return files, skipped


def process_file(fp):
    session_id = None
    cwd = ""
    originator = ""
    models_seen = {}  # model -> count of turn_context
    reasoning_efforts = set()
    model_context_windows = set()

    turns = []  # rows for codex_turns.csv
    n_compacted = 0
    compacted_ordinals = []
    rate_limit_samples = []  # (timestamp, used_percent_primary, used_percent_secondary)
    first_ts = None
    last_ts = None
    max_context_seen = 0
    n_event_lines = 0
    n_lines = 0
    parse_errors = 0

    current_model = ""

    try:
        with open(fp, "r", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                n_lines += 1
                try:
                    obj = json.loads(line)
                except Exception:
                    parse_errors += 1
                    continue

                t = obj.get("type")
                ts = obj.get("timestamp")
                if ts:
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

                if t == "session_meta":
                    p = obj.get("payload", {})
                    session_id = p.get("session_id") or p.get("id")
                    cwd = p.get("cwd", "")
                    originator = p.get("originator", "")

                elif t == "turn_context":
                    p = obj.get("payload", {})
                    m = p.get("model")
                    if m:
                        current_model = m
                        models_seen[m] = models_seen.get(m, 0) + 1
                    re_ = p.get("reasoning_effort")
                    if re_:
                        reasoning_efforts.add(str(re_))

                elif t == "compacted":
                    n_compacted += 1
                    compacted_ordinals.append(obj.get("ordinal"))

                elif t == "event_msg":
                    p = obj.get("payload", {})
                    pt = p.get("type")
                    if pt == "task_started":
                        mcw = p.get("model_context_window")
                        if mcw:
                            model_context_windows.add(mcw)
                    elif pt == "token_count":
                        n_event_lines += 1
                        info = p.get("info", {}) or {}
                        total = info.get("total_token_usage", {}) or {}
                        last = info.get("last_token_usage", {}) or {}
                        mcw = info.get("model_context_window")
                        if mcw:
                            model_context_windows.add(mcw)
                        # NOTE: total_token_usage is a LIFETIME cumulative counter across all
                        # turns of the session (billed-tokens-to-date), not the size of the
                        # context window at any point in time. The per-turn context size is
                        # last_token_usage.input_tokens + last_token_usage.cached_input_tokens
                        # (the size of the most recent API call's input), which is what we use
                        # here as "tokens in context" for Q6.
                        turn_ctx = (last.get("input_tokens", 0) or 0) + (last.get("cached_input_tokens", 0) or 0)
                        if turn_ctx > max_context_seen:
                            max_context_seen = turn_ctx
                        rl = p.get("rate_limits")
                        rl_primary = None
                        rl_secondary = None
                        if rl:
                            prim = rl.get("primary") or {}
                            sec = rl.get("secondary") or {}
                            rl_primary = prim.get("used_percent")
                            rl_secondary = sec.get("used_percent")
                            rate_limit_samples.append((ts, rl_primary, rl_secondary))
                        turns.append({
                            "timestamp": ts,
                            "model": current_model,
                            "model_context_window": mcw or "",
                            "total_input": total.get("input_tokens", 0) or 0,
                            "total_cached": total.get("cached_input_tokens", 0) or 0,
                            "total_cache_write": total.get("cache_write_input_tokens", 0) or 0,
                            "total_output": total.get("output_tokens", 0) or 0,
                            "total_reasoning_output": total.get("reasoning_output_tokens", 0) or 0,
                            "last_input": last.get("input_tokens", 0) or 0,
                            "last_cached": last.get("cached_input_tokens", 0) or 0,
                            "last_cache_write": last.get("cache_write_input_tokens", 0) or 0,
                            "last_output": last.get("output_tokens", 0) or 0,
                            "last_reasoning_output": last.get("reasoning_output_tokens", 0) or 0,
                            "rate_limit_primary_pct": rl_primary if rl_primary is not None else "",
                            "rate_limit_secondary_pct": rl_secondary if rl_secondary is not None else "",
                        })
    except Exception as e:
        return {"error": str(e), "fp": fp}

    rel = os.path.relpath(fp, SESS_ROOT)
    dominant_model = max(models_seen.items(), key=lambda kv: kv[1])[0] if models_seen else ""

    rl_primary_last = ""
    rl_primary_first = ""
    for smp in rate_limit_samples:
        if smp[1] is not None and smp[1] != "":
            if rl_primary_first == "":
                rl_primary_first = smp[1]
            rl_primary_last = smp[1]

    session_summary = {
        "rollout_file": rel,
        "session_id": session_id or "",
        "cwd": cwd,
        "originator": originator,
        "dominant_model": dominant_model,
        "models_seen": ";".join(f"{k}:{v}" for k, v in models_seen.items()),
        "reasoning_efforts": ";".join(sorted(reasoning_efforts)),
        "model_context_windows": ";".join(str(x) for x in sorted(model_context_windows)),
        "n_token_count_events": n_event_lines,
        "max_context_seen": max_context_seen,
        "n_compacted": n_compacted,
        "first_ts": first_ts or "",
        "last_ts": last_ts or "",
        "rate_limit_primary_pct_first": rl_primary_first,
        "rate_limit_primary_pct_last": rl_primary_last,
        "n_lines_raw": n_lines,
        "parse_errors": parse_errors,
    }

    return {
        "rel": rel,
        "session_id": session_id,
        "turns": turns,
        "session_summary": session_summary,
    }


def main():
    files, skipped = list_target_files()
    print(f"Target files: {len(files)}  Skipped (recent <10min): {len(skipped)}", file=sys.stderr)
    for s in skipped:
        print("SKIP:", s, file=sys.stderr)

    turns_csv = os.path.join(DATA_DIR, "codex_turns.csv")
    sess_csv = os.path.join(DATA_DIR, "codex_sessions.csv")

    turn_fields = ["rollout_file", "session_id", "timestamp", "model", "model_context_window",
                   "total_input", "total_cached", "total_cache_write", "total_output", "total_reasoning_output",
                   "last_input", "last_cached", "last_cache_write", "last_output", "last_reasoning_output",
                   "rate_limit_primary_pct", "rate_limit_secondary_pct"]
    sess_fields = ["rollout_file", "session_id", "cwd", "originator", "dominant_model", "models_seen",
                   "reasoning_efforts", "model_context_windows", "n_token_count_events", "max_context_seen",
                   "n_compacted", "first_ts", "last_ts", "rate_limit_primary_pct_first",
                   "rate_limit_primary_pct_last", "n_lines_raw", "parse_errors"]

    errors = []
    n_done = 0
    with open(turns_csv, "w", newline="") as tf, open(sess_csv, "w", newline="") as sf:
        tw = csv.DictWriter(tf, fieldnames=turn_fields)
        tw.writeheader()
        sw = csv.DictWriter(sf, fieldnames=sess_fields)
        sw.writeheader()

        with ProcessPoolExecutor(max_workers=10) as ex:
            futs = {ex.submit(process_file, fp): fp for fp in files}
            for fut in as_completed(futs):
                fp = futs[fut]
                try:
                    res = fut.result()
                except Exception as e:
                    errors.append((fp, str(e)))
                    continue
                if res is None or "error" in res:
                    errors.append((fp, res.get("error") if res else "None"))
                    continue
                sess_key = res["rel"]
                for row in res["turns"]:
                    row = dict(row)
                    row["rollout_file"] = sess_key
                    row["session_id"] = res["session_id"]
                    tw.writerow(row)
                sw.writerow(res["session_summary"])
                n_done += 1

    print(f"Done. Files processed: {n_done}. Errors: {len(errors)}", file=sys.stderr)
    for fp, e in errors[:20]:
        print("ERROR:", fp, e, file=sys.stderr)

    with open(os.path.join(DATA_DIR, "extract_codex_meta.json"), "w") as mfh:
        json.dump({
            "n_files_target": len(files),
            "n_files_skipped_recent": len(skipped),
            "skipped_files": skipped,
            "n_files_processed": n_done,
            "n_errors": len(errors),
            "errors": errors[:50],
        }, mfh, indent=2)


if __name__ == "__main__":
    main()
