const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Rate limiting - 30 request per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST: Gửi link và nhận shortened links
router.post('/shorten', limiter, async (req, res) => {
  try {
    const { url, title, format, apiKeys, hastebinToken } = req.body;

    // Validate
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Format content theo template
    let content = format || `[TITLE]\n[URL]`;
    content = content
      .replace('[TITLE]', title || 'Link')
      .replace('[URL]', url);

    // Bước 1: Upload lên Hastebin
    const hastebinResponse = await axios.post(
      process.env.HASTEBIN_URL,
      content,
      {
        headers: {
          'Authorization': `Bearer ${hastebinToken || process.env.HASTEBIN_TOKEN}`,
          'Content-Type': 'text/plain',
        },
      }
    );

    const hastebinKey = hastebinResponse.data.key;
    const hastebinLink = `https://hastebin.com/${hastebinKey}`;

    // Bước 2: Rút gọn link qua 3 API
    const results = {};

    // Anonlink
    try {
      const anonResponse = await axios.get('https://anonlink.co/api', {
        params: {
          api: apiKeys?.anonlink || process.env.ANONLINK_API_KEY,
          url: hastebinLink,
          format: 'text',
        },
      });
      results.link1 = `https://anonlink.co/${anonResponse.data.trim()}`;
    } catch (err) {
      results.link1 = `Error: ${err.message}`;
    }

    // Linkx
    try {
      const linkxResponse = await axios.get('https://linkx.me/api', {
        params: {
          api: apiKeys?.linkx || process.env.LINKX_API_KEY,
          url: hastebinLink,
          format: 'text',
        },
      });
      results.link2 = `https://linkx.me/${linkxResponse.data.trim()}`;
    } catch (err) {
      results.link2 = `Error: ${err.message}`;
    }

    // Mual
    try {
      const mualResponse = await axios.get('https://mual.ink/api', {
        params: {
          api: apiKeys?.mual || process.env.MUAL_API_KEY,
          url: hastebinLink,
          format: 'text',
        },
      });
      results.link3 = `https://mual.ink/${mualResponse.data.trim()}`;
    } catch (err) {
      results.link3 = `Error: ${err.message}`;
    }

    res.json({
      success: true,
      title: title || 'Shortened Links',
      links: results,
      originalUrl: hastebinLink,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      error: 'Failed to shorten link',
      details: error.message,
    });
  }
});

// GET: Lấy lịch sử chat (nếu lưu database)
router.get('/history', (req, res) => {
  // TODO: Connect database
  res.json({ history: [] });
});

// POST: Lưu lịch sử chat
router.post('/history', limiter, (req, res) => {
  const { message, response } = req.body;
  // TODO: Save to database
  res.json({ success: true });
});

module.exports = router;