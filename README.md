# Multi-Agent Research System

An AI-powered research pipeline that takes a user's question, breaks it into subtasks, investigates it from three different angles in parallel using specialized agents grounded in real web search, cross-checks their findings for conflicts, and synthesizes everything into a structured, honest research report — served through a full-stack app (React + Node.js + n8n).

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
              POST /api/research
                    |
                    v
              n8n (Webhook)
                    |
                    v
              Research Planner
           (breaks question into subtasks)
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
   Tavily Search Tavily Search Tavily Search
   (general)     (technical)   (performance)
        |           |           |
        v           v           v
    Research     Technical    Cost/Performance
     Agent         Agent          Agent
        |           |           |
        +-----------+-----------+
                    |
                    v
                Merge Node
                    |
                    v
              Fact Checker
     (flags agreement/conflict per model)
                    |
                    v
            Final Report Agent
      (structured Markdown report)
                    |
                    v
              PostgreSQL       <- in progress
```

## Tech stack (zero-cost)

| Component | Technology |
|---|---|
| Orchestration | n8n (Cloud, free trial) |
| LLM inference | Groq API (Llama 3.3 70B, free tier) |
| Web search grounding | Tavily API (free tier) |
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Database | PostgreSQL *(planned)* |
| Version control | Git + GitHub |

## Current status

- [x] Webhook receives research questions
- [x] Planner agent breaks questions into structured subtasks
- [x] Three parallel specialist agents (Research, Technical, Cost/Performance), each grounded in dedicated Tavily web search results instead of model memory
- [x] Merge node combines all agent outputs
- [x] Fact-checking agent detects agreement/conflict across agents' claims, citing specific models by name
- [x] Final report synthesis agent (structured Markdown output: Executive Summary, Comparison, Technical Analysis, Hardware Fit, Recommendation, Limitations)
- [x] Cost/Performance agent explicitly flags estimated vs. sourced hardware figures (`is_estimated` field) rather than presenting guesses as fact
- [x] Node.js/Express backend wrapping the n8n pipeline with a clean `{ question, report }` API contract
- [x] React frontend — question input, loading state, and rendered Markdown report display
- [ ] PostgreSQL persistence (research history)
- [ ] Graceful handling of non-comparison-style questions (see Known limitations)

**The full stack is functional end to end**: a question typed into the React UI is sent through the backend to n8n, runs the complete grounded, fact-checked pipeline, and renders back as a formatted report — typically in 25-30 seconds, reflecting the ~4 sequential and 3 parallel AI/search operations involved per request.

## Example output (excerpt)

> **Model Comparison**
> - Mistral 7B: Confirmed to run on 8GB VRAM by multiple sources, including LLM Explorer and LLM GPU VRAM Requirements Explained 2026.
> - DeepSeek-V4-Pro, MiniMax M3, Qwen3.7 Plus... have only been mentioned by a single source, providing no basis for comparison.

The system distinguishes claims backed by multiple independent sources from single-source mentions — this cross-verification is the core differentiator from a simple LLM wrapper.

## Debugging notes (real issues hit and fixed)

This section exists because these were genuinely non-obvious bugs, and documenting them is more useful than pretending the build was frictionless.

**1. Expression mode silently not applied.** An n8n field can *look* like it contains a live expression (`{{ $json.body.question }}`) while still being in "Fixed" mode internally, which sends the text literally instead of evaluating it. Diagnosed by exporting the workflow JSON and checking whether the field's stored value started with `=` (n8n's internal marker for "this is a real expression"). Fixed by explicitly toggling the field to Expression mode.

**2. Merge node silently dropping data.** Using "Combine by Position" mode on three JSON objects that share identical top-level field names (all three agents return the same Groq response shape) causes n8n to silently keep only the last item instead of merging them — no error, just wrong data flowing downstream. Fixed by switching to "Append" mode and combining the items explicitly inside the next node's expression using `$input.all().map(...)`.

**3. LLM hallucination without grounding.** Early versions of the agents (before Tavily was added) confidently invented plausible-sounding but false technical specs. Fixed by adding a Tavily web search step before each agent's LLM call, so agents summarize real retrieved content instead of guessing. Where sources still don't specify exact figures, the Cost/Performance agent explicitly marks these as estimates rather than presenting them as fact.

**4. Webhook responding before the pipeline finished.** By default, n8n's webhook responds immediately on receipt, before the workflow actually runs — meaning the API returned `{"message": "Workflow was started"}` instead of the real report. Fixed by setting the Webhook node's Respond option to "When Last Node Finishes," so the HTTP response waits for the entire pipeline (including the Final Report Agent) to complete.

**5. (In progress) Off-topic queries can fail the pipeline.** Since the Planner, agents, and Tavily search queries are all tuned around comparison-style research questions ("best X for Y"), an unrelated or non-comparison question can produce a differently-shaped response that breaks a downstream node expecting a specific structure. Currently being investigated and documented as a known limitation.

## Known limitations

- Very recently released models sometimes lack well-documented hardware/VRAM benchmarks, since community testing lags behind release dates. The system surfaces this as an explicit estimate flag or "no data" note rather than guessing — an intentional design choice, not a bug.
- No authentication, deployment, or production hardening — this is a local/portfolio-scale MVP, not a production system.
- Currently tuned and tested primarily for comparison-style research questions ("best X for Y", "compare A vs B"). Off-topic or non-comparison questions (e.g. purely opinion-based or single-fact queries) can cause a pipeline failure rather than a graceful fallback — see debugging note #5.
- Research history is not yet persisted; each session is stateless until PostgreSQL integration is complete.

## Setup

1. Clone this repo.
2. Import `n8n-workflows/*.json` into your own n8n instance (Cloud or self-hosted), and Publish/activate it.
3. Create a free Groq API key at [console.groq.com](https://console.groq.com) and add it as a Header Auth credential in n8n (`Authorization: Bearer <your-key>`).
4. Create a free Tavily API key at [tavily.com](https://tavily.com) for web search grounding.
5. In `backend/`, create a `.env` with `N8N_WEBHOOK_URL` (your n8n production webhook URL) and `PORT`. Run `npm install` then `node server.js`.
6. In `frontend/`, run `npm install` then `npm run dev`.
7. Open the frontend, type a research question, and click Research.

## Roadmap

- PostgreSQL research history
- Graceful fallback/validation for non-comparison-style questions
- Move Tavily key into a proper n8n credential (currently inline for simplicity during development)
