import Groq from "groq-sdk";
import type { ExtractedClaim } from "@verdict/shared-types";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Stage 1: Use Groq (llama3-8b-8192) to semantically extract only
 * objectively fact-checkable claims from raw text.
 * Opinions, comparisons, and subjective statements are filtered out.
 */
export async function extractFactCheckableClaims(text: string): Promise<ExtractedClaim[]> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured.");
  if (!text || text.trim().length < 20) return [];

  const systemPrompt = `You are a precise fact-extraction assistant for a real-time fact-checking tool.

Extract ONLY objectively fact-checkable claims from the user's text.
A fact-checkable claim is a statement that:
- Asserts a specific, verifiable fact about the world
- Contains statistics, dates, names, quantities, or scientific assertions
- Can be proven true or false with evidence

EXCLUDE:
- Opinions ("I think...", "I believe...")
- Predictions about the future
- Rhetorical questions
- Pure comparisons without factual basis
- Emotional or subjective statements

Return ONLY a valid JSON array, no markdown fences, no explanation:
[
  {
    "claim": "exact verbatim claim text",
    "reason": "why this is fact-checkable",
    "confidence": "high|medium|low"
  }
]

If no fact-checkable claims exist, return: []`;

  const client = new Groq({ apiKey: GROQ_API_KEY });

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text.slice(0, 3000) },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const raw = (completion.choices[0]?.message?.content ?? "")
    .replace(/```json\n?|```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
