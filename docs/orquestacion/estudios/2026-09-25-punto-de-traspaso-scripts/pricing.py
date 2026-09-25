"""
Pricing table, USD per million tokens.
Source: task instructions (Opus 5.5 / Sonnet 5 base prices) + models.dev snapshot
(/private/tmp/.../scratchpad/modelsdev.json, read 2026-09-25) for haiku/fable and to
confirm the cache-write-5m = 1.25x input assumption.

ASSUMPTION (stated explicitly, per task rules): cache_write_1h for haiku and fable is
NOT given directly by models.dev (which lists only the 5m/base write price). We extend
the same ratio observed for opus/sonnet (1h write = 2x input) to haiku/fable. This only
affects the small haiku/fable slice of the data (see Q7), not the primary Opus/Sonnet
orchestrator/worker analysis (Q1-Q5).
"""

PRICES = {
    "opus": {"input": 4.0, "cache_read": 0.2, "cache_write_5m": 5.0, "cache_write_1h": 8.0, "output": 20.0},
    "sonnet": {"input": 2.0, "cache_read": 0.2, "cache_write_5m": 2.5, "cache_write_1h": 4.0, "output": 10.0},
    "haiku": {"input": 1.0, "cache_read": 0.1, "cache_write_5m": 1.25, "cache_write_1h": 2.0, "output": 5.0},
    "fable": {"input": 10.0, "cache_read": 0.25, "cache_write_5m": 12.5, "cache_write_1h": 20.0, "output": 50.0},
}

# Codex (OpenAI) - gpt-5.6-terra, per models.dev, with the >272K-token context tier
# (informational / API-equivalent only: actual Codex billing is a subscription weekly
# quota, not $-per-token -- see Q6).
CODEX_PRICES_BASE = {"input": 2.0, "cache_read": 0.2, "cache_write": 2.5, "output": 12.0}
CODEX_PRICES_HIGH_TIER = {"input": 4.0, "cache_read": 0.4, "cache_write": 5.0, "output": 18.0}
CODEX_TIER_THRESHOLD = 272000


def model_family(model_str):
    m = (model_str or "").lower()
    if "opus" in m:
        return "opus"
    if "sonnet" in m:
        return "sonnet"
    if "haiku" in m:
        return "haiku"
    if "fable" in m:
        return "fable"
    return None  # <synthetic> or unknown -> excluded from cost calc


def message_cost(model, input_tok, cache_read, eph5m, eph1h, cache_creation_fallback, output_tok):
    fam = model_family(model)
    if fam is None:
        return None
    p = PRICES[fam]
    e5, e1h = eph5m or 0, eph1h or 0
    if e5 == 0 and e1h == 0 and (cache_creation_fallback or 0) > 0:
        # no cache_creation detail breakdown available -> assume default TTL (5m)
        e5 = cache_creation_fallback
    cost = (
        (input_tok or 0) * p["input"]
        + (cache_read or 0) * p["cache_read"]
        + e5 * p["cache_write_5m"]
        + e1h * p["cache_write_1h"]
        + (output_tok or 0) * p["output"]
    ) / 1_000_000.0
    return cost


def codex_turn_cost(input_tok, cached_tok, cache_write_tok, output_tok, context_at_turn):
    tier = CODEX_PRICES_HIGH_TIER if (context_at_turn or 0) > CODEX_TIER_THRESHOLD else CODEX_PRICES_BASE
    cost = (
        (input_tok or 0) * tier["input"]
        + (cached_tok or 0) * tier["cache_read"]
        + (cache_write_tok or 0) * tier["cache_write"]
        + (output_tok or 0) * tier["output"]
    ) / 1_000_000.0
    return cost, tier is CODEX_PRICES_HIGH_TIER
