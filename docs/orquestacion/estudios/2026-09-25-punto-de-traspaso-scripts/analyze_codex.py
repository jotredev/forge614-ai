#!/usr/bin/env python3
"""Q6: Codex rollouts analysis using data/codex_turns.csv + data/codex_sessions.csv."""
import csv, json, os, sys, statistics
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from pricing import codex_turn_cost, CODEX_TIER_THRESHOLD

OUT = "/private/tmp/claude-501/-Users-jorgeetrejoo-Desktop-forge614-ai/ac7d9050-8724-4a7b-9a7d-17038f96474a/scratchpad/traspaso"
DATA_DIR = os.path.join(OUT, "data")


def main():
    sessions = list(csv.DictReader(open(os.path.join(DATA_DIR, "codex_sessions.csv"))))
    turns_by_session = defaultdict(list)
    with open(os.path.join(DATA_DIR, "codex_turns.csv")) as f:
        for row in csv.DictReader(f):
            turns_by_session[row["rollout_file"]].append(row)

    session_rows = []
    n_over_window = 0
    n_sessions_with_data = 0
    ratios = []
    over_threshold_token_fracs = []

    for s in sessions:
        rf = s["rollout_file"]
        turns = turns_by_session.get(rf, [])
        mcw_str = s["model_context_windows"]
        mcw = None
        if mcw_str:
            try:
                mcw = max(int(x) for x in mcw_str.split(";") if x)
            except Exception:
                mcw = None
        max_ctx = int(s["max_context_seen"] or 0)
        ratio = (max_ctx / mcw) if mcw else None

        # per-turn cost using last_* (incremental) fields and the 272K tier
        total_cost = 0.0
        n_high_tier_turns = 0
        n_turns = len(turns)
        for t in turns:
            # current-turn context size (NOT the lifetime cumulative total_* counters)
            ctx_at_turn = int(t["last_input"] or 0) + int(t["last_cached"] or 0)
            cost, is_high = codex_turn_cost(
                int(t["last_input"] or 0), int(t["last_cached"] or 0),
                int(t["last_cache_write"] or 0), int(t["last_output"] or 0), ctx_at_turn)
            total_cost += cost
            if is_high:
                n_high_tier_turns += 1

        rl_first = s["rate_limit_primary_pct_first"]
        rl_last = s["rate_limit_primary_pct_last"]
        rl_delta = None
        if rl_first not in (None, "") and rl_last not in (None, ""):
            try:
                rl_delta = float(rl_last) - float(rl_first)
            except Exception:
                rl_delta = None

        total_tokens_session = 0
        if turns:
            last_turn = turns[-1]
            total_tokens_session = (int(last_turn["total_input"] or 0) + int(last_turn["total_cached"] or 0)
                                     + int(last_turn["total_output"] or 0))

        pct_per_million = None
        if rl_delta is not None and rl_delta > 0 and total_tokens_session > 0:
            pct_per_million = rl_delta / (total_tokens_session / 1_000_000.0)

        row = {
            "rollout_file": rf,
            "session_id": s["session_id"],
            "cwd": s["cwd"],
            "dominant_model": s["dominant_model"],
            "n_turns": n_turns,
            "max_context_seen": max_ctx,
            "model_context_window": mcw,
            "ratio_max_ctx_to_window": ratio,
            "n_compacted": int(s["n_compacted"] or 0),
            "n_high_tier_turns_gt272k": n_high_tier_turns,
            "frac_turns_over_272k": (n_high_tier_turns / n_turns) if n_turns else 0,
            "total_cost_usd_apiequiv": total_cost,
            "rate_limit_pct_first": rl_first,
            "rate_limit_pct_last": rl_last,
            "rate_limit_delta_pct": rl_delta,
            "total_tokens_session": total_tokens_session,
            "pct_weekly_limit_per_million_tokens": pct_per_million,
        }
        session_rows.append(row)
        if mcw:
            n_sessions_with_data += 1
            ratios.append(ratio)
            if ratio and ratio > 0.8:
                n_over_window += 1
        if n_turns:
            over_threshold_token_fracs.append(row["frac_turns_over_272k"])

    with open(os.path.join(DATA_DIR, "q6_codex_sessions.csv"), "w", newline="") as f:
        fields = list(session_rows[0].keys()) if session_rows else []
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in session_rows:
            w.writerow(r)

    session_rows_sorted_by_ctx = sorted(session_rows, key=lambda r: -r["max_context_seen"])
    compacted_sessions = [r for r in session_rows if r["n_compacted"] > 0]

    rl_deltas = [r["rate_limit_delta_pct"] for r in session_rows if r["rate_limit_delta_pct"] is not None]
    pct_per_m = [r["pct_weekly_limit_per_million_tokens"] for r in session_rows if r["pct_weekly_limit_per_million_tokens"] is not None]

    summary = {
        "n_sessions_total": len(session_rows),
        "n_sessions_with_context_window_data": n_sessions_with_data,
        "n_sessions_ratio_gt_80pct": n_over_window,
        "mean_ratio_max_ctx_to_window": statistics.mean(ratios) if ratios else None,
        "n_sessions_with_compaction": len(compacted_sessions),
        "n_sessions_with_turns_over_272k_tier": sum(1 for r in session_rows if r["n_high_tier_turns_gt272k"] > 0),
        "top10_by_max_context": [
            {"rollout_file": r["rollout_file"], "max_context_seen": r["max_context_seen"],
             "model_context_window": r["model_context_window"], "n_compacted": r["n_compacted"],
             "dominant_model": r["dominant_model"]}
            for r in session_rows_sorted_by_ctx[:10]
        ],
        "compacted_sessions_detail": [
            {"rollout_file": r["rollout_file"], "n_compacted": r["n_compacted"],
             "max_context_seen": r["max_context_seen"], "model_context_window": r["model_context_window"]}
            for r in compacted_sessions
        ],
        "rate_limit_delta_stats": {
            "n": len(rl_deltas),
            "mean": statistics.mean(rl_deltas) if rl_deltas else None,
            "median": statistics.median(rl_deltas) if rl_deltas else None,
            "max": max(rl_deltas) if rl_deltas else None,
        },
        "pct_weekly_limit_per_million_tokens_stats": {
            "n": len(pct_per_m),
            "mean": statistics.mean(pct_per_m) if pct_per_m else None,
            "median": statistics.median(pct_per_m) if pct_per_m else None,
        },
        "total_apiequiv_cost_usd": sum(r["total_cost_usd_apiequiv"] for r in session_rows),
        "dominant_models_seen": sorted(set(r["dominant_model"] for r in session_rows if r["dominant_model"])),
    }

    with open(os.path.join(DATA_DIR, "q6_summary.json"), "w") as f:
        json.dump(summary, f, indent=2, default=str)

    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
