# Multi-Agent Research System

An AI-powered research pipeline that takes a user's question, breaks it into subtasks, investigates it from three different angles in parallel using specialized agents grounded in real web search, cross-checks their findings for conflicts, and synthesizes everything into a structured, honest research report.

Built as a hands-on learning project to understand agentic orchestration, n8n workflow automation, RAG-style grounding, and multi-agent system design — not from a template, but debugged and built step by step.

## Example use case

**Input:** "What are the best open-source LLMs for local deployment on an 8GB VRAM GPU?"

**Output:** A structured research report covering real, current candidate models (sourced from live web search, not model memory), technical specs, hardware fit, explicitly flagged disagreements between research angles, and honest gaps where no data was found — rather than filled in with a guess.

## Architecture

```
                    USER
                      |
                      v
                  Webhook (n8n)
                      |
                      v
              Research Planner
           (breaks question into subtasks)
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
   Tavily Search   Tavily Search  Tavily Search
   (general)       (technical)    (performance)
        |             |             |
        v             v             v
    Research      Technical      Cost/Performance
     Agent          Agent            Agent
        |             |             |
        +-------------+-------------+
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
              PostgreSQL + React UI  <- in progress
```

## Tech stack (zero-cost)

| Component | Technology |
|---|---|
| Orchestration | n8n (Cloud, free trial) |
| LLM inference | Groq API (Llama 3.3 70B, free tier) |
| Web search grounding | Tavily API (free tier) |
| Backend | Node.js + Express *(planned)* |
| Frontend | React + Vite *(planned)* |
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
- [ ] Node.js backend + React frontend
- [ ] PostgreSQL persistence (research history)

**The full pipeline is functional end to end**: a question sent to the webhook produces a complete, source-grounded, conflict-aware research report automatically.

## Example output (excerpt)

> **Hardware/Performance Fit**
> - Gemma 4 E4B: Suitable for 8GB VRAM, but may cause out-of-memory errors.
> - Mistral 7B Q4: No corresponding data for hardware fit.
>
> **Limitations**
> Conflicting findings for Gemma 4 E4B and Gemma 4 12B... Lack of comparative data for Mistral 7B Q4 and Qwen3.5. These limitations highlight the need for further research and clarification.

This is intentional behavior, not a gap: the system is designed to admit uncertainty rather than invent an answer when sources disagree or data is missing.

## Debugging notes (real issues hit and fixed)

This section exists because these were genuinely non-obvious bugs, and documenting them is more useful than pretending the build was frictionless.

**1. Expression mode silently not applied.** An n8n field can *look* like it contains a live expression (`{{ $json.body.question }}`) while still being in "Fixed" mode internally, which sends the text literally instead of evaluating it. Diagnosed by exporting the workflow JSON and checking whether the field's stored value started with `=` (n8n's internal marker for "this is a real expression"). Fixed by explicitly toggling the field to Expression mode.

**2. Merge node silently dropping data.** Using "Combine by Position" mode on three JSON objects that share identical top-level field names (all three agents return the same Groq response shape) causes n8n to silently keep only the last item instead of merging them — no error, just wrong data flowing downstream. Fixed by switching to "Append" mode and combining the items explicitly inside the next node's expression using `$input.all().map(...)`.

**3. LLM hallucination without grounding.** Early versions of the agents (before Tavily was added) confidently invented plausible-sounding but false technical specs (e.g. incorrect VRAM requirements, outdated/irrelevant model names) since they had no real data to draw from — just the model's training memory. Fixed by adding a Tavily web search step before each agent's LLM call, so agents summarize real retrieved content instead of guessing. Where sources still don't specify exact figures (common for very recently released models), the Cost/Performance agent now explicitly marks these as estimates via an `is_estimated` field rather than presenting them as fact.

## Known limitations

- Very recently released models sometimes lack well-documented hardware/VRAM benchmarks, since community testing lags behind release dates. The system surfaces this as an explicit estimate flag or "no data" note rather than guessing — an intentional design choice, not a bug.
- No authentication, deployment, or production hardening — this is a local/portfolio-scale MVP, not a production system.
- Currently tuned and tested primarily for comparison-style research questions ("best X for Y", "compare A vs B"); less tested on open-ended or single-fact questions.

## Setup

1. Clone this repo.
2. Import `n8n-workflows/*.json` into your own n8n instance (Cloud or self-hosted).
3. Create a free Groq API key at [console.groq.com](https://console.groq.com) and add it as a Header Auth credential in n8n (`Authorization: Bearer <your-key>`).
4. Create a free Tavily API key at [tavily.com](https://tavily.com) for web search grounding.
5. Activate the workflow and send a POST request to the webhook URL with `{"question": "your research question"}`.

## Roadmap

- Node.js API + React frontend
- PostgreSQL research history
- Move Tavily key into a proper n8n credential (currently inline for simplicity during development)
