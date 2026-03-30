"use client";

import { useState } from "react";

interface ExactMatchResult {
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  contextSnippet: string;
  section: string;
}

interface BlogCTAResult {
  ctaSentence: string;
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  insertAfterParagraph: string;
}

interface AnalyzeResponse {
  exactMatches: ExactMatchResult[];
  blogCTAs: BlogCTAResult[];
  stats: {
    servicePagesFound: number;
    blogPostsFound: number;
  };
}

const SECTION_COLORS: Record<string, string> = {
  Role: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Case Study": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Playbook: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Software: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Hire Remote": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Alternative: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Page: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition font-medium"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function highlightAnchor(text: string, anchor: string) {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "i"));
  return parts.map((part, i) =>
    new RegExp(`^${escaped}$`, "i").test(part) ? (
      <mark key={i} className="bg-blue-500/30 text-blue-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function Home() {
  const [blogContent, setBlogContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"exact" | "blog">("exact");

  async function handleAnalyze() {
    if (!blogContent.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    const messages = [
      "Crawling hireoverseas.com…",
      "Scanning /roles, /case-studies, /playbooks…",
      "Scanning /hire-remote, /alternatives, /software-assistant…",
      "Scanning /blog posts…",
      "Finding exact match opportunities…",
      "Generating blog CTA suggestions with AI…",
    ];
    let msgIdx = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1);
      setLoadingMsg(messages[msgIdx]);
    }, 4000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogContent: blogContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResults(data);
      setActiveTab(data.exactMatches.length > 0 ? "exact" : "blog");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  const wordCount = blogContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-xl">
            💖
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight">
              Rochy&apos;s Internal Linking Tool
            </h1>
            <p className="text-slate-500 text-xs">hireoverseas.com — real-time crawl</p>
          </div>
          {results && (
            <div className="ml-auto flex gap-3 text-xs text-slate-500">
              <span>{results.stats.servicePagesFound} service pages</span>
              <span>·</span>
              <span>{results.stats.blogPostsFound} blog posts</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Input */}
        <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-white font-semibold">Paste Your Blog Draft</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                The tool will crawl hireoverseas.com in real-time and find internal linking
                opportunities.
              </p>
            </div>
            {wordCount > 0 && (
              <span className="text-slate-500 text-xs mt-1 shrink-0 ml-4">
                {wordCount.toLocaleString()} words
              </span>
            )}
          </div>
          <textarea
            value={blogContent}
            onChange={(e) => setBlogContent(e.target.value)}
            placeholder="Paste your full blog post content here…"
            rows={12}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition resize-none text-sm leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-slate-600 text-xs">
              Crawls /roles, /case-studies, /playbooks, /software-assistant, /hire-remote,
              /alternatives &amp; /blog
            </p>
            <button
              onClick={handleAnalyze}
              disabled={loading || !blogContent.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
            >
              {loading ? "Analyzing…" : "Find Internal Links"}
            </button>
          </div>
          {loading && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-blue-400 text-sm">{loadingMsg}</p>
            </div>
          )}
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        </section>

        {/* Results */}
        {results && (
          <section className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
              <button
                onClick={() => setActiveTab("exact")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "exact"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Exact Match Links
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                    activeTab === "exact"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {results.exactMatches.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("blog")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "blog"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Blog Link CTAs
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                    activeTab === "blog"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {results.blogCTAs.length}
                </span>
              </button>
            </div>

            {/* Exact Match Tab */}
            {activeTab === "exact" && (
              <div className="space-y-3">
                {results.exactMatches.length === 0 ? (
                  <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center">
                    <p className="text-slate-400">
                      No exact match opportunities found in this draft.
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      Try adding more content or check the blog tab for CTA suggestions.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 text-sm px-1">
                      {results.exactMatches.length} phrase
                      {results.exactMatches.length !== 1 ? "s" : ""} in your draft exactly
                      match pages on hireoverseas.com — link them directly.
                    </p>
                    {results.exactMatches.map((m, i) => (
                      <div
                        key={i}
                        className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Top row: section badge + anchor text */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                                  SECTION_COLORS[m.section] || SECTION_COLORS["Page"]
                                }`}
                              >
                                {m.section}
                              </span>
                              <span className="text-white font-semibold">
                                &ldquo;{m.anchorText}&rdquo;
                              </span>
                            </div>

                            {/* Target */}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500">Links to:</span>
                              <span className="text-slate-200">{m.targetTitle}</span>
                            </div>
                            <a
                              href={m.targetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 text-xs hover:underline truncate block"
                            >
                              {m.targetUrl}
                            </a>

                            {/* Context snippet */}
                            <div className="bg-slate-950 rounded-lg px-3 py-2 text-slate-400 text-xs leading-relaxed border border-slate-800">
                              {highlightAnchor(m.contextSnippet, m.anchorText)}
                            </div>
                          </div>

                          <CopyButton
                            text={m.targetUrl}
                            label="Copy URL"
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Blog CTA Tab */}
            {activeTab === "blog" && (
              <div className="space-y-3">
                {results.blogCTAs.length === 0 ? (
                  <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center">
                    <p className="text-slate-400">No blog CTA suggestions generated.</p>
                    <p className="text-slate-600 text-sm mt-1">
                      Make sure ANTHROPIC_API_KEY is set or try a longer blog draft.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 text-sm px-1">
                      {results.blogCTAs.length} read-more CTA
                      {results.blogCTAs.length !== 1 ? "s" : ""} to add to your draft. Each is a
                      sentence to insert at the suggested location.
                    </p>
                    {results.blogCTAs.map((c, i) => (
                      <div
                        key={i}
                        className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* CTA sentence with anchor highlighted */}
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                CTA Sentence to insert
                              </p>
                              <p className="text-slate-200 text-sm leading-relaxed">
                                {highlightAnchor(c.ctaSentence, c.anchorText)}
                              </p>
                            </div>

                            {/* Insert location */}
                            {c.insertAfterParagraph && (
                              <div className="bg-slate-950 rounded-lg px-3 py-2 border border-slate-800">
                                <p className="text-xs text-slate-600 mb-1">Insert after paragraph starting with:</p>
                                <p className="text-slate-400 text-xs italic">
                                  &ldquo;{c.insertAfterParagraph}&rdquo;
                                </p>
                              </div>
                            )}

                            {/* Target blog */}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500 text-xs">Links to:</span>
                              <span className="text-slate-200 text-xs">{c.targetTitle}</span>
                            </div>
                            <a
                              href={c.targetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 text-xs hover:underline truncate block"
                            >
                              {c.targetUrl}
                            </a>
                          </div>

                          <CopyButton
                            text={c.targetUrl}
                            label="Copy URL"
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
