export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxORxBMEhsxoE-0VzyS2l3MVEQJS05ST7MJZApING0mLufidHcRLZFi0OTNbvGW4eW5/exec'; // ganti dengan URL Anda

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch {
      res.status(500).json({ success: false, message: 'GAS returned non-JSON', raw: text.substring(0, 200) });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
