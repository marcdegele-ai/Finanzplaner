export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key fehlt' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Ganz aktueller, stabiler Google Generative Language Endpunkt
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: 'Extrahiere den Künstlernamen und die Uhrzeit aus diesem Bild. Antworte NUR als JSON im Format: {"name": "Künstler", "time": "Uhrzeit"}' }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Google API Fehler' });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJson = JSON.parse(text.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, ''));

    return res.status(200).json(cleanJson);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
