---
name: summarize
description: Use when the user asks to summarize the session, write a session log, or produce a handoff document — a dated Markdown file in dev_log/ that lets a fresh session pick up all context.
---

# Summarize the session

Write a single Markdown file to `dev_log/` that captures everything from the start
of the current session to now, structured so a brand-new session can read only
that file and continue the work with no other context.

## Arguments

- **date** — optional, `YYYY-MM-DD`. Defaults to today's date (from the
  environment / `currentDate` context). Used for the filename.

## Steps

1. **Resolve the filename.** `dev_log/<date>-session-log.md`. If that file
   already exists, append `-2`, `-3`, … so nothing is overwritten. `dev_log/` is
   gitignored — the file is a local handoff note, not a committed artifact.
2. **Re-read the session.** Work back through this conversation from its first
   message. Note: every user request and its motivation; every file created or
   changed; every branch, PR number, commit, and merge; every bug found and how
   it was fixed; every decision and open question; anything the user said they
   would do later or asked to be reminded of.
3. **Check state.** Run `git status`, `git branch --show-current`, and
   `git log --oneline -10` so the "start here" section reflects reality, not
   memory.
4. **Write the file** using the template below. Fill every section. Prefer
   concrete detail (paths, PR numbers, commands, error text) over summary. If a
   section is genuinely empty, write "None" — do not omit it.
5. **Tell the user** the path and a one-line summary of what it covers.

## Template

```markdown
# Session log — <date>

## 1. The project

<Name, what it is, who it serves. Stack and key versions. Where the spec lives
(Docs/, CLAUDE.md) and any hard rules that shaped this session's work. Current
branch and how it relates to main.>

## 2. What was done this session, and why

<Chronological. One subsection per distinct piece of work. For each: what the
user asked for (quote the request if short), the motivation, what was built or
changed (files, PRs), and how it was verified. Include bugs found and their
fixes.>

## 3. Blockers for future sessions

<Anything that will stop or slow the next session: dead credentials, missing
assets, decisions the user still owes, external dependencies, environment
gotchas. For each: what is blocked, and what unblocks it.>

## 4. What is complete, and the next step

<A "done" list — things finished and verified this session, safe to build on.
Then the single concrete next action, specific enough to start immediately.>

## 5. Start here — full context for a fresh session

<A self-contained briefing. Assume the reader has only this file.
- Repo state: branch, clean/dirty, last commit, any uncommitted changes and why.
- How to run: install, dev server, tests, the verify gate.
- Where the spec and memory live, and what to read first.
- Environment: what's configured where (local vs hosted vs deployed), which
  secrets exist and which are dead.
- Launch gates / open decisions still owned by the user.
- Any trap that cost time this session, so it isn't repeated.>
```

## Notes

- This is a handoff note, not a changelog — write it for a person (or agent)
  who needs to *act*, not for the record.
- Do not commit the file or the `dev_log/` directory.
- If memory files were written this session, list them in section 5 so the next
  session knows they exist.
