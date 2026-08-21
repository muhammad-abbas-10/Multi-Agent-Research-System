require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

const N8N_TIMEOUT_MS = 120000;

const getReportContent = (data) => {
  const payload = Array.isArray(data) ? data[0] : data;
  const content = payload?.output ?? payload?.choices?.[0]?.message?.content ?? payload?.report;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('n8n returned an unexpected response');
  }

  return content;
};

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: pool ? 'configured' : 'disabled' });
});

const researchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: { error: 'Too many research requests from this device. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/research', researchLimiter, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length < 10) {
      return res.status(400).json({ error: 'Question is too short — please provide more detail (at least 10 characters)' });
    }

    if (trimmedQuestion.length > 500) {
      return res.status(400).json({ error: 'Question is too long — please keep it under 500 characters' });
    }

    if (!process.env.N8N_WEBHOOK_URL) {
      throw new Error('N8N_WEBHOOK_URL is not configured');
    }

    let n8nResponse;
    try {
      n8nResponse = await axios.post(
        process.env.N8N_WEBHOOK_URL,
        { question: trimmedQuestion },
        { timeout: N8N_TIMEOUT_MS }
      );
    } catch (error) {
      const upstreamStatus = error.response?.status;
      const upstreamMessage = error.response?.data?.message || error.response?.data?.error;
      console.error('n8n request failed:', {
        status: upstreamStatus,
        code: error.code,
        message: upstreamMessage || error.message,
      });

      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'The research workflow timed out. Please try again.' });
      }

      return res.status(502).json({
        error: upstreamMessage
          ? `Research workflow failed: ${upstreamMessage}`
          : 'The research workflow is temporarily unavailable. Please try again.',
      });
    }

    const n8nPayload = Array.isArray(n8nResponse.data) ? n8nResponse.data[0] : n8nResponse.data;

    if (n8nPayload?.is_valid === false) {
      return res.status(422).json({
        error: n8nPayload.output || 'This question does not fit the research workflow.',
      });
    }

    const reportContent = getReportContent(n8nPayload);

    if (pool) {
      try {
        await pool.query(
          'INSERT INTO research_sessions (question, report) VALUES ($1, $2)',
          [trimmedQuestion, reportContent]
        );
      } catch (databaseError) {
        // Persistence should not discard a report that n8n completed successfully.
        console.error('Unable to save research session:', databaseError.message);
      }
    }

    res.json({ question: trimmedQuestion, report: reportContent });
  } catch (error) {
    console.error('Research request failed:', error.message);
    res.status(500).json({ error: 'The research result could not be processed. Please try again.' });
  }
});

app.get('/api/history', async (req, res) => {
  if (!pool) return res.json([]);

  try {
    const result = await pool.query(
      'SELECT id, question, report, created_at FROM research_sessions ORDER BY created_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
