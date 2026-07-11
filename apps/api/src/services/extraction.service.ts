import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedClaim } from "@verdict/shared-types";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Stage 1: Use Gemini Flash Lite to semantically extract only
 * objectively fact-checkable claims from raw text.
 * Opinions, comparisons, and subjective statements are filtered out.
 */
export async function extractFactCheckableClaims(text: string): Promise<ExtractedClaim[]> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  if (!text || text.trim().length < 20) return [];

  const prompt = `You are a precise fact-extraction assistant for a real-time fact-checking tool.

Extract ONLY objectively fact-checkable claims from the text below.
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

TEXT:
"${text.slice(0, 3000)}"

Return ONLY valid JSON, no markdown:
[
  {
    "claim": "exact verbatim claim text",
    "reason": "why this is fact-checkable",
    "confidence": "high|medium|low"
  }
]

If no fact-checkable claims exist, return: []`;

  const client = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const res = await model.generateContent(prompt);
  const raw = res.response.text().replace(/```json\n?|```/g, "").trim();

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
