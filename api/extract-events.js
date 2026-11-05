import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Kein Bild übergeben' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Bereite das Bild für die API vor
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        },
        {
          text: "Analysiere diesen Screenshot. Extrahiere den Namen/Titel des Events und die Uhrzeit. Antworte AUSSCHLIESSLICH im JSON-Format mit den Schlüsseln \"name\" und \"time\"."
        }
      ]
    });

    const resultText = response.text.trim();
    // Versuche das JSON zu parsen
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Konnte kein JSON aus der Antwort extrahieren");
    }
    
    const eventData = JSON.parse(jsonMatch[0]);
    return res.status(200).json(eventData);

  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({ error: error.message });
  }
}
