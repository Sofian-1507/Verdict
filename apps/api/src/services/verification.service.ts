import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import type { ExtractedClaim, FactCheckResult, VerdictLabel } from "@verdict/shared-types";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface RawGeminiResult {
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

function normalizeResult(raw: RawGeminiResult, claims: ExtractedClaim[]): FactCheckResult {
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
 * Stage 2: Use Gemini Flash to fact-check each extracted claim
 * and return structured verdicts with evidence and citations.
 */
export async function verifyClaims(claims: ExtractedClaim[]): Promise<FactCheckResult[]> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  if (!claims.length) return [];

  const prompt = `You are a rigorous, neutral fact-checking assistant.

You will receive a list of fact-checkable claims extracted from text.

For each claim:
1. Evaluate its factual accuracy against established, verifiable information.
2. Score how much it deviates from the truth (factDeviationScore).
3. Provide the correct factual information.
4. Cite a credible, real source with a real URL when possible.
5. Remain strictly neutral and evidence-based. Never editorialize.

Scoring:
- factDeviationScore 0.0 = completely accurate
- factDeviationScore 0.5 = misleading or partially incorrect
- factDeviationScore 1.0 = completely false

CLAIMS:
${JSON.stringify(claims, null, 2)}

Return ONLY a valid JSON array, no markdown fences:
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

  const client = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const res = await model.generateContent(prompt);
  const rawText = res.response.text().replace(/```json\n?|```/g, "").trim();

  try {
    const parsed: RawGeminiResult | RawGeminiResult[] = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => normalizeResult(item, claims));
    }
    return [normalizeResult(parsed, claims)];
  } catch {
    // Plain-text fallback — return a single uncertain result
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
