const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
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

    // Offizieller Google Gen AI SDK Client
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Nutzung des stabilen Flash-Modells über das offizielle SDK
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: 'Analysiere diesen Event-Screenshot. Extrahiere den Namen des Künstlers, die Uhrzeit und den Veranstaltungsort (z.B. Bierkönig, Megapark). Antworte AUSSCHLIESSLICH im JSON-Format ohne Markdown-Backticks: {"name": "Künstlername", "time": "Uhrzeit", "loc": "Ort"}'
        }
      ]
    });

    const candidateText = response.text;
    if (!candidateText) {
      return res.status(500).json({ error: 'Keine Antwort vom Modell erhalten.' });
    }

    const cleanedText = candidateText.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const jsonResult = JSON.parse(cleanedText);

    return res.status(200).json(jsonResult);
  } catch (error) {
    return res.status(500).json({ error: 'SDK Fehler: ' + error.message });
  }
};
