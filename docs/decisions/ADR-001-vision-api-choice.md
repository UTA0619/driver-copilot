# ADR-001: Vision API Choice for Offer Parsing

**Status:** Pending — research spike required (see issue OFFER-002)

**Date:** TBD

## Context

Driver Copilot needs to parse offer screenshots from Uber Eats and DoorDash to extract:
- Payout amount
- Distance
- Estimated delivery time
- Store name

Two candidates: GPT-4o-mini (OpenAI) and Gemini 1.5 Flash (Google).

## Decision

TBD — complete research spike OFFER-002 first.

Test criteria:
- Field extraction accuracy on 10 real screenshots per platform
- P95 latency
- Cost per 1,000 calls
- JSON output reliability (structured output support)

## Consequences

Winner becomes the sole vision API for MVP. Loser documented as fallback.

---
*Update this ADR after completing OFFER-002.*
