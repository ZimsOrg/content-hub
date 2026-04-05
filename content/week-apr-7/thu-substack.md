# Thursday Substack (Deep Dive) — Apr 10

## Title: The builder-reviewer pattern: Why every serious AI workflow uses two agents, not one

I've been building side projects with AI agents for months now. I've tried every setup — single agent, multi-agent, fully autonomous, heavily supervised. And I keep landing on the same pattern.

Two agents. One builds. One reviews. You manage.

It turns out I'm not the only one.

---

## The pattern is everywhere

Daniel Roth, the editor of LinkedIn, calls his agents "Bob the Builder" and "Ray the Reviewer." Bob writes code in modules. Ray checks architecture and security. Daniel makes the final call.

Stripe's internal "Minions" work the same way — an agent writes the code, but a human reviews the PR before it ships. 1,300 PRs a week, zero human coding, all human review.

I run a similar setup. My builder agent (Bolt) scaffolds features and writes code. My reviewer agent (Hawk) audits every PR for bugs, security issues, and edge cases. I'm the tiebreaker.

The pattern keeps showing up because it solves the core problem with AI coding: AI is confident and fast, but it hallucinates. It will write beautiful code that breaks in production. You need a second pair of eyes — and that second pair of eyes can also be AI, as long as it's explicitly told to be critical.

---

## How to set it up

### Step 1: Define your builder

Your builder agent should be optimized for speed and creativity. Give it clear instructions:

- Plan before building
- Build in modules (small, testable pieces)
- Document what you build
- Stop and get review before committing

I use Claude Code for this. The key is the system prompt — tell it to plan first, not just start writing code.

### Step 2: Define your reviewer

Your reviewer agent should be optimized for quality and skepticism. Give it different instructions:

- Review for security first
- Check architecture and maintainability
- Look for edge cases
- You MUST push back if something looks wrong
- Do not rubber-stamp

This is critical: explicitly tell the reviewer to say no. If you don't, it will agree with everything the builder produces. AI is agreeable by default. You have to train it to be critical.

### Step 3: You're the manager

Your job is:

- Assign the task to the builder
- Pass the builder's output to the reviewer
- Read the reviewer's feedback (this is where you learn)
- Make the call: ship, revise, or scrap
- Break ties when they disagree

Daniel Roth deliberately does NOT automate the handoff between Bob and Ray. He copies the output manually so he can read the feedback and learn from it. I think that's smart, especially when you're still building your instincts.

---

## Why not just use one really good agent?

I tried this. Here's what happens:

One agent with "be thorough and review your own work" instructions will produce better output than zero review. But it has a fundamental limitation: it can't genuinely critique its own work. It's like asking someone to proofread their own essay — they'll miss the same mistakes they made the first time because they're in the same headspace.

Two separate agents with different roles, different system prompts, and different optimization targets catch each other's blind spots. The builder optimizes for "get it done." The reviewer optimizes for "get it right." The tension between those two goals is where the quality comes from.

---

## The honest limitations

This pattern is not a silver bullet. Some real issues I've hit:

**It's slower.** The review step adds time. A feature that takes 20 minutes to build takes 30 with review. But the bugs it catches save hours later.

**The reviewer can be too conservative.** I've had Hawk flag things that weren't actually problems. You need to calibrate — if the reviewer blocks too much, adjust its threshold.

**You still need to understand what you're building.** The agents can write and review code, but they can't tell you whether you're building the right thing. Product judgment is still 100% on you.

**Context matters.** Both agents need enough context about your project. If you don't give the reviewer your architecture decisions, it'll flag things that are intentional choices, not bugs.

---

## My actual setup (costs included)

- **Claude Code** ($100/month) — Powers both Bolt (builder) and Hawk (reviewer) with different system prompts
- **Codex** ($200/month) — Parallel tasks, bigger features. Also gets Hawk review.
- **OpenClaw** — Orchestrates the agents, manages context, handles communication

Total: ~$300/month. That's less than one hour of a senior engineer's time at a tech company.

For that $300, I ship features most evenings. Real features in real products. Not demos.

---

## Try it this weekend

You don't need my exact setup. Here's the minimum viable version:

1. Open two Claude Code sessions (or two ChatGPT windows)
2. In session 1, set the system prompt to "You are a lean builder. Plan first, build in modules, document everything."
3. In session 2, set the system prompt to "You are a senior reviewer. Review for security, architecture, and edge cases. You MUST push back on issues. Do not rubber-stamp."
4. Give the builder a task
5. Copy the builder's output to the reviewer
6. Read the feedback. Make the call.

That's it. Do this for one feature and tell me the reviewer didn't catch something the builder missed. I'll wait.

---

The tools are good enough now. The pattern is proven. The only question is whether you'll try it.

Hit reply if you do — I want to hear how it goes.
