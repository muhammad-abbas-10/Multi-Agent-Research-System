# Multi-Agent Research System

An AI-powered research pipeline that takes a user's question, breaks it into subtasks, investigates it from three different angles in parallel using specialized agents, cross-checks their findings for conflicts, and synthesizes everything into a structured report.

Built as a hands-on learning project to understand agentic orchestration, n8n workflow automation, and multi-agent system design — not from a template, but debugged and built step by step.

## Example use case

**Input:** "What are the best open-source LLMs for local deployment on an 8GB VRAM GPU?"

**Output:** A structured, cross-verified research report covering candidate models, technical specs, hardware fit, flagged disagreements between research angles, and a final recommendation.

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
| Web search grounding | Tavily API (free tier, in progress) |
| Backend | Node.js + Express *(planned)* |
| Frontend | React + Vite *(planned)* |
| Database | PostgreSQL *(planned)* |
| Version control | Git + GitHub |

## Current status

- [x] Webhook receives research questions
- [x] Planner agent breaks questions into structured subtasks
- [x] Three parallel specialist agents (Research, Technical, Cost/Performance)
- [x] Merge node combines all agent outputs
- [x] Fact-checking agent detects agreement/conflict across agents' claims
- [x] Final report synthesis agent (structured Markdown output: Executive Summary, Comparison, Technical Analysis, Hardware Fit, Recommendation, Limitations)
- [ ] Real web search grounding via Tavily (in progress — see Limitations)
- [ ] Node.js backend + React frontend
- [ ] PostgreSQL persistence (research history)

**The full pipeline is functional end to end**: a question sent to the webhook now produces a complete, structured research report automatically.

## Debugging notes (real issues hit and fixed)

This section exists because these were genuinely non-obvious bugs, and documenting them is more useful than pretending the build was frictionless.

**1. Expression mode silently not applied.** An n8n field can *look* like it contains a live expression (`{{ $json.body.question }}`) while still being in "Fixed" mode internally, which sends the text literally instead of evaluating it. Diagnosed by exporting the workflow JSON and checking whether the field's stored value started with `=` (n8n's internal marker for "this is a real expression"). Fixed by explicitly toggling the field to Expression mode.

**2. Merge node silently dropping data.** Using "Combine by Position" mode on three JSON objects that share identical top-level field names (all three agents return the same Groq response shape) causes n8n to silently keep only the last item instead of merging them — no error, just wrong data flowing downstream. Fixed by switching to "Append" mode and combining the items explicitly inside the next node's expression using `$input.all().map(...)`.

## Known limitations

- **Agent findings are currently based on model knowledge, not live sources.** The Research/Technical/Cost agents currently reason from the LLM's training data rather than real-time retrieval, which means some technical specifics (VRAM figures, context lengths) can be inaccurate or inconsistent between agents. The fact-checker correctly *detects* these disagreements — but can't resolve them against ground truth yet, since there's no real source to check against. **Currently being addressed**: adding a Tavily web search step before the Research and Technical agents, so they ground their answers in real, current search results instead of memory alone.
- No authentication, deployment, or production hardening — this is a local/portfolio-scale MVP, not a production system.

## Setup

1. Clone this repo.
2. Import `n8n-workflows/*.json` into your own n8n instance (Cloud or self-hosted).
3. Create a free Groq API key at [console.groq.com](https://console.groq.com) and add it as a Header Auth credential in n8n (`Authorization: Bearer <your-key>`).
4. Create a free Tavily API key at [tavily.com](https://tavily.com) for web search grounding.
5. Activate the workflow and send a POST request to the webhook URL with `{"question": "your research question"}`.

## Roadmap

- Web search grounding for factual accuracy (Tavily)
- Node.js API + React frontend
- PostgreSQL research history
