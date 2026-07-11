import Groq from "groq-sdk";
import { v4 as uuidv4 } from "uuid";
import type { ExtractedClaim, FactCheckResult, VerdictLabel } from "@verdict/shared-types";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface RawGroqResult {
  claim?: string;
  verdict?: VerdictLabel;
  reasoning?: string;
  fact?: string;
  source?: string;
  sourceUrl?: string | null;
  sourceConfidence?: number;
  factDeviationScore?: number;
  factDeviationReasoning?: string;
}

function normalizeResult(raw: RawGroqResult, claims: ExtractedClaim[]): FactCheckResult {
  return {
    id: uuidv4(),
    claim: raw.claim ?? claims.map((c) => c.claim).join(" | "),
    verdict: raw.verdict ?? "Uncertain",
    reasoning: raw.reasoning ?? "No reasoning provided.",
    fact: raw.fact ?? "Not specified.",
    source: raw.source ?? "Not specified.",
    sourceUrl: raw.sourceUrl ?? null,
    sourceConfidence:
      typeof raw.sourceConfidence === "number"
        ? Math.min(Math.max(raw.sourceConfidence, 0), 1)
        : 0,
    factDeviationScore:
      typeof raw.factDeviationScore === "number"
        ? Math.min(Math.max(raw.factDeviationScore, 0), 1)
        : 0.5,
    factDeviationReasoning:
      raw.factDeviationReasoning ?? "Factual deviation could not be determined.",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Stage 2: Use Groq (llama-3.3-70b-versatile) to fact-check each extracted claim
 * and return structured verdicts with evidence and citations.
 */
export async function verifyClaims(claims: ExtractedClaim[]): Promise<FactCheckResult[]> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured.");
  if (!claims.length) return [];

  const systemPrompt = `You are a rigorous, neutral fact-checking assistant.

For each claim in the user's JSON array:
1. Evaluate its factual accuracy against established, verifiable information.
2. Score how much it deviates from the truth (factDeviationScore 0.0=accurate, 1.0=false).
3. Provide the correct factual information.
4. Cite a credible, real source with a real URL when possible.
5. Remain strictly neutral and evidence-based. Never editorialize.

Return ONLY a valid JSON array, no markdown fences, no explanation:
[
  {
    "claim": "exact claim text",
    "verdict": "True | False | Misleading | Uncertain | Unverifiable",
    "reasoning": "brief, evidence-based explanation",
    "fact": "the correct factual information",
    "source": "Source Organization or Publication Name",
    "sourceUrl": "https://real-url.org/page or null",
    "sourceConfidence": 0.95,
    "factDeviationScore": 0.0,
    "factDeviationReasoning": "short explanation of deviation score"
  }
]`;

  const client = new Groq({ apiKey: GROQ_API_KEY });

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(claims) },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  });

  const rawText = (completion.choices[0]?.message?.content ?? "")
    .replace(/```json\n?|```/g, "")
    .trim();

  try {
    const parsed: RawGroqResult | RawGroqResult[] = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => normalizeResult(item, claims));
    }
    return [normalizeResult(parsed, claims)];
  } catch {
    return [
      normalizeResult(
        {
          claim: claims.map((c) => c.claim).join(" | "),
          verdict: "Uncertain",
          reasoning: "AI returned unstructured output. Manual review recommended.",
          fact: "Could not be verified automatically.",
        },
        claims
      ),
    ];
  }
}
