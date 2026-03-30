import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const SITE = "https://www.hireoverseas.com";

const EXACT_MATCH_SUBFOLDERS = [
  "/roles",
  "/case-studies",
  "/playbooks",
  "/software-assistant",
  "/hire-remote",
  "/alternatives",
];

const BLOG_SUBFOLDER = "/blogs";

// ─── Brand / acronym overrides for slug segments ───────────────────────────
const SEGMENT_OVERRIDES: Record<string, string> = {
  "chat-gpt": "ChatGPT",
  chatgpt: "ChatGPT",
  "gpt-4": "GPT-4",
  "gpt-3": "GPT-3",
  openai: "OpenAI",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  zapier: "Zapier",
  airtable: "Airtable",
  asana: "Asana",
  trello: "Trello",
  monday: "Monday.com",
  notion: "Notion",
  figma: "Figma",
  shopify: "Shopify",
  wordpress: "WordPress",
  woocommerce: "WooCommerce",
  webflow: "Webflow",
  upwork: "Upwork",
  fiverr: "Fiverr",
  toptal: "Toptal",
  linkedin: "LinkedIn",
  typeform: "Typeform",
  mailchimp: "Mailchimp",
  klaviyo: "Klaviyo",
  stripe: "Stripe",
  quickbooks: "QuickBooks",
  xero: "Xero",
  slack: "Slack",
  jira: "Jira",
  confluence: "Confluence",
  zendesk: "Zendesk",
  intercom: "Intercom",
  clickup: "ClickUp",
  pipedrive: "Pipedrive",
  zoho: "Zoho",
  activecampaign: "ActiveCampaign",
  convertkit: "ConvertKit",
  sendgrid: "SendGrid",
  twilio: "Twilio",
  aws: "AWS",
  azure: "Azure",
  ga4: "GA4",
  seo: "SEO",
  ai: "AI",
  api: "API",
  crm: "CRM",
  erp: "ERP",
  saas: "SaaS",
  b2b: "B2B",
  b2c: "B2C",
  cto: "CTO",
  cfo: "CFO",
  coo: "COO",
  php: "PHP",
  ui: "UI",
  ux: "UX",
  hr: "HR",
  pr: "PR",
  sdr: "SDR",
  bdr: "BDR",
  ppc: "PPC",
  cpc: "CPC",
  roi: "ROI",
  kpi: "KPI",
  okr: "OKR",
  n8n: "n8n",
  make: "Make",
  clay: "Clay",
  apollo: "Apollo",
  "runway-ml": "Runway ML",
  runway: "Runway",
  veo: "Veo",
  "google-veo": "Google Veo",
  openclaw: "OpenClaw",
  aeo: "AEO",
  ugc: "UGC",
  "qa": "QA",
  reddit: "Reddit",
  unity: "Unity",
  dental: "Dental",
  healthcare: "Healthcare",
  medical: "Medical",
  amazon: "Amazon",
  ecommerce: "eCommerce",
  facebook: "Facebook",
  google: "Google",
};

// Generic slug words that shouldn't be used as standalone anchor text
const GENERIC_WORDS = new Set([
  "expert", "developer", "specialist", "alternative", "manager",
  "assistant", "support", "analyst", "designer", "editor", "writer",
  "hire", "remote", "overseas", "virtual", "professional", "service",
  "agency", "consultant", "consultant", "freelancer", "staff",
]);

// ─── Hardcoded fallback pages — real URLs from sitemap ───────────────────────
interface HardcodedPage {
  url: string;
  title: string;
  slugTerms: string[];
}

const HARDCODED_PAGES: HardcodedPage[] = [
  // ── Software assistant (real slugs from sitemap) ──
  { url: `${SITE}/software-assistant/chat-gpt-expert`, title: "ChatGPT Expert", slugTerms: ["ChatGPT", "Chat GPT", "chat gpt", "GPT"] },
  { url: `${SITE}/software-assistant/zapier-expert`, title: "Zapier Expert", slugTerms: ["Zapier"] },
  { url: `${SITE}/software-assistant/hubspot-expert`, title: "HubSpot Expert", slugTerms: ["HubSpot"] },
  { url: `${SITE}/software-assistant/notion-expert`, title: "Notion Expert", slugTerms: ["Notion"] },
  { url: `${SITE}/software-assistant/clay-expert`, title: "Clay Expert", slugTerms: ["Clay"] },
  { url: `${SITE}/software-assistant/make-expert`, title: "Make Expert", slugTerms: ["Make", "Integromat"] },
  { url: `${SITE}/software-assistant/figma-expert`, title: "Figma Expert", slugTerms: ["Figma"] },
  { url: `${SITE}/software-assistant/klaviyo-expert`, title: "Klaviyo Expert", slugTerms: ["Klaviyo"] },
  { url: `${SITE}/software-assistant/apollo-expert`, title: "Apollo Expert", slugTerms: ["Apollo", "Apollo.io"] },
  { url: `${SITE}/software-assistant/n8n-expert`, title: "n8n Expert", slugTerms: ["n8n"] },
  { url: `${SITE}/software-assistant/google-veo-3-expert`, title: "Google Veo 3 Expert", slugTerms: ["Google Veo 3", "Veo 3", "Google Veo"] },
  { url: `${SITE}/software-assistant/runway-ml-expert`, title: "Runway ML Expert", slugTerms: ["Runway ML", "Runway"] },
  { url: `${SITE}/software-assistant/claude-code-expert`, title: "Claude Code Expert", slugTerms: ["Claude Code"] },
  // ── Roles (real slugs from sitemap) ──
  { url: `${SITE}/roles/accountant`, title: "Accountant", slugTerms: ["accountant", "accounting"] },
  { url: `${SITE}/roles/aeo-specialist`, title: "AEO Specialist", slugTerms: ["AEO specialist", "AEO"] },
  { url: `${SITE}/roles/ai-implementation-specialist`, title: "AI Implementation Specialist", slugTerms: ["AI implementation specialist", "AI implementation"] },
  { url: `${SITE}/roles/ai-seo-specialist`, title: "AI SEO Specialist", slugTerms: ["AI SEO specialist", "AI SEO"] },
  { url: `${SITE}/roles/amazon-virtual-assistant`, title: "Amazon Virtual Assistant", slugTerms: ["Amazon virtual assistant", "Amazon VA"] },
  { url: `${SITE}/roles/automations-manager`, title: "Automations Manager", slugTerms: ["automations manager", "automation manager"] },
  { url: `${SITE}/roles/backend-engineers`, title: "Backend Engineers", slugTerms: ["backend engineer", "backend developer"] },
  { url: `${SITE}/roles/bookkeeper`, title: "Bookkeeper", slugTerms: ["bookkeeper", "bookkeeping"] },
  { url: `${SITE}/roles/claude-ai-developer`, title: "Claude AI Developer", slugTerms: ["Claude AI developer", "Claude developer"] },
  { url: `${SITE}/roles/community-manager`, title: "Community Manager", slugTerms: ["community manager"] },
  { url: `${SITE}/roles/content-assistant`, title: "Content Assistant", slugTerms: ["content assistant"] },
  { url: `${SITE}/roles/content-writer`, title: "Content Writer", slugTerms: ["content writer", "content writing"] },
  { url: `${SITE}/roles/copywriter`, title: "Copywriter", slugTerms: ["copywriter", "copywriting"] },
  { url: `${SITE}/roles/customer-support-representative`, title: "Customer Support Representative", slugTerms: ["customer support", "customer service representative"] },
  { url: `${SITE}/roles/data-analyst`, title: "Data Analyst", slugTerms: ["data analyst", "data analysis"] },
  { url: `${SITE}/roles/dental-billing-assistant`, title: "Dental Billing Assistant", slugTerms: ["dental billing", "dental billing assistant"] },
  { url: `${SITE}/roles/dental-receptionist`, title: "Dental Receptionist", slugTerms: ["dental receptionist"] },
  { url: `${SITE}/roles/digital-marketing-manager`, title: "Digital Marketing Manager", slugTerms: ["digital marketing manager", "digital marketing"] },
  { url: `${SITE}/roles/ecommerce-customer-support`, title: "eCommerce Customer Support", slugTerms: ["ecommerce customer support", "eCommerce support"] },
  { url: `${SITE}/roles/email-marketing-specialist`, title: "Email Marketing Specialist", slugTerms: ["email marketing specialist", "email marketing"] },
  { url: `${SITE}/roles/executive-assistant`, title: "Executive Assistant", slugTerms: ["executive assistant", "EA"] },
  { url: `${SITE}/roles/facebook-ads-manager`, title: "Facebook Ads Manager", slugTerms: ["Facebook Ads manager", "Facebook Ads"] },
  { url: `${SITE}/roles/financial-analyst`, title: "Financial Analyst", slugTerms: ["financial analyst", "financial analysis"] },
  { url: `${SITE}/roles/forward-deployed-engineer`, title: "Forward Deployed Engineer", slugTerms: ["forward deployed engineer"] },
  { url: `${SITE}/roles/front-end-engineers`, title: "Front-End Engineers", slugTerms: ["front-end engineer", "frontend developer", "front end developer"] },
  { url: `${SITE}/roles/google-ads-manager`, title: "Google Ads Manager", slugTerms: ["Google Ads manager", "Google Ads"] },
  { url: `${SITE}/roles/graphic-designer`, title: "Graphic Designer", slugTerms: ["graphic designer", "graphic design"] },
  { url: `${SITE}/roles/growth-marketer`, title: "Growth Marketer", slugTerms: ["growth marketer", "growth marketing"] },
  { url: `${SITE}/roles/head-hunter`, title: "Head Hunter", slugTerms: ["head hunter", "headhunter", "recruiter"] },
  { url: `${SITE}/roles/healthcare-recruiters`, title: "Healthcare Recruiters", slugTerms: ["healthcare recruiter", "medical recruiter"] },
  { url: `${SITE}/roles/medical-billing-virtual-assistant`, title: "Medical Billing Virtual Assistant", slugTerms: ["medical billing", "medical billing virtual assistant"] },
  { url: `${SITE}/roles/medical-scribe`, title: "Medical Scribe", slugTerms: ["medical scribe"] },
  { url: `${SITE}/roles/medical-virtual-assistant`, title: "Medical Virtual Assistant", slugTerms: ["medical virtual assistant", "medical VA"] },
  { url: `${SITE}/roles/openclaw-ai-engineer`, title: "OpenClaw AI Engineer", slugTerms: ["OpenClaw AI engineer", "OpenClaw engineer"] },
  { url: `${SITE}/roles/openclaw-automation-developer`, title: "OpenClaw Automation Developer", slugTerms: ["OpenClaw automation developer"] },
  { url: `${SITE}/roles/openclaw-implementation-expert`, title: "OpenClaw Implementation Expert", slugTerms: ["OpenClaw implementation"] },
  { url: `${SITE}/roles/openclaw-integration-specialist`, title: "OpenClaw Integration Specialist", slugTerms: ["OpenClaw integration"] },
  { url: `${SITE}/roles/openclaw-manager`, title: "OpenClaw Manager", slugTerms: ["OpenClaw manager"] },
  { url: `${SITE}/roles/paid-ads-manager`, title: "Paid Ads Manager", slugTerms: ["paid ads manager", "paid ads", "PPC"] },
  { url: `${SITE}/roles/paralegal-for-law-firms`, title: "Paralegal for Law Firms", slugTerms: ["paralegal", "law firm paralegal"] },
  { url: `${SITE}/roles/payroll-specialist`, title: "Payroll Specialist", slugTerms: ["payroll specialist", "payroll"] },
  { url: `${SITE}/roles/product-designer`, title: "Product Designer", slugTerms: ["product designer", "product design"] },
  { url: `${SITE}/roles/project-manager`, title: "Project Manager", slugTerms: ["project manager", "project management"] },
  { url: `${SITE}/roles/qa-tester`, title: "QA Tester", slugTerms: ["QA tester", "QA", "quality assurance"] },
  { url: `${SITE}/roles/reddit-marketers`, title: "Reddit Marketers", slugTerms: ["Reddit marketer", "Reddit marketing"] },
  { url: `${SITE}/roles/sales-development-representative`, title: "Sales Development Representative", slugTerms: ["sales development representative", "SDR"] },
  { url: `${SITE}/roles/seo-specialist`, title: "SEO Specialist", slugTerms: ["SEO specialist", "SEO"] },
  { url: `${SITE}/roles/shopify-virtual-assistant`, title: "Shopify Virtual Assistant", slugTerms: ["Shopify virtual assistant", "Shopify VA"] },
  { url: `${SITE}/roles/social-media-manager`, title: "Social Media Manager", slugTerms: ["social media manager"] },
  { url: `${SITE}/roles/ugc-content-creator`, title: "UGC Content Creator", slugTerms: ["UGC content creator", "UGC creator", "UGC"] },
  { url: `${SITE}/roles/unity-developer`, title: "Unity Developer", slugTerms: ["Unity developer", "Unity"] },
  { url: `${SITE}/roles/ux-ui-designer`, title: "UX/UI Designer", slugTerms: ["UX/UI designer", "UX designer", "UI designer", "UX UI"] },
  { url: `${SITE}/roles/video-editor`, title: "Video Editor", slugTerms: ["video editor", "video editing"] },
  { url: `${SITE}/roles/virtual-assistant`, title: "Virtual Assistant", slugTerms: ["virtual assistant", "VA"] },
  { url: `${SITE}/roles/virtual-medical-receptionist`, title: "Virtual Medical Receptionist", slugTerms: ["virtual medical receptionist"] },
  { url: `${SITE}/roles/web-developer`, title: "Web Developer", slugTerms: ["web developer", "web development"] },
  // ── Alternatives (real slugs from sitemap) ──
  { url: `${SITE}/alternatives/hire-overseas-vs-upwork`, title: "Hire Overseas vs Upwork", slugTerms: ["Upwork", "Upwork alternative", "vs Upwork"] },
  { url: `${SITE}/alternatives/hire-overseas-vs-hire-with-near`, title: "Hire Overseas vs Near", slugTerms: ["Near alternative", "hire with Near"] },
  { url: `${SITE}/alternatives/hire-overseas-vs-somewhere`, title: "Hire Overseas vs Somewhere", slugTerms: ["Somewhere alternative"] },
  // ── Case studies (real slugs from sitemap) ──
  { url: `${SITE}/case-studies/artist-case-study`, title: "Artist Case Study", slugTerms: ["artist case study"] },
  { url: `${SITE}/case-studies/golden-egg`, title: "Golden Egg Case Study", slugTerms: ["Golden Egg"] },
  { url: `${SITE}/case-studies/rupa-health-case-study`, title: "Rupa Health Case Study", slugTerms: ["Rupa Health"] },
  { url: `${SITE}/case-studies/searchseo-case-study`, title: "SearchSEO Case Study", slugTerms: ["SearchSEO"] },
  { url: `${SITE}/case-studies/sunflower-sober-case-study`, title: "Sunflower Sober Case Study", slugTerms: ["Sunflower Sober"] },
  { url: `${SITE}/case-studies/sunrise-toyota-case-study`, title: "Sunrise Toyota Case Study", slugTerms: ["Sunrise Toyota"] },
  { url: `${SITE}/case-studies/talofa-games`, title: "Talofa Games Case Study", slugTerms: ["Talofa Games"] },
  { url: `${SITE}/case-studies/verinomics`, title: "Verinomics Case Study", slugTerms: ["Verinomics"] },
  { url: `${SITE}/case-studies/wildcard`, title: "Wildcard Case Study", slugTerms: ["Wildcard"] },
  // ── Hire remote workers ──
  { url: `${SITE}/hire-remote-workers`, title: "Hire Remote Workers", slugTerms: ["hire remote workers", "remote workers", "remote hiring"] },
  { url: `${SITE}/hire-remote-workers/philippines`, title: "Hire Remote Workers Philippines", slugTerms: ["hire remote workers Philippines", "Philippines remote workers"] },
  { url: `${SITE}/hire-remote-workers/south-africa`, title: "Hire Remote Workers South Africa", slugTerms: ["hire remote workers South Africa", "South Africa remote"] },
  { url: `${SITE}/hire-remote-workers/latin-america`, title: "Hire Remote Workers Latin America", slugTerms: ["hire remote workers Latin America", "Latin America remote"] },
];

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface PageEntry {
  url: string;
  title: string;
  description: string;
  slugTerms: string[];
  section: string;
}

export interface ExactMatchResult {
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  contextSnippet: string;
  section: string;
}

export interface BlogCTAResult {
  ctaSentence: string;
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  insertAfterParagraph: string;
}

// ─── Slug → searchable terms ─────────────────────────────────────────────────

function slugToTerms(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 2) return []; // skip top-level index pages
    const slug = segments[segments.length - 1];
    if (!slug) return [];

    const parts = slug.split("-");
    const resolvedParts: string[] = [];

    let i = 0;
    while (i < parts.length) {
      // Try 3-part override first (e.g. "chat-gpt-4")
      if (i + 2 < parts.length) {
        const k3 = `${parts[i]}-${parts[i + 1]}-${parts[i + 2]}`;
        if (SEGMENT_OVERRIDES[k3]) { resolvedParts.push(SEGMENT_OVERRIDES[k3]); i += 3; continue; }
      }
      // 2-part override (e.g. "chat-gpt")
      if (i + 1 < parts.length) {
        const k2 = `${parts[i]}-${parts[i + 1]}`;
        if (SEGMENT_OVERRIDES[k2]) { resolvedParts.push(SEGMENT_OVERRIDES[k2]); i += 2; continue; }
      }
      // Single
      const k1 = parts[i];
      resolvedParts.push(SEGMENT_OVERRIDES[k1] ?? (k1.charAt(0).toUpperCase() + k1.slice(1)));
      i++;
    }

    const terms: string[] = [];

    // Full resolved title: "AI Chatbot Developer", "ChatGPT Expert"
    const full = resolvedParts.join(" ");
    terms.push(full);

    // Core terms — strip generic suffix words, e.g. "ChatGPT Expert" → "ChatGPT"
    const core = resolvedParts.filter((p) => !GENERIC_WORDS.has(p.toLowerCase()));
    if (core.length > 0 && core.length < resolvedParts.length) {
      terms.push(core.join(" "));
    }

    // Lowercase raw (for case-insensitive matching of multi-word slugs)
    terms.push(slug.replace(/-/g, " "));

    return [...new Set(terms.filter((t) => t.length >= 2))];
  } catch {
    return [];
  }
}

function getSectionLabel(url: string): string {
  const path = new URL(url).pathname;
  if (path.startsWith("/roles")) return "Role";
  if (path.startsWith("/case-studies")) return "Case Study";
  if (path.startsWith("/playbooks")) return "Playbook";
  if (path.startsWith("/software-assistant")) return "Software";
  if (path.startsWith("/hire-remote")) return "Hire Remote";
  if (path.startsWith("/alternatives")) return "Alternative";
  return "Page";
}

// ─── Sitemap fetching (static XML — works on JS-rendered sites) ──────────────

async function fetchSitemapUrls(subfolder: string): Promise<string[]> {
  const candidates = [
    `${SITE}/sitemap.xml`,
    `${SITE}/sitemap_index.xml`,
    `${SITE}/sitemap-0.xml`,
    `${SITE}/server-sitemap.xml`,
    `${SITE}/sitemap/sitemap-0.xml`,
  ];

  for (const sitemapUrl of candidates) {
    try {
      const res = await axios.get(sitemapUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RochysLinkBot/1.0)", "Accept": "application/xml,text/xml,*/*" },
        maxRedirects: 3,
      });

      const $ = cheerio.load(res.data, { xmlMode: true });
      const allUrls: string[] = [];

      // Handle sitemap index → fetch sub-sitemaps
      const subSitemaps: string[] = [];
      $("sitemap > loc").each((_, el) => { subSitemaps.push($(el).text().trim()); });

      if (subSitemaps.length > 0) {
        const subResults = await Promise.all(
          subSitemaps.map(async (loc) => {
            try {
              const sub = await axios.get(loc, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });
              const $sub = cheerio.load(sub.data, { xmlMode: true });
              const urls: string[] = [];
              $sub("url > loc").each((_, el) => { urls.push($sub(el).text().trim()); });
              return urls;
            } catch { return []; }
          })
        );
        allUrls.push(...subResults.flat());
      } else {
        $("url > loc").each((_, el) => { allUrls.push($(el).text().trim()); });
      }

      const filtered = allUrls.filter((u) => {
        try {
          const path = new URL(u).pathname.replace(/\/$/, "");
          return (
            path.startsWith(subfolder) &&
            path !== subfolder &&
            path.split("/").filter(Boolean).length >= 2
          );
        } catch { return false; }
      });

      if (filtered.length > 0) {
        console.log(`[sitemap] Found ${filtered.length} URLs under ${subfolder} from ${sitemapUrl}`);
        return filtered;
      }
    } catch (e) {
      console.log(`[sitemap] Failed ${sitemapUrl}:`, e instanceof Error ? e.message : e);
    }
  }

  return [];
}

// ─── Build page entries from URLs (slug-derived, no HTML fetch needed) ───────

function buildPageEntries(urls: string[]): PageEntry[] {
  return urls
    .filter((url) => {
      try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts.length >= 2; // must be /subfolder/slug, not just /subfolder
      } catch { return false; }
    })
    .map((url) => {
      const terms = slugToTerms(url);
      return {
        url,
        title: terms[0] || url,
        description: "",
        slugTerms: terms,
        section: getSectionLabel(url),
      };
    });
}

// ─── Merge sitemap results with hardcoded fallback (deduplicated) ─────────────

function mergeWithHardcoded(
  sitemapEntries: PageEntry[],
  subfolder: string
): PageEntry[] {
  const seen = new Set(sitemapEntries.map((e) => e.url.replace(/\/$/, "")));

  const hardcodedForFolder = HARDCODED_PAGES.filter((p) =>
    new URL(p.url).pathname.startsWith(subfolder)
  );

  const extras: PageEntry[] = hardcodedForFolder
    .filter((h) => !seen.has(h.url.replace(/\/$/, "")))
    .map((h) => ({
      url: h.url,
      title: h.title,
      description: "",
      slugTerms: h.slugTerms,
      section: getSectionLabel(h.url),
    }));

  return [...sitemapEntries, ...extras];
}

// ─── Quality filter for exact matches ────────────────────────────────────────

// Single-word matches that are too generic to be useful anchor text
const BLOCKED_SINGLE_WORDS = new Set([
  "data", "sales", "marketing", "support", "manager", "developer", "specialist",
  "writer", "designer", "editor", "analyst", "assistant", "agent", "team",
  "business", "company", "service", "agency", "work", "hire", "staff",
  "remote", "overseas", "outsource", "talent", "candidate", "role", "job",
  "guide", "tool", "platform", "software", "system", "process", "strategy",
  "growth", "content", "email", "video", "web", "digital", "social", "media",
  "brand", "product", "project", "client", "customer", "user", "people",
  "cost", "price", "rate", "time", "task", "work", "help", "need",
]);

// Phrases that are too brand-generic to link (reads as "self-promotion" not helpful anchor)
const BLOCKED_PHRASES = new Set([
  "hire overseas", "hireoverseas", "hire remote", "hire remote workers",
  "overseas team", "offshore team", "outsourcing company",
]);

function isHighQualityAnchor(anchorText: string): boolean {
  const text = anchorText.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/);

  // Block explicit phrases
  if (BLOCKED_PHRASES.has(lower)) return false;

  // Single-word matches: only allow known brands/tools/acronyms
  if (words.length === 1) {
    // Known brand from SEGMENT_OVERRIDES (e.g. "ChatGPT", "Zapier", "HubSpot")
    const isKnownBrand = Object.values(SEGMENT_OVERRIDES).some(
      (v) => v.toLowerCase() === lower
    );
    // Acronym-style (all caps, 2–5 chars): "SEO", "AI", "CRM", "API"
    const isAcronym = /^[A-Z]{2,5}$/.test(text);
    if (!isKnownBrand && !isAcronym) return false;
  }

  // Reject single-word common nouns even if capitalized
  if (words.length === 1 && BLOCKED_SINGLE_WORDS.has(lower)) return false;

  return true;
}

// ─── Exact-match logic ────────────────────────────────────────────────────────

function findExactMatches(blogContent: string, pages: PageEntry[]): ExactMatchResult[] {
  const results: ExactMatchResult[] = [];
  const usedUrls = new Set<string>();
  const usedAnchors = new Set<string>();

  for (const page of pages) {
    if (usedUrls.has(page.url)) continue;

    // Merge hardcoded slugTerms with derived slugTerms
    const hardcoded = HARDCODED_PAGES.find(
      (h) => h.url.replace(/\/$/, "") === page.url.replace(/\/$/, "")
    );
    const allTerms = [
      ...page.slugTerms,
      ...(hardcoded?.slugTerms ?? []),
    ];
    // Sort: longer phrases first (more specific wins)
    const candidates = [...new Set(allTerms)].sort(
      (a, b) => b.split(/\s+/).length - a.split(/\s+/).length
    );

    for (const term of candidates) {
      if (!term || term.length < 2) continue;
      if (usedAnchors.has(term.toLowerCase())) continue;

      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use word boundary; for terms ending/starting with special chars (like "Monday.com"), be lenient
      const boundary = /[a-zA-Z0-9]$/.test(term) ? "\\b" : "";
      const startBoundary = /^[a-zA-Z0-9]/.test(term) ? "\\b" : "";
      const regex = new RegExp(`${startBoundary}${escaped}${boundary}`, "i");
      const match = regex.exec(blogContent);

      if (match) {
        // Quality gate — skip generic single words and brand name matches
        if (!isHighQualityAnchor(match[0])) continue;

        const start = Math.max(0, match.index - 80);
        const end = Math.min(blogContent.length, match.index + term.length + 80);
        const contextSnippet =
          (start > 0 ? "…" : "") +
          blogContent.slice(start, end) +
          (end < blogContent.length ? "…" : "");

        results.push({
          anchorText: match[0],
          targetUrl: page.url,
          targetTitle: page.title,
          contextSnippet,
          section: page.section,
        });

        usedUrls.add(page.url);
        usedAnchors.add(term.toLowerCase());
        break; // one match per page
      }
    }
  }

  return results;
}

// ─── Blog CTA generation (Claude) ────────────────────────────────────────────

function buildBlogPageEntries(urls: string[]): PageEntry[] {
  // Derive titles purely from URL slugs — no HTTP fetch needed.
  // This gets all posts instantly and avoids hammering the server with 150+ requests.
  return urls
    .filter((url) => {
      try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts.length >= 2 && parts[0] === "blogs";
      } catch { return false; }
    })
    .map((url) => {
      const terms = slugToTerms(url);
      // Convert slug to a readable title:
      // e.g. "ai-automation-for-business" → "AI Automation for Business"
      const slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
      const readableTitle = slug
        .split("-")
        .map((word) => {
          if (SEGMENT_OVERRIDES[word]) return SEGMENT_OVERRIDES[word];
          const lowercase = new Set(["for","and","or","the","a","an","in","on","at","to","of","with","by","from","vs"]);
          return lowercase.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");

      return {
        url,
        title: readableTitle || terms[0] || url,
        description: "",
        slugTerms: terms,
        section: "Blog",
      };
    });
}

// ─── Pre-filter blog posts by keyword overlap with blog draft ────────────────

function preFilterBlogPosts(blogContent: string, blogPosts: PageEntry[], maxResults = 40): PageEntry[] {
  // Extract meaningful words from blog (length > 4, not stopwords)
  const stopWords = new Set([
    "about","after","also","been","before","being","between","business","but","can","could",
    "does","even","every","from","have","help","here","into","just","like","make","many",
    "more","most","much","need","only","other","over","same","some","such","than","that",
    "their","them","then","there","these","they","this","those","through","time","under",
    "very","well","were","what","when","where","which","while","will","with","would","your",
  ]);
  const contentWords = new Set(
    blogContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !stopWords.has(w))
  );

  // Score each blog post by how many title words appear in the content
  const scored = blogPosts.map((post) => {
    const titleWords = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
    const overlap = titleWords.filter((w) => contentWords.has(w)).length;
    const score = titleWords.length > 0 ? overlap / titleWords.length : 0;
    return { post, score, overlap };
  });

  // Sort by score descending; keep only posts with at least 1 overlapping word
  return scored
    .filter((s) => s.overlap >= 1)
    .sort((a, b) => b.score - a.score || b.overlap - a.overlap)
    .slice(0, maxResults)
    .map((s) => s.post);
}

async function generateBlogCTAs(blogContent: string, allBlogPosts: PageEntry[]): Promise<BlogCTAResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || allBlogPosts.length === 0) return [];

  const client = new Anthropic({ apiKey });

  // Pre-filter to the most topically relevant posts before sending to Claude
  const relevantPosts = preFilterBlogPosts(blogContent, allBlogPosts, 40);
  if (relevantPosts.length === 0) return [];

  const blogList = relevantPosts
    .map((p, i) => `${i + 1}. Title: "${p.title}"\n   URL: ${p.url}`)
    .join("\n\n");

  // Split the draft into paragraphs so Claude can reason about paragraph-level relevance
  const paragraphs = blogContent
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 60)
    .slice(0, 20) // first 20 paragraphs
    .map((p, i) => `[P${i + 1}] ${p.trim().slice(0, 200)}`)
    .join("\n\n");

  const prompt = `You are an expert SEO content strategist. Your task: suggest internal link CTAs for a blog post.

STRICT RELEVANCE RULE:
A CTA is only valid if the linked blog post is about the SAME specific subtopic as the paragraph it follows.
- A paragraph about "AI chatbot tools" can link to "AI chatbot developer" but NOT to "collaboration tools for remote teams"
- A paragraph about "hiring process" can link to "how to hire a virtual assistant" but NOT to "AI workflow operators"
- If the connection requires more than one logical step to explain, it is too weak — skip it

THE FORMULA for each CTA sentence:
[Context of who needs this] + [what the linked article specifically covers] + [one concrete unique detail — number, timeframe, scenario]

PERFECT EXAMPLES:
- "If you're migrating from spreadsheets, this CRM implementation timeline shows realistic setup hours for teams under 10 people"
- "Once you've shortlisted candidates, this remote interview question bank covers the 12 vetting questions we use to filter the top 5%"
- "If you're already using Zapier for light automation, this breakdown of n8n vs Zapier covers the exact workflow complexity threshold where it makes sense to switch"

BANNED:
- "Click here", "Read more", "Learn about X", "Check out our guide", "Learn how to X"
- CTAs that are a stretch — if it feels forced, omit it entirely

INSTRUCTIONS:
1. Read each paragraph below and identify its specific topic
2. Check the blog list — does ANY post cover that exact subtopic? If not, skip that paragraph
3. For each valid match, write a CTA sentence that reads as a natural next sentence after the paragraph
4. Include "anchorText" = the exact descriptive noun phrase within the CTA to hyperlink (not the full sentence)
5. Return 3–5 CTAs only for paragraphs with a genuinely tight match. Quality over quantity.

BLOG PARAGRAPHS:
---
${paragraphs}
---

AVAILABLE BLOG POSTS (pre-filtered for relevance):
${blogList}

Return ONLY a valid JSON array, no markdown:
[
  {
    "ctaSentence": "full sentence to insert after the paragraph",
    "anchorText": "the specific noun phrase within the sentence to hyperlink",
    "targetUrl": "...",
    "targetTitle": "...",
    "insertAfterParagraph": "first 8-10 words of the paragraph [P#] this follows..."
  }
]`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed: BlogCTAResult[] = JSON.parse(jsonMatch[0]);
    return parsed.filter((item) => item.ctaSentence && item.anchorText && item.targetUrl);
  } catch (e) {
    console.error("[claude] Blog CTA error:", e);
    return [];
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { blogContent } = await req.json();
    if (!blogContent?.trim()) {
      return NextResponse.json({ error: "Blog content is required" }, { status: 400 });
    }

    // 1. Fetch sitemap URLs for all sections in parallel
    const [exactMatchUrlSets, blogUrls] = await Promise.all([
      Promise.all(
        EXACT_MATCH_SUBFOLDERS.map((subfolder) => fetchSitemapUrls(subfolder))
      ),
      fetchSitemapUrls(BLOG_SUBFOLDER),
    ]);

    // 2. Build page entries for exact-match sections, merged with hardcoded fallback
    const exactMatchPages: PageEntry[] = EXACT_MATCH_SUBFOLDERS.flatMap((subfolder, i) => {
      const fromSitemap = buildPageEntries(exactMatchUrlSets[i]);
      return mergeWithHardcoded(fromSitemap, subfolder);
    });

    // 3. Build blog post entries from slugs (all posts, no HTTP fetch)
    const blogPosts = buildBlogPageEntries(blogUrls);

    // 4. Find exact matches
    const exactMatches = findExactMatches(blogContent, exactMatchPages);

    // 5. Generate blog CTAs with Claude
    const blogCTAs = await generateBlogCTAs(blogContent, blogPosts);

    console.log(`[analyze] exact-match pages: ${exactMatchPages.length}, blog posts: ${blogPosts.length}`);
    console.log(`[analyze] exact matches found: ${exactMatches.length}, blog CTAs: ${blogCTAs.length}`);

    return NextResponse.json({
      exactMatches,
      blogCTAs,
      stats: {
        servicePagesFound: exactMatchPages.length,
        blogPostsFound: blogPosts.length,
      },
    });
  } catch (e: unknown) {
    console.error("[analyze] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
