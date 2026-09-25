#!/usr/bin/env python3
"""
Q1, Q2, Q3, Q4, Q5, Q7 analysis over the extracted Claude Code data
(data/claude_messages.csv + data/claude_sessions.csv).
Writes JSON + CSV outputs into OUT/data/ for the report to cite.
"""
import csv, json, os, sys, math, statistics
from collections import defaultdict, Counter
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from pricing import message_cost, model_family, PRICES

OUT = "/private/tmp/claude-501/-Users-jorgeetrejoo-Desktop-forge614-ai/ac7d9050-8724-4a7b-9a7d-17038f96474a/scratchpad/traspaso"
DATA_DIR = os.path.join(OUT, "data")


def parse_ts(ts):
    if not ts:
        return None
    try:
        return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S.%fZ")
    except Exception:
        try:
            return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            return None


def load_sessions_meta():
    meta = {}
    with open(os.path.join(DATA_DIR, "claude_sessions.csv")) as f:
        for row in csv.DictReader(f):
            meta[row["session_key"]] = row
    return meta


def load_messages_by_session():
    by_session = defaultdict(list)
    with open(os.path.join(DATA_DIR, "claude_messages.csv")) as f:
        for row in csv.DictReader(f):
            by_session[row["session_key"]].append(row)
    return by_session


def enrich_session(session_key, rows, meta_row):
    """Return list of enriched message dicts (sorted by ts) + session aggregates."""
    enriched = []
    for r in rows:
        ts = parse_ts(r["timestamp"])
        inp = int(r["input"] or 0)
        cread = int(r["cache_read"] or 0)
        ccreate = int(r["cache_creation"] or 0)
        e5 = int(r["eph5m"] or 0)
        e1h = int(r["eph1h"] or 0)
        outp = int(r["output"] or 0)
        context = inp + cread + ccreate
        cost = message_cost(r["model"], inp, cread, e5, e1h, ccreate, outp)
        enriched.append({
            "ts": ts, "ts_raw": r["timestamp"], "model": r["model"], "fam": model_family(r["model"]),
            "input": inp, "cache_read": cread, "cache_creation": ccreate, "eph5m": e5, "eph1h": e1h,
            "output": outp, "context": context, "cost": cost,
        })
    enriched = [e for e in enriched if e["ts"] is not None]
    enriched.sort(key=lambda e: e["ts"])
    for i, e in enumerate(enriched):
        if i == 0:
            e["gap_min"] = None
        else:
            e["gap_min"] = (e["ts"] - enriched[i - 1]["ts"]).total_seconds() / 60.0
        e["idx"] = i
    return enriched


def linreg(xs, ys):
    """Simple least squares y = a + b*x. Returns (a, b, r2, n)."""
    n = len(xs)
    if n < 2:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    if sxx == 0:
        return None
    b = sxy / sxx
    a = my - b * mx
    # r2
    ss_tot = sum((y - my) ** 2 for y in ys)
    ss_res = sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else None
    return {"a": a, "b": b, "r2": r2, "n": n}


def main():
    meta = load_sessions_meta()
    msgs_by_session = load_messages_by_session()

    all_sessions = {}
    for sk, rows in msgs_by_session.items():
        mrow = meta.get(sk, {})
        enriched = enrich_session(sk, rows, mrow)
        if not enriched:
            continue
        fam_counts = Counter(e["fam"] for e in enriched if e["fam"])
        dominant_fam = fam_counts.most_common(1)[0][0] if fam_counts else None
        total_cost = sum(e["cost"] for e in enriched if e["cost"] is not None)
        cost_input = sum(e["input"] * PRICES[e["fam"]]["input"] / 1e6 for e in enriched if e["fam"])
        cost_cache_read = sum(e["cache_read"] * PRICES[e["fam"]]["cache_read"] / 1e6 for e in enriched if e["fam"])
        cost_cache_write = sum(
            (e["eph5m"] * PRICES[e["fam"]]["cache_write_5m"] + e["eph1h"] * PRICES[e["fam"]]["cache_write_1h"]) / 1e6
            for e in enriched if e["fam"]
        )
        cost_output = sum(e["output"] * PRICES[e["fam"]]["output"] / 1e6 for e in enriched if e["fam"])
        max_context = max((e["context"] for e in enriched), default=0)
        all_sessions[sk] = {
            "meta": mrow,
            "messages": enriched,
            "n_messages": len(enriched),
            "dominant_fam": dominant_fam,
            "fam_counts": dict(fam_counts),
            "total_cost": total_cost,
            "cost_input": cost_input,
            "cost_cache_read": cost_cache_read,
            "cost_cache_write": cost_cache_write,
            "cost_output": cost_output,
            "max_context": max_context,
            "project_dir": mrow.get("project_dir", ""),
            "is_subagent": mrow.get("is_subagent", "0") == "1",
        }

    # ---- classify orchestrator vs worker ----
    def is_orchestrator(s):
        return (not s["is_subagent"]) and s["project_dir"] == "-Users-jorgeetrejoo-Desktop-forge614-ai" and s["dominant_fam"] == "opus"

    def is_worker(s):
        return not is_orchestrator(s)

    ge30 = {sk: s for sk, s in all_sessions.items() if s["n_messages"] >= 30}
    orchestrators_ge30 = {sk: s for sk, s in ge30.items() if is_orchestrator(s)}
    workers_ge30 = {sk: s for sk, s in ge30.items() if is_worker(s) and not s["is_subagent"]}
    subagents_ge30 = {sk: s for sk, s in ge30.items() if s["is_subagent"]}

    # =========================== Q1 ===========================
    q1_session_rows = []
    for sk, s in sorted(ge30.items(), key=lambda kv: -kv[1]["total_cost"]):
        q1_session_rows.append({
            "session_key": sk,
            "project_dir": s["project_dir"],
            "is_subagent": s["is_subagent"],
            "dominant_fam": s["dominant_fam"],
            "n_messages": s["n_messages"],
            "max_context": s["max_context"],
            "total_cost": round(s["total_cost"], 4),
            "cost_input": round(s["cost_input"], 4),
            "cost_cache_read": round(s["cost_cache_read"], 4),
            "cost_cache_write": round(s["cost_cache_write"], 4),
            "cost_output": round(s["cost_output"], 4),
            "first_ts": s["messages"][0]["ts_raw"],
            "last_ts": s["messages"][-1]["ts_raw"],
        })
    with open(os.path.join(DATA_DIR, "q1_sessions_ge30.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(q1_session_rows[0].keys()) if q1_session_rows else [
            "session_key", "project_dir", "is_subagent", "dominant_fam", "n_messages", "max_context",
            "total_cost", "cost_input", "cost_cache_read", "cost_cache_write", "cost_output", "first_ts", "last_ts"])
        w.writeheader()
        for row in q1_session_rows:
            w.writerow(row)

    # cost ~ a + b*context regression per model family, using message-level pairs from ge30 sessions
    fam_xy = defaultdict(lambda: ([], []))
    for sk, s in ge30.items():
        for e in s["messages"]:
            if e["fam"] and e["cost"] is not None:
                fam_xy[e["fam"]][0].append(e["context"])
                fam_xy[e["fam"]][1].append(e["cost"])
    fam_fits = {}
    for fam, (xs, ys) in fam_xy.items():
        fit = linreg(xs, ys)
        fam_fits[fam] = fit

    # =========================== Q2: cache rebuilds ===========================
    rebuild_rows = []
    for sk, s in all_sessions.items():
        for e in s["messages"]:
            if e["idx"] == 0 or e["context"] == 0:
                continue
            if e["cache_creation"] > 0.5 * e["context"] and e["fam"]:
                ttl = "1h" if e["eph1h"] > e["eph5m"] else "5m"
                write_cost = (e["eph5m"] * PRICES[e["fam"]]["cache_write_5m"] + e["eph1h"] * PRICES[e["fam"]]["cache_write_1h"]) / 1e6
                rebuild_rows.append({
                    "session_key": sk, "fam": e["fam"], "is_orchestrator": is_orchestrator(s),
                    "project_dir": s["project_dir"],
                    "gap_min": e["gap_min"], "context": e["context"], "cache_creation": e["cache_creation"],
                    "ttl": ttl, "msg_cost": e["cost"], "write_cost": write_cost, "ts": e["ts_raw"],
                })
    with open(os.path.join(DATA_DIR, "q2_rebuilds.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["session_key", "fam", "is_orchestrator", "project_dir", "gap_min",
                                           "context", "cache_creation", "ttl", "msg_cost", "write_cost", "ts"])
        w.writeheader()
        for row in rebuild_rows:
            w.writerow(row)

    gaps = [r["gap_min"] for r in rebuild_rows if r["gap_min"] is not None]
    ttl_counts = Counter(r["ttl"] for r in rebuild_rows)
    rebuild_cost_total = sum(r["write_cost"] for r in rebuild_rows)

    # fraction of each orchestrator session's cost from rebuild messages
    orch_rebuild_fracs = []
    for sk, s in orchestrators_ge30.items():
        sess_rebuilds = [r for r in rebuild_rows if r["session_key"] == sk]
        rebuild_cost = sum(r["write_cost"] for r in sess_rebuilds)
        frac = rebuild_cost / s["total_cost"] if s["total_cost"] > 0 else 0
        orch_rebuild_fracs.append({"session_key": sk, "rebuild_cost": rebuild_cost,
                                    "total_cost": s["total_cost"], "frac": frac, "n_rebuilds": len(sess_rebuilds)})

    # =========================== Q3: handoff boot cost ===========================
    handoff_rows = []
    for sk, s in all_sessions.items():
        mrow = s["meta"]
        if mrow.get("is_handoff") != "1":
            continue
        boot_ts_raw = mrow.get("boot_ts") or ""
        boot_ts = parse_ts(boot_ts_raw) if boot_ts_raw else None
        if boot_ts is None:
            continue
        boot_context = mrow.get("boot_context")
        boot_context = int(boot_context) if boot_context not in (None, "") else None
        boot_cost = 0.0
        boot_msgs = 0
        for e in s["messages"]:
            if e["ts"] is not None and e["ts"] <= boot_ts:
                if e["cost"] is not None:
                    boot_cost += e["cost"]
                boot_msgs += 1
        handoff_rows.append({
            "session_key": sk, "project_dir": s["project_dir"], "dominant_fam": s["dominant_fam"],
            "boot_rule": mrow.get("boot_rule"), "boot_context_C0": boot_context, "boot_cost_usd": boot_cost,
            "boot_n_messages": boot_msgs, "first_user_text": mrow.get("first_user_text", "")[:120],
        })
    with open(os.path.join(DATA_DIR, "q3_handoff_boot.csv"), "w", newline="") as f:
        fields = ["session_key", "project_dir", "dominant_fam", "boot_rule", "boot_context_C0",
                   "boot_cost_usd", "boot_n_messages", "first_user_text"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in handoff_rows:
            w.writerow(row)

    # =========================== Q4: growth per message g, for opus orchestrators ===========================
    growth_deltas = []
    for sk, s in orchestrators_ge30.items():
        msgs = s["messages"]
        for i in range(1, len(msgs)):
            d = msgs[i]["context"] - msgs[i - 1]["context"]
            growth_deltas.append(d)
    g_mean = statistics.mean(growth_deltas) if growth_deltas else 0
    g_median = statistics.median(growth_deltas) if growth_deltas else 0

    # H (boot cost) and C0 for opus orchestrator handoff sessions specifically
    orch_handoff = [r for r in handoff_rows if r["project_dir"] == "-Users-jorgeetrejoo-Desktop-forge614-ai" and r["dominant_fam"] == "opus"]
    H_values = [r["boot_cost_usd"] for r in orch_handoff]
    C0_values = [r["boot_context_C0"] for r in orch_handoff if r["boot_context_C0"] is not None]
    H_mean = statistics.mean(H_values) if H_values else None
    H_median = statistics.median(H_values) if H_values else None
    C0_mean = statistics.mean(C0_values) if C0_values else None
    C0_median = statistics.median(C0_values) if C0_values else None

    opus_fit = fam_fits.get("opus")

    def cost_per_productive_message(T, a, b, H, C0, g):
        """Average $/productive-message over a long job with handoff threshold T.
        A 'window' runs from C0 to T, adding g tokens/message => N = (T - C0) / g messages.
        Cost per window = H (boot) + sum_{k=0}^{N-1} (a + b*(C0 + k*g))  approx integral.
        Average context in window = (C0 + T) / 2.
        cost_per_window ~= H + N * (a + b * (C0+T)/2)
        cost_per_message = cost_per_window / N = H/N + a + b*(C0+T)/2
        """
        if g <= 0 or T <= C0:
            return None
        N = (T - C0) / g
        if N <= 0:
            return None
        avg_ctx = (C0 + T) / 2
        cost_per_window = H + N * (a + b * avg_ctx)
        return cost_per_window / N, N

    q4_curve = []
    if opus_fit and H_mean is not None and C0_mean is not None and g_mean > 0:
        a, b = opus_fit["a"], opus_fit["b"]
        for T in [150_000, 200_000, 250_000, 300_000, 400_000, 500_000, 700_000]:
            res = cost_per_productive_message(T, a, b, H_mean, C0_mean, g_mean)
            if res:
                cpm, N = res
                q4_curve.append({"T": T, "cost_per_msg": cpm, "N_msgs_per_window": N})

    # find approx optimum by scanning finer grid
    q4_fine = []
    if opus_fit and H_mean is not None and C0_mean is not None and g_mean > 0:
        a, b = opus_fit["a"], opus_fit["b"]
        T = int(C0_mean) + int(g_mean) + 10000
        best = None
        while T <= 900_000:
            res = cost_per_productive_message(T, a, b, H_mean, C0_mean, g_mean)
            if res:
                cpm, N = res
                q4_fine.append((T, cpm))
                if best is None or cpm < best[1]:
                    best = (T, cpm)
            T += 5000
    q4_optimum = best if q4_fine else None

    # =========================== Q5: sonnet workers + subagents (lighter) ===========================
    worker_all = {sk: s for sk, s in all_sessions.items() if not s["is_subagent"] and not is_orchestrator(s)}
    worker_lengths = [s["n_messages"] for s in worker_all.values()]
    worker_max_contexts = [s["max_context"] for s in worker_all.values()]
    subagent_all = {sk: s for sk, s in all_sessions.items() if s["is_subagent"]}
    subagent_lengths = [s["n_messages"] for s in subagent_all.values()]
    subagent_max_contexts = [s["max_context"] for s in subagent_all.values()]

    sonnet_fit = fam_fits.get("sonnet")

    # =========================== Q7: top offenders ===========================
    all_msg_rows = []
    for sk, s in all_sessions.items():
        for e in s["messages"]:
            if e["cost"] is not None:
                all_msg_rows.append({
                    "session_key": sk, "project_dir": s["project_dir"], "is_subagent": s["is_subagent"],
                    "fam": e["fam"], "ts": e["ts_raw"], "context": e["context"], "cache_creation": e["cache_creation"],
                    "output": e["output"], "cost": e["cost"],
                })
    all_msg_rows.sort(key=lambda r: -r["cost"])
    top5_msgs = all_msg_rows[:5]
    grand_total_cost = sum(r["cost"] for r in all_msg_rows)
    top5_share = sum(r["cost"] for r in top5_msgs) / grand_total_cost if grand_total_cost else 0

    # sessions with many small messages (n_messages high, avg context low) - overhead pattern
    chatty_sessions = []
    for sk, s in all_sessions.items():
        if s["n_messages"] >= 30:
            avg_ctx = sum(e["context"] for e in s["messages"]) / s["n_messages"]
            chatty_sessions.append((sk, s["n_messages"], avg_ctx, s["total_cost"], s["project_dir"]))
    chatty_sessions.sort(key=lambda r: r[1], reverse=True)

    summary = {
        "n_total_sessions": len(all_sessions),
        "n_sessions_ge30": len(ge30),
        "n_orchestrators_ge30": len(orchestrators_ge30),
        "n_workers_ge30": len(workers_ge30),
        "n_subagents_ge30": len(subagents_ge30),
        "q1_fam_fits": fam_fits,
        "q2_n_rebuilds": len(rebuild_rows),
        "q2_rebuild_cost_total_usd": rebuild_cost_total,
        "q2_ttl_counts": dict(ttl_counts),
        "q2_gap_stats": {
            "n": len(gaps),
            "mean": statistics.mean(gaps) if gaps else None,
            "median": statistics.median(gaps) if gaps else None,
            "p90": (sorted(gaps)[int(0.9 * len(gaps))] if gaps else None),
            "max": max(gaps) if gaps else None,
        },
        "q2_orch_rebuild_fracs": orch_rebuild_fracs,
        "q3_handoff_sessions_n": len(handoff_rows),
        "q3_H_mean_usd": H_mean, "q3_H_median_usd": H_median,
        "q3_C0_mean": C0_mean, "q3_C0_median": C0_median,
        "q3_rows": handoff_rows,
        "q4_g_mean": g_mean, "q4_g_median": g_median,
        "q4_curve": q4_curve,
        "q4_optimum": q4_optimum,
        "q4_opus_fit": opus_fit,
        "q5_sonnet_fit": sonnet_fit,
        "q5_worker_n_sessions": len(worker_all),
        "q5_worker_len_stats": {
            "max": max(worker_lengths) if worker_lengths else None,
            "mean": statistics.mean(worker_lengths) if worker_lengths else None,
            "median": statistics.median(worker_lengths) if worker_lengths else None,
            "n_ge30": sum(1 for l in worker_lengths if l >= 30),
        },
        "q5_worker_max_context_stats": {
            "max": max(worker_max_contexts) if worker_max_contexts else None,
            "mean": statistics.mean(worker_max_contexts) if worker_max_contexts else None,
        },
        "q5_subagent_n_sessions": len(subagent_all),
        "q5_subagent_len_stats": {
            "max": max(subagent_lengths) if subagent_lengths else None,
            "mean": statistics.mean(subagent_lengths) if subagent_lengths else None,
            "median": statistics.median(subagent_lengths) if subagent_lengths else None,
            "n_ge30": sum(1 for l in subagent_lengths if l >= 30),
        },
        "q5_subagent_max_context_stats": {
            "max": max(subagent_max_contexts) if subagent_max_contexts else None,
            "mean": statistics.mean(subagent_max_contexts) if subagent_max_contexts else None,
        },
        "q7_grand_total_cost_usd": grand_total_cost,
        "q7_top5_msgs": top5_msgs,
        "q7_top5_share": top5_share,
        "q7_chattiest_sessions_top5": chatty_sessions[:5],
    }

    with open(os.path.join(DATA_DIR, "analysis_summary.json"), "w") as f:
        json.dump(summary, f, indent=2, default=str)

    print(json.dumps({k: v for k, v in summary.items() if k not in (
        "q3_rows", "q7_top5_msgs", "q7_chattiest_sessions_top5", "q2_orch_rebuild_fracs")}, indent=2, default=str))


if __name__ == "__main__":
    main()
