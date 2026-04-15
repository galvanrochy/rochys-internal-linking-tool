"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";

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

interface CaseStudyCTAResult {
  ctaSentence: string;
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  insertAfterParagraph: string;
  companyName: string;
}

interface AnalyzeResponse {
  exactMatches: ExactMatchResult[];
  blogCTAs: BlogCTAResult[];
  caseStudyCTAs: CaseStudyCTAResult[];
  stats: {
    servicePagesFound: number;
    blogPostsFound: number;
    caseStudiesFound: number;
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
  const [activeTab, setActiveTab] = useState<"exact" | "blog" | "casestudy">("exact");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

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
      "Fetching case studies & generating case study CTAs…",
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
      setActiveTab(
        data.exactMatches.length > 0
          ? "exact"
          : data.blogCTAs.length > 0
          ? "blog"
          : "casestudy"
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  const wordCount = blogContent.trim().split(/\s+/).filter(Boolean).length;

  function downloadPDF() {
    if (!results) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    const contentW = pageW - margin * 2;
    let y = margin;

    const COLORS = {
      heading:  [15, 23, 42]  as [number, number, number],
      subhead:  [37, 99, 235] as [number, number, number],
      label:    [100, 116, 139] as [number, number, number],
      body:     [30, 41, 59]  as [number, number, number],
      muted:    [148, 163, 184] as [number, number, number],
      rule:     [226, 232, 240] as [number, number, number],
    };

    function setColor(c: [number, number, number]) {
      doc.setTextColor(c[0], c[1], c[2]);
    }

    function rule() {
      doc.setDrawColor(COLORS.rule[0], COLORS.rule[1], COLORS.rule[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 12;
    }

    function checkPage(needed = 60) {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    }

    // Wrap text and return lines
    function wrap(text: string, fontSize: number, maxW: number): string[] {
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(text, maxW);
    }

    // ── Title ──────────────────────────────────────────────────────────────
    const blogTitle = blogContent.split("\n").map((l) => l.trim()).find((l) => l.length > 20) || "";

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    setColor(COLORS.heading);
    doc.text("Internal Linking Report", margin, y);
    y += 26;

    if (blogTitle) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      setColor(COLORS.body);
      const titleLines = wrap(blogTitle, 13, contentW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 18;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setColor(COLORS.muted);
    doc.text(`hireoverseas.com  ·  Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
    y += 8;
    doc.text(`${results.stats.servicePagesFound} service pages crawled  ·  ${results.stats.blogPostsFound} blog posts crawled`, margin, y);
    y += 20;
    rule();

    // ── Section 1: Exact Match Links ───────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(COLORS.heading);
    doc.text(`Exact Match Links  (${results.exactMatches.length})`, margin, y);
    y += 22;

    if (results.exactMatches.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      setColor(COLORS.muted);
      doc.text("No exact match opportunities found.", margin, y);
      y += 20;
    } else {
      results.exactMatches.forEach((m, i) => {
        checkPage(80);

        // Number + section badge
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setColor(COLORS.subhead);
        doc.text(`${i + 1}.  [${m.section}]`, margin, y);
        y += 15;

        // Anchor phrase
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        setColor(COLORS.body);
        const phraseLines = wrap(`"${m.anchorText}"`, 11, contentW);
        doc.text(phraseLines, margin + 12, y);
        y += phraseLines.length * 15;

        // Target title
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(COLORS.label);
        doc.text("Links to:", margin + 12, y);
        setColor(COLORS.body);
        doc.text(m.targetTitle, margin + 58, y);
        y += 13;

        // URL
        setColor(COLORS.subhead);
        const urlLines = wrap(m.targetUrl, 9, contentW - 12);
        doc.text(urlLines, margin + 12, y);
        y += urlLines.length * 13;

        y += 10;
        if (i < results.exactMatches.length - 1) {
          doc.setDrawColor(COLORS.rule[0], COLORS.rule[1], COLORS.rule[2]);
          doc.setLineWidth(0.3);
          doc.line(margin + 12, y, pageW - margin, y);
          y += 10;
        }
      });
    }

    y += 10;
    checkPage(40);
    rule();

    // ── Section 2: Blog Link CTAs ─────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(COLORS.heading);
    doc.text(`Blog Link CTAs  (${results.blogCTAs.length})`, margin, y);
    y += 22;

    if (results.blogCTAs.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      setColor(COLORS.muted);
      doc.text("No blog CTA suggestions generated.", margin, y);
      y += 20;
    } else {
      results.blogCTAs.forEach((c, i) => {
        checkPage(100);

        // Number
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setColor(COLORS.subhead);
        doc.text(`${i + 1}.`, margin, y);
        y += 15;

        // CTA sentence
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        setColor(COLORS.body);
        const ctaLines = wrap(c.ctaSentence, 11, contentW - 12);
        doc.text(ctaLines, margin + 12, y);
        y += ctaLines.length * 15;

        // Target
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(COLORS.label);
        doc.text("Links to:", margin + 12, y);
        setColor(COLORS.body);
        const titleLines = wrap(c.targetTitle, 9, contentW - 60);
        doc.text(titleLines, margin + 58, y);
        y += titleLines.length * 13;

        // URL
        setColor(COLORS.subhead);
        const urlLines = wrap(c.targetUrl, 9, contentW - 12);
        doc.text(urlLines, margin + 12, y);
        y += urlLines.length * 13;

        // Insert location
        if (c.insertAfterParagraph) {
          checkPage(25);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "italic");
          setColor(COLORS.muted);
          const insertLines = wrap(`Insert after: "${c.insertAfterParagraph}"`, 8.5, contentW - 12);
          doc.text(insertLines, margin + 12, y);
          y += insertLines.length * 12;
        }

        y += 10;
        if (i < results.blogCTAs.length - 1) {
          doc.setDrawColor(COLORS.rule[0], COLORS.rule[1], COLORS.rule[2]);
          doc.setLineWidth(0.3);
          doc.line(margin + 12, y, pageW - margin, y);
          y += 10;
        }
      });
    }

    y += 10;
    checkPage(40);
    rule();

    // ── Section 3: Case Study CTAs ────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(COLORS.heading);
    doc.text(`Case Study CTAs  (${results.caseStudyCTAs.length})`, margin, y);
    y += 22;

    if (results.caseStudyCTAs.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      setColor(COLORS.muted);
      doc.text("No case study CTA suggestions generated.", margin, y);
      y += 20;
    } else {
      results.caseStudyCTAs.forEach((c, i) => {
        checkPage(100);

        // Number + company
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setColor(COLORS.subhead);
        doc.text(`${i + 1}.${c.companyName ? `  [${c.companyName}]` : ""}`, margin, y);
        y += 15;

        // CTA sentence
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        setColor(COLORS.body);
        const ctaLines = wrap(c.ctaSentence, 11, contentW - 12);
        doc.text(ctaLines, margin + 12, y);
        y += ctaLines.length * 15;

        // Target
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(COLORS.label);
        doc.text("Links to:", margin + 12, y);
        setColor(COLORS.body);
        const titleLines = wrap(c.targetTitle, 9, contentW - 60);
        doc.text(titleLines, margin + 58, y);
        y += titleLines.length * 13;

        // URL
        setColor(COLORS.subhead);
        const urlLines = wrap(c.targetUrl, 9, contentW - 12);
        doc.text(urlLines, margin + 12, y);
        y += urlLines.length * 13;

        // Insert location
        if (c.insertAfterParagraph) {
          checkPage(25);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "italic");
          setColor(COLORS.muted);
          const insertLines = wrap(`Insert after: "${c.insertAfterParagraph}"`, 8.5, contentW - 12);
          doc.text(insertLines, margin + 12, y);
          y += insertLines.length * 12;
        }

        y += 10;
        if (i < results.caseStudyCTAs.length - 1) {
          doc.setDrawColor(COLORS.rule[0], COLORS.rule[1], COLORS.rule[2]);
          doc.setLineWidth(0.3);
          doc.line(margin + 12, y, pageW - margin, y);
          y += 10;
        }
      });
    }

    doc.save("internal-linking-report.pdf");
  }

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
          <div className="ml-auto flex items-center gap-4">
            {results && (
              <div className="flex gap-3 text-xs text-slate-500">
                <span>{results.stats.servicePagesFound} service pages</span>
                <span>·</span>
                <span>{results.stats.blogPostsFound} blog posts</span>
                <span>·</span>
                <span>{results.stats.caseStudiesFound} case studies</span>
              </div>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle light/dark mode"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
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
            {/* Tabs + Download */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
              <button
                onClick={() => setActiveTab("casestudy")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "casestudy"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Case Study CTAs
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                    activeTab === "casestudy"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {results.caseStudyCTAs.length}
                </span>
              </button>
            </div>

            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
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
            {/* Case Study CTAs Tab */}
            {activeTab === "casestudy" && (
              <div className="space-y-3">
                {results.caseStudyCTAs.length === 0 ? (
                  <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center">
                    <p className="text-slate-400">No case study CTA suggestions generated.</p>
                    <p className="text-slate-600 text-sm mt-1">
                      No case studies were strongly relevant to this draft&apos;s topics.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 text-sm px-1">
                      {results.caseStudyCTAs.length} case study CTA
                      {results.caseStudyCTAs.length !== 1 ? "s" : ""} — each links to a real-world
                      example that reinforces a section of your draft.
                    </p>
                    {results.caseStudyCTAs.map((c, i) => (
                      <div
                        key={i}
                        className="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-800/50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Company badge + CTA sentence */}
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/30">
                                  Case Study
                                </span>
                                {c.companyName && (
                                  <span className="text-xs text-amber-400 font-medium">
                                    {c.companyName}
                                  </span>
                                )}
                              </div>
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

                            {/* Target case study */}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500 text-xs">Links to:</span>
                              <span className="text-slate-200 text-xs">{c.targetTitle}</span>
                            </div>
                            <a
                              href={c.targetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 text-xs hover:underline truncate block"
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
