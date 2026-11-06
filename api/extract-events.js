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

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Wir nutzen hier den direkten Weg über den OpenAI-kompatiblen v1beta-Endpunkt von Google, 
    // der den lästigen "models/"-Pfad-Fehler komplett umgeht!
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analysiere diesen Event-Screenshot. Extrahiere den Namen des Künstlers, die Uhrzeit und den Veranstaltungsort (z.B. Bierkönig, Megapark). Antworte AUSSCHLIESSLICH im JSON-Format ohne Markdown-Backticks: {"name": "Künstlername", "time": "Uhrzeit", "loc": "Ort"}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ]
      })
    });

    const rawText = await apiResponse.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ error: 'Google API Antwort ungültig: ' + rawText });
    }

    if (!apiResponse.ok) {
      return res.status(500).json({ error: data.error?.message || 'API Fehler aufgetreten.' });
    }

    const candidateText = data.choices?.[0]?.message?.content;
    if (!candidateText) {
      return res.status(500).json({ error: 'Kein Text in der Gemini-Antwort.' });
    }

    const cleanedText = candidateText.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const jsonResult = JSON.parse(cleanedText);

    return res.status(200).json(jsonResult);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
