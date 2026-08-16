# Multi-Agent Research System

An AI-powered research pipeline that takes a user's question, breaks it into subtasks, investigates it from three different angles in parallel using specialized agents grounded in real web search, cross-checks their findings for conflicts, and synthesizes everything into a structured, honest research report — served through a full-stack app (React + Node.js + n8n) with persistent research history.

Built as a hands-on learning project to understand agentic orchestration, n8n workflow automation, RAG-style grounding, and multi-agent system design — not from a template, but debugged and built step by step.

## Example use case

**Input:** "What are the best open-source LLMs for local deployment on an 8GB VRAM GPU?"

**Output:** A structured research report covering real, current candidate models (sourced from live web search, not model memory), technical specs, hardware fit, explicitly flagged disagreements between research angles, and honest gaps where no data was found — rather than filled in with a guess.

## Architecture

```
              React Frontend
                    |
                    v
            Node.js/Express API
        POST /api/research  GET /api/history
         (validated input)
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
| Backend | Node.js + Express |
| Frontend | React + Vite |
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
- [x] Backend + frontend input validation (min/max length, type checks, live character counter) rejecting bad input before it reaches the pipeline
- [x] React frontend with a custom design system — pipeline visualization, per-agent workspace views, formatted report document
- [x] PostgreSQL (Neon) persistence — every research session is saved automatically
- [x] Research history UI — list of past sessions, click to reload any saved report
- [ ] Deployment to a live URL (planned)
- [ ] UI polish: page metadata/favicon, graceful rate-limit messaging, mobile check, report export

**The full stack is functional end to end**: a question typed into the React UI is validated, sent through the backend to n8n, is checked by the Planner for topic fit, runs the complete grounded, fact-checked pipeline (or returns a graceful rejection), saves the result to Postgres, and renders back as a formatted report — typically in 25-30 seconds for a valid research question.

## Example output (excerpt)

> **Model Comparison**
> - Mistral 7B: Confirmed to run on 8GB VRAM by multiple sources, including LLM Explorer and LLM GPU VRAM Requirements Explained 2026.
> - DeepSeek-V4-Pro, MiniMax M3, Qwen3.7 Plus... have only been mentioned by a single source, providing no basis for comparison.

The system distinguishes claims backed by multiple independent sources from single-source mentions — this cross-verification is the core differentiator from a simple LLM wrapper.

**Example rejection (guard rail in action)** — asking "best trader of Pakistan":

> This question is an opinion-based ranking question with no specific technical candidates to compare. A valid question would be 'compare trading platforms in Pakistan' or 'best trading strategies for Pakistani stock market'.

## Debugging notes (real issues hit and fixed)

This section exists because these were genuinely non-obvious bugs, and documenting them is more useful than pretending the build was frictionless.

**1. Expression mode silently not applied.** An n8n field can *look* like it contains a live expression while still being in "Fixed" mode internally, sending the text literally instead of evaluating it. Diagnosed by exporting the workflow JSON and checking whether the field's stored value started with `=`. Fixed by explicitly toggling the field to Expression mode.

**2. Merge node silently dropping data.** Using "Combine by Position" mode on JSON objects with identical top-level field names silently keeps only the last item. Fixed by switching to "Append" mode and combining items explicitly with `$input.all().map(...)`.

**3. LLM hallucination without grounding.** Early agent versions confidently invented plausible-sounding but false technical specs. Fixed by adding a Tavily web search step before each agent's LLM call, and explicitly flagging estimates vs. sourced figures where data is still incomplete.

**4. Webhook responding before the pipeline finished.** n8n's webhook responds immediately by default, before the workflow runs. Fixed via the Webhook node's "Respond: When Last Node Finishes" setting.

**5. Off-topic queries crashing the pipeline.** The Planner now judges topic fit and outputs an `is_valid` flag; an IF node routes valid questions through the normal pipeline and invalid ones to a Rejection Message node that reshapes a friendly explanation into the same response format the frontend already expects.

**6. Groq free-tier daily token limit.** A single full pipeline run uses ~2,000-3,000 tokens; the free tier caps at 100,000 tokens/day (~30-50 full runs/day). Resets daily — no workaround needed beyond waiting.

## Known limitations

- Very recently released models sometimes lack well-documented hardware/VRAM benchmarks. The system surfaces this as an explicit estimate flag or "no data" note rather than guessing.
- No authentication yet — deliberately deferred, since it's not the core value proposition of this project (multi-agent orchestration and fact-checking are). May be added later as a separate enhancement.
- No deployment yet — planned; currently runs locally across three services (n8n Cloud, local backend, local frontend).
- Free-tier API limits (Groq token cap, Tavily search credits) mean heavy back-to-back testing can temporarily pause functionality.

## Setup

1. Clone this repo.
2. Import `n8n-workflows/*.json` into your own n8n instance (Cloud or self-hosted), and Publish/activate it.
3. Create a free Groq API key at [console.groq.com](https://console.groq.com) and add it as a Header Auth credential in n8n (`Authorization: Bearer <your-key>`).
4. Create a free Tavily API key at [tavily.com](https://tavily.com) for web search grounding.
5. Create a free Postgres database at [neon.tech](https://neon.tech) and run the schema below.
6. In `backend/`, create a `.env` with `N8N_WEBHOOK_URL`, `PORT`, and `DATABASE_URL`. Run `npm install` then `node server.js`.
7. In `frontend/`, run `npm install` then `npm run dev`.
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

## Roadmap

- Deploy backend and frontend to live URLs
- UI polish: page metadata, graceful rate-limit messaging, mobile testing, report export
- Move Tavily key into a proper n8n credential (currently inline for simplicity during development)
