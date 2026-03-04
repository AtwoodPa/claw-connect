import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import markdown from 'highlight.js/lib/languages/markdown';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('xml', xml);

export function renderMarkdown(
  content: string,
  options?: { highlight?: boolean }
): string {
  if (!content) return '';
  if (options?.highlight === false) {
    return marked.parse(content, { async: false }) as string;
  }
  marked.use({
    renderer: {
      code(code: string, language?: string) {
        const validLang =
          language && hljs.getLanguage(language) ? language : 'plaintext';
        const highlighted = hljs.highlight(code, { language: validLang }).value;
        return `
<div class="code-block-wrapper">
  <div class="code-header">
    <span class="code-lang">${validLang}</span>
    <button class="code-copy-btn" data-code="${encodeURIComponent(code)}">Copy</button>
  </div>
  <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
</div>`;
      },
    },
  });
  return marked.parse(content, { async: false }) as string;
}
