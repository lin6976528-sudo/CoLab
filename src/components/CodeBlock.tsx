import React, { useState } from 'react';
import hljs from 'highlight.js';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import 'highlight.js/styles/github-dark.css';

interface CodeBlockProps {
  className?: string;
  children: string;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children).trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  if (!lang) {
    // Clean, legible format for inline code
    return (
      <code className="px-1.5 py-0.5 rounded bg-zinc-100/80 dark:bg-zinc-800/85 font-mono text-[13px] font-semibold text-rose-600 dark:text-rose-400 break-all border border-zinc-200/40 dark:border-zinc-700/30">
        {children}
      </code>
    );
  }

  // Highlight the code content
  let highlightedHtml = '';
  try {
    if (lang && hljs.getLanguage(lang)) {
      highlightedHtml = hljs.highlight(String(children).trim(), { language: lang }).value;
    } else {
      highlightedHtml = hljs.highlightAuto(String(children).trim()).value;
    }
  } catch (e) {
    highlightedHtml = String(children).trim();
  }

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-[#0d1117] shadow-lg text-left select-text">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/70 bg-[#161b22] text-xs font-mono font-semibold text-zinc-400 select-none">
        <span className="uppercase tracking-wider flex items-center gap-1.5 text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          {lang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-450 hover:text-white hover:bg-zinc-800/90 transition-all cursor-pointer"
          title={t('common.copy', '複製代碼')}
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400 stroke-[3]" />
              <span className="text-[11px] text-emerald-400 font-bold font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span className="text-[11px] font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto scrollbar-thin">
        <pre className="m-0 leading-relaxed font-mono text-[13.5px] select-text">
          <code 
            className={`hljs language-${lang} select-text`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
}
