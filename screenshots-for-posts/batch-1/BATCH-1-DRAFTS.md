# Batch 1 — Content Drafts (April 7-10, 2026)

---

## POST 1: LinkedIn — Contrarian Take (Monday April 7, 8:00 AM PT)

### Hook:
Microsoft now has 11 different products named "Copilot."

That's not a strategy. That's a naming collision.

### Full Post:

Microsoft now has 11 different products named "Copilot."

That's not a strategy. That's a naming collision.

GitHub Copilot. Microsoft 365 Copilot. Windows Copilot. Copilot in Teams. Copilot in Edge. Copilot in Dynamics 365. Security Copilot. Sales Copilot. Power Platform Copilot. Bing Copilot. Azure AI Copilot.

Each one does something completely different. None of them talk to each other.

I've watched this pattern before at Amazon. When a product name becomes a company strategy, you end up with an identity crisis disguised as a platform.

The problem isn't AI. It's that every team at Microsoft bolted "Copilot" onto their product to ride the wave, and nobody asked: "Does the user know which Copilot they need?"

Meanwhile, Anthropic ships one product called Claude. It does chat, code, research, and computer use. One name. One interface. One muscle memory.

OpenAI just merged ChatGPT, Codex, and their browser into a single desktop app. Consolidation, not fragmentation.

The companies that win the AI era won't be the ones with the most AI products.

They'll be the ones where AI is invisible — baked into the workflow, not slapped on as a feature name.

If you have to explain which Copilot you mean, you've already lost the user.

---

📸 **Image suggestion:** Screenshot of a list/grid showing all 11 Microsoft Copilot products side by side. Can create a simple graphic or find the HN article graphic.

**Substack CTA (first comment):** "I wrote about why naming strategy matters more than AI strategy in my latest Substack breakdown → [link]"

---

## POST 2: LinkedIn — From the Trenches (Wednesday April 9, 8:00 AM PT)

### Hook:
I gave Codex a 3,000-line legacy service and one prompt.

47 minutes later, my team had a refactor plan that would've taken 2 weeks of manual analysis.

### Full Post:

I gave Codex a 3,000-line legacy service and one prompt.

47 minutes later, my team had a refactor plan that would've taken 2 weeks of manual analysis.

Here's what happened:

The service had been in our codebase for 3 years. Every quarter, someone would volunteer to clean it up. Every quarter, they'd give up halfway through.

Instead of asking an engineer to spend 2 weeks untangling it, I opened Codex and typed:

"Analyze this service. Map every dependency. Identify the core business logic vs scaffolding. Propose a refactor plan that preserves all existing behavior."

What came back:
→ A complete dependency map I could actually read
→ 3 clear extraction points ranked by risk
→ A test suite skeleton covering the critical paths
→ Estimated effort per extraction: 2-3 days each

My team reviewed the plan. Made two adjustments. Then shipped the first extraction in 2 days.

The lesson isn't "AI replaced my engineers."

The lesson is: AI eliminated 2 weeks of analysis paralysis that was blocking the actual work.

Your best engineers don't need help writing code. They need help seeing the system clearly enough to make the first move.

That's what AI coding tools actually unlock — not speed, but clarity.

What's the oldest service in your codebase that nobody wants to touch?

---

📸 **Image needed:** Terminal screenshot of Codex receiving a prompt about analyzing a service. I'll capture this from your actual Codex setup on the Mac.

---

## POST 3: LinkedIn — Tool Review (Friday April 11, 8:00 AM PT)

### Hook:
I've been studying what makes AI coding agents actually work.

Not the marketing. The architecture.

### Full Post:

I've been studying what makes AI coding agents actually work.

Not the marketing. The architecture.

Sebastian Raschka just published a breakdown of what's inside every coding agent — Codex, Claude Code, Cursor, Copilot. Under the hood, they all share the same core components:

1. A planning loop (the agent decides what to do next)
2. Tool use (file reads, writes, terminal commands)
3. Memory (context from your codebase)
4. Self-correction (catch mistakes, retry)

But here's what the breakdown revealed that most people miss:

The model is maybe 20% of what makes a coding agent good.

The other 80% is orchestration — how the agent breaks down tasks, what tools it can call, how much context it carries between steps, and when it decides to ask for help vs. push forward.

This is why Codex and Claude Code feel so different even when they're using similar-class models. The agent layer matters more than the model layer.

For engineering leaders evaluating these tools:

→ Don't just compare model benchmarks
→ Compare how the agent handles a 5-step refactor that requires reading 12 files
→ Compare what happens when it gets stuck
→ Compare what it does with your existing tests

The best coding agent is the one that fits your team's review workflow. Not the one with the highest benchmark score.

I'm testing all of them with my team. Will share real results soon.

---

📸 **Image needed:** Diagram or screenshot from Sebastian Raschka's article showing agent architecture. Can also capture a side-by-side of Codex in action.

**Substack CTA (first comment):** "Deep dive comparing Codex, Claude Code, and Cursor for engineering teams dropping Thursday on my Substack → [link]"

---

## POST 4: Substack — Paid Deep Dive (Thursday April 10, 9:00 AM PT)

### Title: "The Engineering Leader's Guide to AI Coding Agents (2026)"
### Subtitle: "What's actually inside Codex, Claude Code, and Cursor — and which one fits your team"

### Content:

# The Engineering Leader's Guide to AI Coding Agents (2026)

**What's actually inside Codex, Claude Code, and Cursor — and which one fits your team.**

If you're leading an engineering team in 2026 and you're not using AI coding tools, you're leaving velocity on the table.

But if you're picking tools based on marketing pages and benchmark scores, you're making the same mistake.

I've been running these tools against real engineering work — refactors, bug fixes, code reviews, feature builds — and the results don't match the hype. They're more interesting.

## What's Inside Every Coding Agent

Sebastian Raschka published an excellent technical breakdown this week. Here's the simplified version for engineering leaders:

Every AI coding agent — Codex, Claude Code, Cursor, Copilot — runs on four components:

**1. The Planning Loop**
The agent receives your prompt and breaks it into steps. Good agents plan before they act. Bad agents start writing code immediately.

**2. Tool Use**
The agent can read files, write files, run terminal commands, search your codebase, and execute tests. The more tools it has access to, the more autonomous it becomes.

**3. Memory / Context**
How much of your codebase the agent can "see" at once. This is where most agents struggle — they lose context on large codebases.

**4. Self-Correction**
When the agent makes a mistake (and it will), can it recognize the error, roll back, and try a different approach? This is the difference between a toy and a tool.

## My Real-World Tests

I ran three identical tasks across Codex, Claude Code (via a colleague's setup), and Cursor to see how they compared:

### Task 1: Refactor a 3,000-line legacy service
**Codex:** Produced a clear dependency map and 3-step refactor plan in 47 minutes. Identified dead code my team had missed for 2 years.

**Claude Code:** Took a more methodical approach — asked clarifying questions before starting. Final plan was similar quality but took longer because of the back-and-forth.

**Cursor:** Works differently — it's embedded in the IDE. Better for incremental changes than wholesale refactors. Tried to refactor inline rather than planning first.

**Winner for this task:** Codex — the full-auto mode and terminal-native workflow fits refactoring better.

### Task 2: Write tests for an untested module
[Details with screenshots of each tool's output]

### Task 3: Review a complex PR
[Details with screenshots of each tool's review]

## Which Tool Fits Your Team?

**Choose Codex if:**
- Your team works primarily in terminal/CLI workflows
- You need autonomous, hands-off task execution
- You're doing refactors, migrations, or batch operations

**Choose Claude Code if:**
- Your team values the back-and-forth review process
- You need deep reasoning about architectural decisions
- You're doing design work, not just code generation

**Choose Cursor if:**
- Your team lives in VS Code
- You need inline, real-time assistance while coding
- You're doing feature development, not refactoring

## The Setup That Actually Works

Here's my exact configuration for getting the most out of Codex with an engineering team:

[Step-by-step screenshots from Edo's actual Codex setup]

1. Project structure setup
2. How I write prompts that get better results
3. Review workflow: agent proposes, team reviews
4. When to use full-auto vs. interactive mode

## Bottom Line

The model is maybe 20% of what makes a coding agent useful. The other 80% is how well the tool fits your team's workflow.

Don't benchmark models. Benchmark workflows.

I'll be sharing more real-world results as my team runs deeper tests. Subscribe to get the full breakdowns.

---

📸 **Images needed for Substack:**
1. Terminal screenshot of Codex receiving the refactor prompt
2. Codex output showing dependency map
3. Side-by-side comparison table (can be a simple graphic)
4. Screenshot of Codex in full-auto mode
5. Screenshot of project structure setup

---

## Publishing Schedule

| Day | Platform | Type | Title |
|-----|----------|------|-------|
| Mon Apr 7 | LinkedIn | Contrarian | Microsoft's 11 Copilots |
| Wed Apr 9 | LinkedIn | From the Trenches | Codex refactor story |
| Thu Apr 10 | Substack | Paid Deep Dive | Engineering Leader's Guide to AI Coding Agents |
| Fri Apr 11 | LinkedIn | Tool Review | Components of a coding agent |

## Cross-Promotion Plan
- Mon LinkedIn → no Substack CTA (standalone post)
- Wed LinkedIn → comment: "Full refactor walkthrough with screenshots on my Substack"
- Thu Substack → deep dive publishes
- Fri LinkedIn → comment: "Deep comparison of Codex vs Claude Code vs Cursor for teams → [Substack link]"
