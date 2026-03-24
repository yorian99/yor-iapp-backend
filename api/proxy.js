// api/proxy.js
export default async function handler(req, res) {
  // Set CORS untuk frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Tangani preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ganti dengan URL web app GAS yang sudah dideploy
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxORxBMEhsxoE-0VzyS2l3MVEQJS05ST7MJZApING0mLufidHcRLZFi0OTNbvGW4eW5/exec';

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}