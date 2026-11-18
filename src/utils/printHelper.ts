/**
 * Print Helper Utility
 * Converts text/markdown or custom media contents into a clean, print-friendly iframe
 * and triggers the system dialog for rendering.
 */

export const markdownToHtml = (markdown: string): string => {
  let html = markdown;

  // Escape special chars to avoid breaking the DOM (except the markdown symbols)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```js ... ```
  html = html.replace(/```([\s\S]*?)```/gm, (_, p1) => {
    return `<pre><code>${p1.trim()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Headers: # Head, ## Head...
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');

  // Blockquotes: > quote
  html = html.replace(/^&gt; (.*?)$/gm, '<blockquote>$1</blockquote>');

  // Unordered Lists: - item or * item
  html = html.replace(/^(?:-|\*)\s+(.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Ordered lists: 1. item
  html = html.replace(/^\d+\.\s+(.*?)$/gm, '<ol><li>$1</li></ol>');
  html = html.replace(/<\/ol>\s*<ol>/g, '');

  // Paragraphs (lines that don't start with block element tags)
  const lines = html.split('\n');
  const blockTags = ['<h', '<pre', '<li', '<ul', '<ol', '<block', '<table', '<p'];
  html = lines
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const isBlock = blockTags.some(tag => trimmed.startsWith(tag));
      if (isBlock) return line;
      return `<p>${line}</p>`;
    })
    .join('\n');

  return html;
};

interface PrintOptions {
  title: string;
  subtitle?: string;
  content?: string; // Markdown or raw text
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'audio' | null;
  additionalHtml?: string; // Preformatted custom HTML (e.g. for transcription or YouTube details)
}

export const printAIResponse = (options: PrintOptions) => {
  const { title, subtitle, content, mediaUrl, mediaType, additionalHtml } = options;
  
  // Create printing iframe setup
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('id', 'colab-print-iframe');
  
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Failed to access print iframe document context.');
    return;
  }

  // Pre-process markdown text to HTML format if available
  const parsedContentHtml = content ? markdownToHtml(content) : '';

  // Prepare Media element if present
  let mediaElementHtml = '';
  if (mediaUrl) {
    if (mediaType === 'image') {
      mediaElementHtml = `
        <div class="media-container">
          <div class="media-title">產生的圖片 / Generated Image</div>
          <img src="${mediaUrl}" alt="Generated AI Visual" crossorigin="anonymous" />
        </div>
      `;
    } else if (mediaType === 'video') {
      mediaElementHtml = `
        <div class="media-container">
          <div class="media-title">產生的影片 / Generated Video</div>
          <video src="${mediaUrl}" controls></video>
          <div class="media-subtitle">影片連結 / Preview Link: <a href="${mediaUrl}" target="_blank">${mediaUrl}</a></div>
        </div>
      `;
    } else if (mediaType === 'audio') {
      mediaElementHtml = `
        <div class="media-container">
          <div class="media-title">產生的音訊 / Generated Audio</div>
          <audio src="${mediaUrl}" controls></audio>
          <div class="media-subtitle">音軌連結 / Audio Link: <a href="${mediaUrl}" target="_blank">${mediaUrl}</a></div>
        </div>
      `;
    }
  }

  const completeHtmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @media print {
            body {
              background: white !important;
              color: #111827 !important;
              padding: 0px !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            padding: 30px;
            max-width: 800px;
            margin: 0 auto;
            color: #1f2937;
            background-color: white;
          }
          .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .logo-group {
            display: flex;
            flex-direction: column;
          }
          .logo {
            font-size: 1.4rem;
            font-weight: 800;
            color: #2563eb;
            letter-spacing: -0.025em;
          }
          .logo span {
            color: #7c3aed;
          }
          .header-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #374151;
            margin-top: 4px;
          }
          .meta {
            font-size: 0.8rem;
            color: #6b7280;
            text-align: right;
          }
          .top-headline {
            font-size: 1.5rem;
            font-weight: 800;
            color: #111827;
            margin-bottom: 16px;
            line-height: 1.3;
          }
          .subtitle {
            font-size: 1rem;
            font-weight: 500;
            color: #4b5563;
            margin-bottom: 20px;
            padding: 10px 14px;
            background-color: #f3f4f6;
            border-left: 4px solid #6b7280;
            border-radius: 0 4px 4px 0;
          }
          .content {
            font-size: 0.95rem;
            color: #374151;
          }
          /* Markdown elements */
          h1, h2, h3, h4 {
            color: #111827;
            font-weight: 700;
            margin-top: 24px;
            margin-bottom: 10px;
            page-break-after: avoid;
          }
          h1 { font-size: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          h2 { font-size: 1.25rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
          h3 { font-size: 1.1rem; }
          p {
            margin-top: 0;
            margin-bottom: 14px;
            text-align: justify;
          }
          ul, ol {
            margin-top: 0;
            margin-bottom: 14px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 4px;
          }
          pre {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 14px 0;
            page-break-inside: avoid;
          }
          code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
            font-size: 0.85rem;
            background-color: #f1f5f9;
            padding: 2px 4px;
            border-radius: 3px;
            color: #0f172a;
          }
          pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            color: inherit;
          }
          blockquote {
            border-left: 4px solid #cbd5e1;
            padding-left: 12px;
            color: #475569;
            margin: 14px 0;
            font-style: italic;
          }
          
          /* Media layout */
          .media-container {
            margin: 20px 0;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background-color: #f8fafc;
            page-break-inside: avoid;
            text-align: center;
          }
          .media-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
            text-align: left;
          }
          img, video {
            max-width: 100%;
            max-height: 480px;
            object-fit: contain;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            display: inline-block;
          }
          .media-subtitle {
            margin-top: 6px;
            font-size: 0.8rem;
            color: #64748b;
            text-align: left;
            word-break: break-all;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          
          /* Custom styled additional components */
          .youtube-meta {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 14px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 20px;
          }
          .transcription-meta {
            background-color: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 14px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 20px;
          }
          .meta-item {
            font-size: 0.9rem;
            margin-bottom: 4px;
            color: #334155;
          }
          .meta-item strong {
            color: #0f172a;
          }

          /* Footer */
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 0.75rem;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-group">
            <div class="logo">CoLab <span>AI</span> Studio</div>
            <div class="header-title">${title}</div>
          </div>
          <div class="meta">
            列印時間 / Time: ${new Date().toLocaleString()}<br />
            使用者 / Creator: lin6976528@gmail.com
          </div>
        </div>

        <div class="top-headline">${title}</div>
        
        ${subtitle ? `<div class="subtitle"><strong>提示詞 / Prompt Context:</strong> ${subtitle}</div>` : ''}

        ${additionalHtml ? `<div class="additional-block">${additionalHtml}</div>` : ''}

        ${mediaElementHtml}

        ${parsedContentHtml ? `<div class="content">${parsedContentHtml}</div>` : ''}

        <div class="footer">
          <span>由 CoLab AI 生成與輸出設計</span>
          <span>© ${new Date().getFullYear()} CoLab AI. All rights reserved.</span>
        </div>

        <script>
          window.onload = function() {
            // Give a short delay to ensure assets are buffered
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.frameElement.remove();
              }, 1500);
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  doc.open();
  doc.write(completeHtmlBody);
  doc.close();
};
