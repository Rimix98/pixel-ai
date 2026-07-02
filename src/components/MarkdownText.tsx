"use client";

import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark-dimmed.css";

function parseLatex(expr: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < expr.length) {
    if (expr[i] === "_" || expr[i] === "^") {
      const sup = expr[i] === "^";
      i++;
      if (i < expr.length && expr[i] === "{") {
        i++;
        let depth = 1;
        const start = i;
        while (i < expr.length && depth > 0) {
          if (expr[i] === "{") depth++;
          if (expr[i] === "}") depth--;
          i++;
        }
        const inner = expr.slice(start, i - 1);
        nodes.push(
          <sub key={key++} className={sup ? "text-[0.7em] align-super" : "text-[0.7em] align-sub"}>
            {parseLatex(inner)}
          </sub>
        );
      } else if (i < expr.length) {
        const ch = expr[i];
        i++;
        nodes.push(
          <sub key={key++} className={sup ? "text-[0.7em] align-super" : "text-[0.7em] align-sub"}>
            {ch}
          </sub>
        );
      }
    } else if (expr[i] === "{") {
      i++;
      let depth = 1;
      const start = i;
      while (i < expr.length && depth > 0) {
        if (expr[i] === "{") depth++;
        if (expr[i] === "}") depth--;
        i++;
      }
      nodes.push(...parseLatex(expr.slice(start, i - 1)));
    } else if (expr.slice(i, i + 6) === "\\cdot ") {
      nodes.push(<span key={key++} className="mx-0.5">{"·"}</span>);
      i += 6;
    } else if (expr.slice(i, i + 5) === "\\cdot") {
      nodes.push(<span key={key++} className="mx-0.5">{"·"}</span>);
      i += 5;
    } else if (expr.slice(i, i + 5) === "\\frac") {
      i += 5;
      const parseGroup = () => {
        if (i < expr.length && expr[i] === "{") {
          i++;
          let depth = 1;
          const start = i;
          while (i < expr.length && depth > 0) {
            if (expr[i] === "{") depth++;
            if (expr[i] === "}") depth--;
            i++;
          }
          return expr.slice(start, i - 1);
        }
        return i < expr.length ? expr[i++] : "";
      };
      const num = parseGroup();
      const den = parseGroup();
      nodes.push(
        <span key={key++} className="inline-flex flex-col items-center mx-0.5 text-[0.85em] leading-tight">
          <span className="border-b border-current px-0.5">{parseLatex(num)}</span>
          <span className="px-0.5">{parseLatex(den)}</span>
        </span>
      );
    } else if (expr.slice(i, i + 4) === "\\sqrt") {
      i += 4;
      let inner = "";
      if (i < expr.length && expr[i] === "{") {
        i++;
        let depth = 1;
        const start = i;
        while (i < expr.length && depth > 0) {
          if (expr[i] === "{") depth++;
          if (expr[i] === "}") depth--;
          i++;
        }
        inner = expr.slice(start, i - 1);
      } else if (i < expr.length) {
        inner = expr[i++];
      }
      nodes.push(
        <span key={key++} className="inline-flex items-start">
          <span className="text-[0.9em]">{"\u221A"}</span>
          <span className="border-t border-current px-0.5">{parseLatex(inner)}</span>
        </span>
      );
    } else {
      nodes.push(expr[i]);
      i++;
    }
  }

  return nodes;
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\$(.+?)\$|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-surface-variant/80 text-sm font-mono">
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="italic font-serif text-[var(--accent)]">
          {parseLatex(match[4])}
        </span>
      );
    } else if (match[5] && match[6]) {
      // Only allow safe protocols in links
      const url = match[6];
      const isSafe = /^(https?:\/\/|mailto:|#)/i.test(url) || url.startsWith("/");
      parts.push(
        <a
          key={key++}
          href={isSafe ? url : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline decoration-[var(--accent)]/30 hover:decoration-[var(--accent)] transition-colors"
        >
          {match[5]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      hljs.highlightElement(codeRef.current);
    }
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = lang || "text";

  return (
    <div className="my-3 rounded-xl overflow-hidden bg-[var(--code-bg)] border border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--code-header)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="capitalize">{displayLang}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Скопировано
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Копировать
              </>
            )}
          </button>
          {displayLang === "python" && (
            <button className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors px-2 py-1 rounded-md hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Запустить
            </button>
          )}
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed m-0 bg-transparent">
        <code ref={codeRef} className={`language-${displayLang}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}

function parseTable(rows: string[]): React.ReactNode {
  if (rows.length < 2) return null;

  const parseCells = (row: string) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

  const headers = parseCells(rows[0]);
  const dataRows = rows.slice(2).map(parseCells);

  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="border border-surface-variant px-3 py-2 text-left font-semibold bg-surface-variant/50"
              >
                {parseInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((cells, ri) => (
            <tr key={ri}>
              {cells.map((c, ci) => (
                <td key={ci} className="border border-surface-variant px-3 py-2">
                  {parseInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      elements.push(<CodeBlock key={key++} lang={lang} code={codeLines.join("\n")} />);
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.match(/^\|?\s*[-:]+/)) {
      const tableRows: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      elements.push(<div key={key++}>{parseTable(tableRows)}</div>);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const Tag = (`h${level}`) as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const sizeClass = level <= 2 ? "text-xl font-bold" : level <= 4 ? "text-lg font-semibold" : "text-base font-medium";
      elements.push(
        <Tag key={key++} className={`${sizeClass} text-on-surface mt-4 mb-2`}>
          {parseInline(headerMatch[2])}
        </Tag>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push(<hr key={key++} className="my-4 border-surface-variant" />);
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+)\.\s+(.+)/);
        if (!m) break;
        items.push(
          <li key={key++} className="ml-4 list-decimal">
            {parseInline(m[2])}
          </li>
        );
        i++;
      }
      elements.push(
        <ol key={key++} className="list-decimal pl-4 space-y-1 my-2">
          {items}
        </ol>
      );
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(
          <li key={key++} className="ml-4 list-disc">
            {parseInline(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc pl-4 space-y-1 my-2">
          {items}
        </ul>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} className="my-1">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}
