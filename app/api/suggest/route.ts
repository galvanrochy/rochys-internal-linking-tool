import { NextRequest, NextResponse } from "next/server";

interface CrawledPage {
  url: string;
  title: string;
  description: string;
  keywords: string[];
}

interface LinkSuggestion {
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  reason: string;
}

function extractPhrases(text: string): string[] {
  const sentences = text.split(/[.!?\n]+/);
  const phrases: string[] = [];

  sentences.forEach((sentence) => {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    // Extract 2-5 word phrases
    for (let len = 5; len >= 2; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        phrases.push(words.slice(i, i + len).join(" "));
      }
    }
  });

  return phrases;
}

function cleanText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreMatch(phrase: string, page: CrawledPage): number {
  const cleanPhrase = cleanText(phrase);
  const cleanTitle = cleanText(page.title);
  const cleanDesc = cleanText(page.description);
  const phraseWords = cleanPhrase.split(" ").filter((w) => w.length > 3);

  if (phraseWords.length === 0) return 0;

  let score = 0;

  // Exact phrase in title
  if (cleanTitle.includes(cleanPhrase)) score += 10;
  // Exact phrase in description
  if (cleanDesc.includes(cleanPhrase)) score += 5;

  // Word overlap with title
  const titleWords = cleanTitle.split(" ");
  const titleOverlap = phraseWords.filter((w) => titleWords.includes(w)).length;
  score += (titleOverlap / phraseWords.length) * 6;

  // Word overlap with keywords
  const keywordOverlap = phraseWords.filter((w) => page.keywords.includes(w)).length;
  score += (keywordOverlap / phraseWords.length) * 4;

  // Word overlap with description
  const descWords = cleanDesc.split(" ");
  const descOverlap = phraseWords.filter((w) => descWords.includes(w)).length;
  score += (descOverlap / phraseWords.length) * 2;

  return score;
}

export async function POST(req: NextRequest) {
  try {
    const { content, pages } = await req.json() as { content: string; pages: CrawledPage[] };

    if (!content || !pages?.length) {
      return NextResponse.json({ error: "Content and pages are required" }, { status: 400 });
    }

    const phrases = extractPhrases(content);
    const suggestions: LinkSuggestion[] = [];
    const usedUrls = new Set<string>();
    const usedPhrases = new Set<string>();

    // Score every phrase against every page
    const candidates: { phrase: string; page: CrawledPage; score: number }[] = [];

    for (const phrase of phrases) {
      // Skip very short or very long phrases
      const wordCount = phrase.split(" ").length;
      if (wordCount < 2 || wordCount > 6) continue;
      // Skip phrases that are purely stopwords
      const cleanPhrase = cleanText(phrase);
      if (cleanPhrase.length < 6) continue;

      for (const page of pages) {
        const score = scoreMatch(phrase, page);
        if (score >= 4) {
          candidates.push({ phrase, page, score });
        }
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Pick best non-overlapping suggestions (max 15)
    for (const { phrase, page, score } of candidates) {
      if (suggestions.length >= 15) break;
      if (usedUrls.has(page.url)) continue;
      if (usedPhrases.has(phrase.toLowerCase())) continue;

      // Make sure the phrase actually appears in the original content (case-insensitive)
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (!regex.test(content)) continue;

      const reason = score >= 8
        ? `Strong match — phrase closely matches the title of this page`
        : score >= 6
        ? `Good match — several keywords align with this page's topic`
        : `Relevant match — this page covers related content`;

      suggestions.push({
        anchorText: phrase,
        targetUrl: page.url,
        targetTitle: page.title,
        reason,
      });

      usedUrls.add(page.url);
      usedPhrases.add(phrase.toLowerCase());
    }

    return NextResponse.json({ suggestions });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Analysis failed" }, { status: 500 });
  }
}
