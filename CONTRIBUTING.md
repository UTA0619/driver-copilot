# Contributing to Driver Copilot

Small team, fast pace. This guide keeps us aligned without bureaucracy.

---

## Setup

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go app on physical device (optional)

### First-time setup

```bash
git clone https://github.com/UTA0619/driver-copilot
cd driver-copilot
pnpm install

cp .env.example .env.local
# Fill in staging keys (ask in GitHub Discussion if you need access)

supabase start          # starts local Postgres + Auth + Storage
supabase db push        # applies all migrations

pnpm --filter mobile dev
```

---

## Branch Strategy

```
main                  ← protected, always deployable
feature/<description> ← new features
fix/<description>     ← bug fixes
chore/<description>   ← config, deps, tooling
```

**Never push directly to `main`.** Always open a PR.

---

## Issue Workflow

1. Pick an issue from the **Ready** column in [GitHub Projects](https://github.com/UTA0619/driver-copilot/projects)
2. Assign yourself, move to **In Progress**
3. `git checkout -b feature/ISSUE-NUMBER-short-description`
4. Work and commit incrementally
5. Open PR → link with `Closes #N` → request review
6. After merge → move issue to **Done**

---

## Commit Messages

```
feat: add offer decision result card
fix: correct hourly rate for zero-duration entries
chore: upgrade expo to 52.1.0
docs: add ADR-001 vision API decision
```

Rules:
- Lowercase, present tense
- Under 72 characters
- No emojis
- Reference issue number if helpful: `feat: add paywall screen (closes #42)`

---

## Code Conventions

- **TypeScript everywhere** — no `any` without a comment explaining why
- **No hardcoded strings** for user-visible text
- **No API keys in code** — env variables only
- **No `console.log`** in production paths — use `console.warn/error` or remove
- **PostHog events** must be in `docs/analytics-events.md` before merging

---

## Database Migrations

```bash
# Create a new migration
supabase migration new descriptive_name

# Apply locally
supabase db push

# Apply to staging
supabase db push --db-url $STAGING_DB_URL
```

Never edit existing migration files. Always create new ones.

---

## Testing

Before every PR:
```bash
pnpm turbo run type-check   # must pass
pnpm turbo run lint          # must pass
```

Manual testing:
- Test the changed flow on iOS (simulator or device)
- Test on Android if the change is platform-relevant
- Check for regressions in adjacent flows

---

## Environment Variables

When you add a new env variable:
1. Add to `.env.example` with a comment
2. Add to EAS Secrets for staging + production
3. Update this guide if setup steps are required

---

## Definition of Done

An issue is done when:
- [ ] All acceptance criteria met and verified manually
- [ ] `turbo run type-check` passes
- [ ] `turbo run lint` passes
- [ ] Tested on iOS + Android
- [ ] No `console.log` in production code
- [ ] No hardcoded secrets
- [ ] New PostHog events in `docs/analytics-events.md`
- [ ] New env vars in `.env.example`
- [ ] PR linked to issue, approved, and merged

---

## Getting Help

Open a [GitHub Discussion](https://github.com/UTA0619/driver-copilot/discussions) or comment on the relevant issue.
Keep context in GitHub — not in DMs.
