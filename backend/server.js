require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

    const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, { question: trimmedQuestion });
    const reportContent = n8nResponse.data.choices[0].message.content;

    await pool.query(
      'INSERT INTO research_sessions (question, report) VALUES ($1, $2)',
      [trimmedQuestion, reportContent]
    );

    res.json({ question: trimmedQuestion, report: reportContent });
  } catch (error) {
    console.error('Error calling n8n:', error.message);
    res.status(500).json({ error: 'Research pipeline failed' });
  }
});

app.get('/api/history', async (req, res) => {
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

app.listen(process.env.PORT, () => {
  console.log(`Backend running on port ${process.env.PORT}`);
});