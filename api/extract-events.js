export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Kein Bild übergeben' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY fehlt in Vercel.' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Verwende den offiziellen v1-Endpunkt für das stabile gemini-1.5-flash Modell
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: { mimeType: mimeType, data: base64Data }
              },
              {
                text: 'Analysiere diesen Event-Screenshot. Extrahiere den Namen des Künstlers, die Uhrzeit und den Veranstaltungsort (z.B. Bierkönig, Megapark). Antworte AUSSCHLIESSLICH im JSON-Format ohne Markdown-Backticks: {"name": "Künstlername", "time": "Uhrzeit", "loc": "Ort"}'
              }
            ]
          }
        ]
      })
    });

    const rawText = await apiResponse.text();
    
    if (!apiResponse.ok) {
      return res.status(500).json({ error: 'Google API Fehler: ' + rawText });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ error: 'Ungültige API-Antwort erhalten.' });
    }

    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return res.status(500).json({ error: 'Kein Text in der Gemini-Antwort.' });
    }

    const cleanedText = candidateText.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const jsonResult = JSON.parse(cleanedText);

    return res.status(200).json(jsonResult);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
