#!/usr/bin/env python3
"""
Read-only extraction of Claude Code transcripts (~/.claude/projects/*.jsonl and subagents/*.jsonl).
Writes messages.csv (one row per deduped assistant message) and sessions.csv (per-file summary,
including handoff/boot detection for Q3) into OUT/data/.

Never writes/modifies anything under ~/.claude. Skips any .jsonl modified within the last 10 minutes.
"""
import json, os, sys, time, csv, glob
from concurrent.futures import ProcessPoolExecutor, as_completed

HOME = os.path.expanduser("~")
PROJECTS_ROOT = os.path.join(HOME, ".claude", "projects")
OUT = "/private/tmp/claude-501/-Users-jorgeetrejoo-Desktop-forge614-ai/ac7d9050-8724-4a7b-9a7d-17038f96474a/scratchpad/traspaso"
DATA_DIR = os.path.join(OUT, "data")
os.makedirs(DATA_DIR, exist_ok=True)

SKIP_SECONDS = 600
NOW = time.time()

HANDOFF_KEYWORDS = ["traspaso", "retomar", "orquestador"]


def list_target_files():
    files = []
    skipped = []
    for root, dirs, fnames in os.walk(PROJECTS_ROOT):
        for fn in fnames:
            if not fn.endswith(".jsonl"):
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


def session_key_for(fp):
    rel = os.path.relpath(fp, PROJECTS_ROOT)
    return rel[:-6] if rel.endswith(".jsonl") else rel  # strip .jsonl


def project_dir_for(fp):
    rel = os.path.relpath(fp, PROJECTS_ROOT)
    return rel.split(os.sep)[0]


def get_text_from_user_content(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, dict) and c.get("type") == "text":
                parts.append(c.get("text", ""))
        return "\n".join(parts)
    return ""


def process_file(fp):
    session_key = session_key_for(fp)
    project_dir = project_dir_for(fp)
    is_subagent = "/subagents/" in fp or fp.replace("\\", "/").find("/subagents/") >= 0
    agent_type = ""
    if is_subagent:
        meta_fp = fp[:-6] + ".meta.json"
        if os.path.exists(meta_fp):
            try:
                with open(meta_fp) as mf:
                    meta = json.load(mf)
                    agent_type = meta.get("agentType", "") + "|" + meta.get("model", "")
            except Exception:
                pass

    dedup = {}  # id -> record dict
    first_seen_ts = {}  # id -> first timestamp string seen

    first_user_text = None
    first_user_ts = None
    cwd = ""
    git_branch = ""

    boot_ts = None
    boot_rule = None
    boot_context = None
    boot_message_id = None

    n_lines = 0
    parse_errors = 0

    try:
        size = os.path.getsize(fp)
        mtime = os.path.getmtime(fp)
    except OSError:
        size = 0
        mtime = 0

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

                if not cwd and obj.get("cwd"):
                    cwd = obj.get("cwd")
                if not git_branch and obj.get("gitBranch"):
                    git_branch = obj.get("gitBranch")

                if t == "user" and first_user_text is None:
                    msg = obj.get("message", {})
                    if msg.get("role") == "user":
                        txt = get_text_from_user_content(msg.get("content"))
                        if txt:
                            first_user_text = txt[:500]
                            first_user_ts = obj.get("timestamp")

                if t == "assistant":
                    msg = obj.get("message", {})
                    mid = msg.get("id")
                    ts = obj.get("timestamp")
                    model = msg.get("model", "")
                    usage = msg.get("usage", {}) or {}
                    cache_creation_detail = usage.get("cache_creation", {}) or {}

                    if mid not in dedup:
                        dedup[mid] = {
                            "timestamp": ts,
                            "model": model,
                            "input": usage.get("input_tokens", 0) or 0,
                            "cache_read": usage.get("cache_read_input_tokens", 0) or 0,
                            "cache_creation": usage.get("cache_creation_input_tokens", 0) or 0,
                            "eph5m": cache_creation_detail.get("ephemeral_5m_input_tokens", 0) or 0,
                            "eph1h": cache_creation_detail.get("ephemeral_1h_input_tokens", 0) or 0,
                            "output": usage.get("output_tokens", 0) or 0,
                        }
                        first_seen_ts[mid] = ts

                    # boot detection: scan content blocks in file order (first occurrence wins)
                    if boot_ts is None:
                        content = msg.get("content", [])
                        if isinstance(content, list):
                            for c in content:
                                if not isinstance(c, dict):
                                    continue
                                if c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task"):
                                    boot_ts = ts
                                    boot_rule = "first_agent_tool_use"
                                    boot_message_id = mid
                                    break
                                if c.get("type") == "text" and "```" in (c.get("text") or ""):
                                    boot_ts = ts
                                    boot_rule = "first_codeblock_text"
                                    boot_message_id = mid
                                    break
    except Exception as e:
        return {
            "error": str(e),
            "fp": fp,
        }

    # compute boot_context from the dedup record of boot_message_id (usage is identical across dup lines)
    if boot_message_id is not None and boot_message_id in dedup:
        rec = dedup[boot_message_id]
        boot_context = rec["input"] + rec["cache_read"] + rec["cache_creation"]

    # ordered list of messages by timestamp for boot cost accumulation
    msg_rows = []
    for mid, rec in dedup.items():
        msg_rows.append((first_seen_ts.get(mid) or rec["timestamp"], mid, rec))
    msg_rows.sort(key=lambda r: (r[0] or ""))

    session_summary = {
        "session_key": session_key,
        "project_dir": project_dir,
        "is_subagent": int(bool(is_subagent)),
        "agent_type": agent_type,
        "n_assistant_msgs": len(dedup),
        "n_lines_raw": n_lines,
        "parse_errors": parse_errors,
        "first_ts": msg_rows[0][0] if msg_rows else "",
        "last_ts": msg_rows[-1][0] if msg_rows else "",
        "cwd": cwd,
        "git_branch": git_branch,
        "file_size": size,
        "mtime": mtime,
        "first_user_text": (first_user_text or "").replace("\n", " ").replace("\r", " ")[:300],
        "first_user_ts": first_user_ts or "",
        "is_handoff": int(bool(first_user_text and any(k in first_user_text.lower() for k in HANDOFF_KEYWORDS))),
        "boot_rule": boot_rule or "",
        "boot_ts": boot_ts or "",
        "boot_context": boot_context if boot_context is not None else "",
    }

    return {
        "session_key": session_key,
        "project_dir": project_dir,
        "is_subagent": int(bool(is_subagent)),
        "agent_type": agent_type,
        "messages": [
            {
                "session_key": session_key,
                "is_subagent": int(bool(is_subagent)),
                "agent_type": agent_type,
                "message_id": mid,
                "timestamp": ts,
                "model": rec["model"],
                "input": rec["input"],
                "cache_read": rec["cache_read"],
                "cache_creation": rec["cache_creation"],
                "eph5m": rec["eph5m"],
                "eph1h": rec["eph1h"],
                "output": rec["output"],
            }
            for ts, mid, rec in msg_rows
        ],
        "session_summary": session_summary,
    }


def main():
    files, skipped = list_target_files()
    print(f"Target files: {len(files)}  Skipped (recent <10min): {len(skipped)}", file=sys.stderr)
    for s in skipped:
        print("SKIP:", s, file=sys.stderr)

    msg_csv_path = os.path.join(DATA_DIR, "claude_messages.csv")
    sess_csv_path = os.path.join(DATA_DIR, "claude_sessions.csv")

    msg_fields = ["session_key", "is_subagent", "agent_type", "message_id", "timestamp",
                  "model", "input", "cache_read", "cache_creation", "eph5m", "eph1h", "output"]
    sess_fields = ["session_key", "project_dir", "is_subagent", "agent_type", "n_assistant_msgs",
                   "n_lines_raw", "parse_errors", "first_ts", "last_ts", "cwd", "git_branch",
                   "file_size", "mtime", "first_user_text", "first_user_ts", "is_handoff",
                   "boot_rule", "boot_ts", "boot_context"]

    errors = []
    n_done = 0
    with open(msg_csv_path, "w", newline="") as mf, open(sess_csv_path, "w", newline="") as sf:
        mw = csv.DictWriter(mf, fieldnames=msg_fields)
        mw.writeheader()
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
                    errors.append((fp, res.get("error") if res else "None result"))
                    continue
                for row in res["messages"]:
                    mw.writerow(row)
                sw.writerow(res["session_summary"])
                n_done += 1
                if n_done % 100 == 0:
                    print(f"processed {n_done}/{len(files)}", file=sys.stderr)

    print(f"Done. Files processed: {n_done}. Errors: {len(errors)}", file=sys.stderr)
    for fp, e in errors[:20]:
        print("ERROR:", fp, e, file=sys.stderr)

    with open(os.path.join(DATA_DIR, "extract_claude_meta.json"), "w") as mfh:
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
