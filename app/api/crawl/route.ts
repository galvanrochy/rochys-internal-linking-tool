import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

interface CrawledPage {
  url: string;
  title: string;
  description: string;
  keywords: string[];
}

function normalizeUrl(base: string, href: string): string | null {
  try {
    const url = new URL(href, base);
    // Only same-origin, no fragments, no mailto, no files
    if (url.origin !== new URL(base).origin) return null;
    if (url.hash) url.hash = "";
    // Skip non-html extensions
    const ext = url.pathname.split(".").pop()?.toLowerCase();
    if (ext && ["pdf", "jpg", "jpeg", "png", "gif", "svg", "zip", "xml", "json", "css", "js"].includes(ext)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","may","might","this","that","these","those","it","its","we","our","you","your","they","their","he","she","his","her","i","my","me","us","not","no","so","if","as","up","out","about","into","than","then","when","where","which","who","what","how","all","each","every","both","more","most","other","some","such","new","also","just","can","like","more","very"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 20);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const baseUrl = new URL(url).origin;
    const visited = new Set<string>();
    const queue: string[] = [url];
    const pages: CrawledPage[] = [];
    const maxPages = 50;

    while (queue.length > 0 && pages.length < maxPages) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      try {
        const res = await axios.get(current, {
          timeout: 8000,
          headers: { "User-Agent": "RochysInternalLinkingBot/1.0" },
          maxRedirects: 3,
        });

        const contentType = res.headers["content-type"] || "";
        if (!contentType.includes("text/html")) continue;

        const $ = cheerio.load(res.data);

        const title = $("title").first().text().trim() || $("h1").first().text().trim() || current;
        const description =
          $('meta[name="description"]').attr("content") ||
          $('meta[property="og:description"]').attr("content") ||
          $("p").first().text().slice(0, 200) ||
          "";

        const bodyText = $("body").text();
        const keywords = extractKeywords(title + " " + description + " " + bodyText.slice(0, 1000));

        pages.push({ url: current, title, description: description.trim(), keywords });

        // Discover links
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;
          const normalized = normalizeUrl(baseUrl, href);
          if (normalized && !visited.has(normalized) && !queue.includes(normalized)) {
            queue.push(normalized);
          }
        });
      } catch {
        // Skip pages that fail to load
      }
    }

    if (pages.length === 0) {
      return NextResponse.json({ error: "Could not crawl any pages. Check the URL and try again." }, { status: 400 });
    }

    return NextResponse.json({ pages });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Crawl failed" }, { status: 500 });
  }
}
