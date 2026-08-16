# Multi-Agent Research System

**[Live demo](https://multi-agent-research-system-beta.vercel.app)**

An AI-powered research pipeline that takes a user's question, breaks it into subtasks, investigates it from three different angles in parallel using specialized agents grounded in real web search, cross-checks their findings for conflicts, and synthesizes everything into a structured, honest research report — served through a full-stack app (React + Node.js + n8n) with persistent research history.

Built as a hands-on learning project to understand agentic orchestration, n8n workflow automation, RAG-style grounding, and multi-agent system design — not from a template, but debugged and built step by step.

## Example use case

**Input:** "What are the best open-source LLMs for local deployment on an 8GB VRAM GPU?"

**Output:** A structured research report covering real, current candidate models (sourced from live web search, not model memory), technical specs, hardware fit, explicitly flagged disagreements between research angles, and honest gaps where no data was found — rather than filled in with a guess.

## Architecture

```
        React Frontend (Vercel)
                    |
                    v
      Node.js/Express API (Railway)
   POST /api/research (rate limited)
        GET /api/history
                    |            |
                    v            v
              n8n (Webhook)  PostgreSQL (Neon)
                    |         (research_sessions)
                    v
              Research Planner
        (validates question + breaks into subtasks)
                    |
                    v
              IF: is_valid?
             /            \
          true            false
           |                |
   3 parallel branches   Rejection message
   (Tavily + Agents)     (friendly explanation
           |               + example questions)
           v
       Merge -> Fact Checker -> Final Report Agent
```

## Tech stack (zero-cost)

| Component | Technology |
|---|---|
| Orchestration | n8n (Cloud, free trial) |
| LLM inference | Groq API (Llama 3.3 70B, free tier) |
| Web search grounding | Tavily API (free tier) |
| Backend | Node.js + Express, deployed on Railway |
| Frontend | React + Vite, deployed on Vercel |
| Database | PostgreSQL (Neon, free tier) |
| Version control | Git + GitHub |

## Current status

- [x] Webhook receives research questions
- [x] Planner agent validates the question and breaks it into structured subtasks
- [x] Guard rail: non-comparison-style questions are rejected gracefully with a helpful explanation, instead of crashing the pipeline
- [x] Three parallel specialist agents (Research, Technical, Cost/Performance), each grounded in dedicated Tavily web search results instead of model memory
- [x] Merge node combines all agent outputs
- [x] Fact-checking agent detects agreement/conflict across agents' claims, citing specific models by name
- [x] Final report synthesis agent (structured Markdown output: Executive Summary, Comparison, Technical Analysis, Hardware Fit, Recommendation, Limitations)
- [x] Cost/Performance agent explicitly flags estimated vs. sourced hardware figures (`is_estimated` field) rather than presenting guesses as fact
- [x] Node.js/Express backend wrapping the n8n pipeline with a clean `{ question, report }` API contract
- [x] Backend + frontend input validation (min/max length, type checks, live character counter)
- [x] Rate limiting on `/api/research` (8 requests per IP per hour) to protect shared free-tier API quotas
- [x] React frontend with a custom design system — pipeline visualization, per-agent workspace views, formatted report document
- [x] PostgreSQL (Neon) persistence — every research session is saved automatically
- [x] Research history UI — list of past sessions, click to reload any saved report
- [x] **Deployed live** — frontend on Vercel, backend on Railway, both connected to the production n8n workflow and Neon database
- [x] UI polish: page metadata/favicon, graceful rate-limit messaging in the UI, mobile testing, report export

**The full stack is live end to end**: a question typed into the deployed React app is validated, sent through the deployed backend to n8n, checked by the Planner for topic fit, runs the complete grounded, fact-checked pipeline, saves the result to Postgres, and renders back as a formatted report — typically in 25-30 seconds for a valid research question. Tested successfully across multiple domains beyond the primary LLM/hardware example (cameras, headphones), confirming the architecture generalizes to any comparison-style research question.

## Example output (excerpt)

> **Model Comparison**
> - Mistral 7B: Confirmed to run on 8GB VRAM by multiple sources, including LLM Explorer and LLM GPU VRAM Requirements Explained 2026.
> - DeepSeek-V4-Pro, MiniMax M3, Qwen3.7 Plus... have only been mentioned by a single source, providing no basis for comparison.

The system distinguishes claims backed by multiple independent sources from single-source mentions — this cross-verification is the core differentiator from a simple LLM wrapper.

**Example rejection (guard rail in action)** — asking "best trader of Pakistan":

> This question is an opinion-based ranking question with no specific technical candidates to compare. A valid question would be 'compare trading platforms in Pakistan' or 'best trading strategies for Pakistani stock market'.

## Debugging notes (real issues hit and fixed)

This section exists because these were genuinely non-obvious bugs, and documenting them is more useful than pretending the build was frictionless.

**1. Expression mode silently not applied.** An n8n field can *look* like it contains a live expression while still being in "Fixed" mode internally. Diagnosed by exporting the workflow JSON and checking whether the field's stored value started with `=`. Fixed by explicitly toggling to Expression mode.

**2. Merge node silently dropping data.** "Combine by Position" mode on JSON objects with identical top-level field names silently kept only the last item. Fixed by switching to "Append" mode and combining items explicitly with `$input.all().map(...)`.

**3. LLM hallucination without grounding.** Early agent versions confidently invented false technical specs. Fixed by adding a Tavily web search step before each agent's LLM call, and explicitly flagging estimates vs. sourced figures.

**4. Webhook responding before the pipeline finished.** n8n's webhook responds immediately by default. Fixed via the Webhook node's "Respond: When Last Node Finishes" setting.

**5. Off-topic queries crashing the pipeline.** The Planner now judges topic fit and outputs an `is_valid` flag; an IF node routes valid questions through the pipeline and invalid ones to a friendly rejection message in the same response format.

**6. Groq free-tier daily token limit.** ~2,000-3,000 tokens per full pipeline run; free tier caps at 100,000/day (~30-50 runs/day). Resets daily.

**7. Railway Root Directory setting reset unexpectedly after a routine push**, causing a "could not determine how to build the app" failure. Fixed by re-confirming the Root Directory was set to `backend` in Railway's service settings and redeploying. Root cause unconfirmed (likely a platform-side quirk), but worth knowing this setting can silently revert.

## Known limitations

- Very recently released models sometimes lack well-documented hardware/VRAM benchmarks. The system surfaces this as an explicit estimate flag or "no data" note rather than guessing.
- No authentication — deliberately deferred, since it's not the core value proposition of this project (multi-agent orchestration and fact-checking are).
- No per-user separation of research history — all saved sessions are currently visible to anyone using the live demo (no personal data involved, low risk for a portfolio demo).
- Shared free-tier API quotas (Groq, Tavily) mean heavy usage across all visitors to the live demo can temporarily pause functionality until the daily limit resets.

## Live demo

**[multi-agent-research-system-beta.vercel.app](https://multi-agent-research-system-beta.vercel.app)**

Try a comparison-style question, e.g.:
- "Best open-source LLMs for local deployment on 8GB VRAM"
- "Compare the best budget mirrorless cameras for travel photography"
- "Best noise-cancelling headphones under $200"

## Local setup

1. Clone this repo.
2. Import `n8n-workflows/*.json` into your own n8n instance (Cloud or self-hosted), and Publish/activate it.
3. Create a free Groq API key at [console.groq.com](https://console.groq.com) and add it as a Header Auth credential in n8n.
4. Create a free Tavily API key at [tavily.com](https://tavily.com) for web search grounding.
5. Create a free Postgres database at [neon.tech](https://neon.tech) and run the schema below.
6. In `backend/`, create a `.env` with `N8N_WEBHOOK_URL`, `PORT`, and `DATABASE_URL`. Run `npm install` then `npm start`.
7. In `frontend/`, create a `.env` with `VITE_API_BASE_URL` pointing to your backend. Run `npm install` then `npm run dev`.
8. Open the frontend, type a comparison-style research question (10-500 characters), and click Research.

### Database schema

```sql
CREATE TABLE research_sessions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  report TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```


