import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[`*_~[\]()]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 64) || "section"
  );
}

/** Creates a slugger that de-duplicates repeated headings the same way for TOC and renderer. */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

const HEADING_RE = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

function headingText(raw: string): string {
  return raw.replace(/[`*_~]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

/** Extract h1–h3 headings from markdown (h1 renders as h2), skipping fenced code blocks. */
export function extractHeadings(markdown: string): TocHeading[] {
  const slug = createSlugger();
  const out: TocHeading[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = HEADING_RE.exec(line);
    if (!match) continue;
    const text = headingText(match[2] ?? "");
    out.push({ id: slug(text), text, level: (match[1] ?? "").length === 3 ? 3 : 2 });
  }
  return out;
}

export interface DocSubsection {
  id: string;
  title: string;
  body: string;
}

export interface DocSection {
  /** null for content that appears before the first heading. */
  id: string | null;
  title: string | null;
  /** Markdown between the section heading and its first h3. */
  intro: string;
  subsections: DocSubsection[];
}

/**
 * Splits a document into h1/h2 sections, each with h3 subsections. Heading ids are generated in
 * document order with the same slugger as `extractHeadings`, so a table of contents built from
 * that function links to the rendered sections.
 */
export function parseDocSections(markdown: string): DocSection[] {
  const slug = createSlugger();
  const sections: DocSection[] = [];
  let section: DocSection | null = null;
  let sub: DocSubsection | null = null;
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (!text) return;
    if (sub) sub.body = text;
    else {
      section ??= { id: null, title: null, intro: "", subsections: [] };
      if (!sections.includes(section)) sections.push(section);
      section.intro = text;
    }
  };

  for (const line of markdown.split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const match = inFence ? null : HEADING_RE.exec(line);
    if (!match) {
      buffer.push(line);
      continue;
    }
    flush();
    const title = headingText(match[2] ?? "");
    if ((match[1] ?? "").length === 3) {
      if (!section) {
        section = { id: null, title: null, intro: "", subsections: [] };
        sections.push(section);
      }
      sub = { id: slug(title), title, body: "" };
      section.subsections.push(sub);
    } else {
      section = { id: slug(title), title, intro: "", subsections: [] };
      sections.push(section);
      sub = null;
    }
  }
  flush();
  return sections;
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return Children.toArray(node).map(nodeText).join("");
}

const baseComponents: Components = {
  a: ({ href, title, children }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a href={href} title={title} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  // Keep AI-authored h1s from competing with the page title.
  h1: ({ children }) => <h2>{children}</h2>,
};

interface MarkdownProps {
  children: string;
  className?: string;
  size?: "md" | "sm";
  /** Give h1–h3 stable ids (matching extractHeadings) for a table of contents. */
  withAnchors?: boolean;
}

/** Renders AI-authored markdown (GFM + syntax-highlighted code). Raw HTML is not rendered. */
export function Markdown({ children, className, size = "md", withAnchors = false }: MarkdownProps) {
  let components = baseComponents;
  if (withAnchors) {
    const slug = createSlugger();
    components = {
      ...baseComponents,
      h1: ({ children: c }) => <h2 id={slug(nodeText(c))}>{c}</h2>,
      h2: ({ children: c }) => <h2 id={slug(nodeText(c))}>{c}</h2>,
      h3: ({ children: c }) => <h3 id={slug(nodeText(c))}>{c}</h3>,
    };
  }
  return (
    <div className={cn("pp-prose", size === "sm" && "pp-prose-sm", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
