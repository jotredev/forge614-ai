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


def cache_write_amounts(eph5m, eph1h, cache_creation_fallback):
    """Split a message's cache-write tokens into (5m-TTL, 1h-TTL) amounts, applying the
    same "no breakdown -> assume default TTL (5m)" fallback used by message_cost. Shared
    helper so every place that reports a cache-write cost breakdown (message_cost itself,
    and the Q1/Q2 per-session cost_cache_write / write_cost aggregates in analyze_claude.py)
    uses the identical rule and the breakdown always sums back to the total (H2, PR #14
    CodeRabbit review: analyze_claude.py used to apply the fallback only inside
    message_cost, so cost_cache_write/write_cost showed $0 for messages that message_cost
    itself charged for)."""
    e5, e1h = eph5m or 0, eph1h or 0
    if e5 == 0 and e1h == 0 and (cache_creation_fallback or 0) > 0:
        e5 = cache_creation_fallback
    return e5, e1h


def message_cost(model, input_tok, cache_read, eph5m, eph1h, cache_creation_fallback, output_tok):
    fam = model_family(model)
    if fam is None:
        return None
    p = PRICES[fam]
    e5, e1h = cache_write_amounts(eph5m, eph1h, cache_creation_fallback)
    cost = (
        (input_tok or 0) * p["input"]
        + (cache_read or 0) * p["cache_read"]
        + e5 * p["cache_write_5m"]
        + e1h * p["cache_write_1h"]
        + (output_tok or 0) * p["output"]
    ) / 1_000_000.0
    return cost


def codex_turn_cost(input_tok, cached_tok, cache_write_tok, output_tok, context_at_turn):
    """context_at_turn and input_tok are both last_token_usage.input_tokens (which already
    INCLUDES cached_tok as a subset -- see extract_codex.py). Charge the non-cached part of
    input_tok at the full input price and the cached part at the (cheaper) cache-read price;
    charging input_tok in full AND cached_tok again on top double-counts the cached tokens
    (H3, PR #14 CodeRabbit review, fixed 2026-09-26)."""
    tier = CODEX_PRICES_HIGH_TIER if (context_at_turn or 0) > CODEX_TIER_THRESHOLD else CODEX_PRICES_BASE
    cached_tok = cached_tok or 0
    non_cached_input = max((input_tok or 0) - cached_tok, 0)
    cost = (
        non_cached_input * tier["input"]
        + cached_tok * tier["cache_read"]
        + (cache_write_tok or 0) * tier["cache_write"]
        + (output_tok or 0) * tier["output"]
    ) / 1_000_000.0
    return cost, tier is CODEX_PRICES_HIGH_TIER
