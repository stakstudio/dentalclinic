/* ============================================================
   /api/smile  —  AI Smile generator (Vercel serverless function)
   ------------------------------------------------------------
   Receives a face photo, asks Google Gemini's image-editing model
   ("Nano Banana" / gemini-2.5-flash-image) to redesign ONLY the
   teeth, and returns the edited image.

   Request  (POST, JSON):
     { image: "data:image/jpeg;base64,...", style: "natural|bright|hollywood" }
   Response (JSON):
     { image: "data:image/png;base64,..." }          on success
     { error: "..." }                                 on failure

   Requires env var:  GEMINI_API_KEY
   ============================================================ */

import { GoogleGenAI } from '@google/genai';

// The image model. "gemini-2.5-flash-image" is the GA name (a.k.a. Nano Banana).
// If your account only has the preview, use 'gemini-2.5-flash-image-preview'.
const MODEL = 'gemini-2.5-flash-image';

// Core instruction — exactly the teeth-only edit, never touch anything else.
const BASE_PROMPT =
  'Edit only the teeth in this image. Transform the teeth into a professional ' +
  'cosmetic dental result (such as veneers, Hollywood smile, or natural ' +
  'orthodontic correction), with a clean, realistic, and natural appearance. ' +
  'Do not modify the face, lips, mouth shape, jawline, skin, eyes, hair, ' +
  'expression, head shape, or any other part of the image. The only changes ' +
  'allowed are to the teeth, including color, alignment, shape, spacing, and ' +
  'smile aesthetics. Preserve all original facial features exactly as they are.';

// Per-style nuance appended to the base prompt.
const STYLE_PROMPTS = {
  natural:
    'Aim for a natural, subtle result: gently straighten and even out the teeth, ' +
    'whiten them to a believable healthy shade (not pure white), and keep natural ' +
    'translucency and texture so it looks like real, well-cared-for teeth.',
  bright:
    'Aim for a bright, clean look: noticeably whiten and brighten the teeth to a ' +
    'fresh, attractive shade, straighten and even them out, while keeping the ' +
    'result realistic.',
  hollywood:
    'Aim for a flawless Hollywood smile: bright white, perfectly aligned and ' +
    'evenly proportioned veneers with a polished, glamorous finish — still ' +
    'photorealistic and natural-looking in the mouth.',
};

export default async function handler(req, res) {
  // CORS (handy if the page is served from a different origin while testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'الخادم غير مُهيّأ: مفتاح GEMINI_API_KEY غير موجود.' });
  }

  try {
    // Vercel auto-parses JSON bodies; fall back to manual parse just in case.
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { image, style = 'bright' } = body || {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'لم يتم استلام أي صورة.' });
    }

    // Split "data:<mime>;base64,<data>"
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res
        .status(400)
        .json({ error: 'صيغة الصورة غير صحيحة. أرسل صورة بصيغة data URL.' });
    }
    const mimeType = match[1];
    const data = match[2];

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.bright;
    const prompt = `${BASE_PROMPT}\n\n${stylePrompt}`;

    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data } },
          ],
        },
      ],
    });

    // Find the returned image part.
    const parts = result?.candidates?.[0]?.content?.parts ?? [];
    let outData = null;
    let outMime = 'image/png';
    let textNote = '';

    for (const part of parts) {
      if (part?.inlineData?.data) {
        outData = part.inlineData.data;
        outMime = part.inlineData.mimeType || outMime;
      } else if (part?.text) {
        textNote += part.text;
      }
    }

    if (!outData) {
      // Model returned no image — usually a safety refusal or an unusable photo.
      return res.status(422).json({
        error:
          textNote.trim() ||
          'تعذّر إنشاء النتيجة لهذه الصورة. جرّب صورة أوضح للابتسامة من الأمام.',
      });
    }

    return res.status(200).json({ image: `data:${outMime};base64,${outData}` });
  } catch (err) {
    console.error('Gemini smile generation failed:', err);
    const msg =
      err?.message && /api key|permission|quota|429|503|model/i.test(err.message)
        ? err.message
        : 'حدث خطأ أثناء معالجة الصورة. حاول مرة أخرى بعد قليل.';
    return res.status(500).json({ error: msg });
  }
}
