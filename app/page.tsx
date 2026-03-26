"use client";

import { useState } from "react";

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

export default function Home() {
  const [siteUrl, setSiteUrl] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [crawlError, setCrawlError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  async function handleCrawl() {
    if (!siteUrl.trim()) return;
    setCrawling(true);
    setCrawlError("");
    setCrawledPages([]);
    setSuggestions([]);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: siteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      setCrawledPages(data.pages);
      setStep(2);
    } catch (e: unknown) {
      setCrawlError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCrawling(false);
    }
  }

  async function handleAnalyze() {
    if (!blogContent.trim() || crawledPages.length === 0) return;
    setAnalyzing(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: blogContent, pages: crawledPages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setSuggestions(data.suggestions);
      setStep(3);
    } catch (e: unknown) {
      setCrawlError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function highlightContent(content: string, suggestions: LinkSuggestion[]) {
    if (!suggestions.length) return content;
    let result = content;
    suggestions.forEach(({ anchorText, targetUrl }) => {
      const escaped = anchorText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(
        new RegExp(`(${escaped})`, "gi"),
        `<a href="${targetUrl}" target="_blank" class="text-blue-600 underline font-medium">$1</a>`
      );
    });
    return result;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">R</div>
          <h1 className="text-white font-semibold text-lg">Rochy&apos;s Internal Linking Tool</h1>
          <span className="ml-auto text-slate-400 text-sm">{crawledPages.length > 0 && `${crawledPages.length} pages crawled`}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs
                ${step >= s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                {s}
              </div>
              <span className={step >= s ? "text-white" : "text-slate-500"}>
                {s === 1 ? "Crawl Site" : s === 2 ? "Paste Blog Post" : "View Suggestions"}
              </span>
              {s < 3 && <div className="w-8 h-px bg-slate-700 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Crawl */}
        <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-white font-semibold mb-1">Step 1 — Crawl Your Website</h2>
          <p className="text-slate-400 text-sm mb-4">Enter your website URL to discover all pages and posts.</p>
          <div className="flex gap-3">
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
              placeholder="https://yourblog.com"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              onClick={handleCrawl}
              disabled={crawling || !siteUrl.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
            >
              {crawling ? "Crawling…" : "Crawl"}
            </button>
          </div>
          {crawlError && <p className="mt-3 text-red-400 text-sm">{crawlError}</p>}
          {crawledPages.length > 0 && (
            <div className="mt-4">
              <p className="text-green-400 text-sm font-medium mb-2">✓ Found {crawledPages.length} pages</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {crawledPages.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 w-5 text-right">{i + 1}.</span>
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{p.title || p.url}</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Blog post */}
        <section className={`bg-slate-800 rounded-2xl p-6 border transition ${step < 2 ? "border-slate-700 opacity-50 pointer-events-none" : "border-slate-700"}`}>
          <h2 className="text-white font-semibold mb-1">Step 2 — Paste Your Blog Post</h2>
          <p className="text-slate-400 text-sm mb-4">Paste the content you&apos;re writing. The tool will find linking opportunities.</p>
          <textarea
            value={blogContent}
            onChange={(e) => setBlogContent(e.target.value)}
            placeholder="Paste your blog post content here…"
            rows={10}
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-slate-500 text-sm">{blogContent.trim().split(/\s+/).filter(Boolean).length} words</span>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !blogContent.trim() || crawledPages.length === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
            >
              {analyzing ? "Analyzing…" : "Find Internal Links"}
            </button>
          </div>
        </section>

        {/* Step 3: Suggestions */}
        {suggestions.length > 0 && (
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-white font-semibold mb-1">Step 3 — Internal Link Suggestions</h2>
            <p className="text-slate-400 text-sm mb-5">{suggestions.length} linking opportunities found.</p>

            {/* Suggestions list */}
            <div className="space-y-3 mb-8">
              {suggestions.map((s, i) => (
                <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">Anchor text</span>
                        <span className="text-white font-medium">&ldquo;{s.anchorText}&rdquo;</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-1">→ <span className="text-slate-300">{s.targetTitle}</span></p>
                      <a href={s.targetUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline truncate block">{s.targetUrl}</a>
                      <p className="text-slate-500 text-xs mt-1">{s.reason}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(`<a href="${s.targetUrl}">${s.anchorText}</a>`)}
                      className="shrink-0 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                    >
                      Copy HTML
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Highlighted preview */}
            <div>
              <h3 className="text-white font-semibold mb-3">Blog Post Preview with Links</h3>
              <div
                className="bg-slate-900 rounded-xl p-5 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap border border-slate-700"
                dangerouslySetInnerHTML={{ __html: highlightContent(blogContent, suggestions) }}
              />
            </div>
          </section>
        )}

        {step === 3 && suggestions.length === 0 && !analyzing && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
            <p className="text-slate-400">No internal linking opportunities found for this content.</p>
            <p className="text-slate-500 text-sm mt-1">Try crawling more pages or expanding your blog post content.</p>
          </div>
        )}
      </main>
    </div>
  );
}
