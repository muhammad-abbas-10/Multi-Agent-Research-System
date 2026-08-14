require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/research', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, { question });
    const reportContent = n8nResponse.data.choices[0].message.content;

    res.json({ question, report: reportContent });
  } catch (error) {
    console.error('Error calling n8n:', error.message);
    res.status(500).json({ error: 'Research pipeline failed' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Backend running on port ${process.env.PORT}`);
});