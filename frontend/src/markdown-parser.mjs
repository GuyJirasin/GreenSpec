/**
 * GreenSpec Civil AI Copilot - Lightweight, High-Fidelity Markdown Parser
 * Zero external dependencies, pure ESM, safe for Node test runner and Vite/React.
 */

/**
 * Parses raw markdown text into block-level elements.
 * @param {string} rawText 
 * @returns {Array<object>} Array of block tokens
 */
export function parseMarkdownBlocks(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced Code Block (```lang)
    const codeFenceMatch = line.match(/^```([a-zA-Z0-9_-]*)\s*$/);
    if (codeFenceMatch) {
      const lang = codeFenceMatch[1]?.toLowerCase() || 'text';
      const codeLines = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (/^```\s*$/.test(lines[i])) {
          closed = true;
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code_block',
        lang,
        code: codeLines.join('\n'),
        closed
      });
      continue;
    }

    // 2. Horizontal Rule (--- or *** or ___)
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 3. Headings (# Heading)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim()
      });
      i++;
      continue;
    }

    // 4. Blockquotes (> Quote)
    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join('\n')
      });
      continue;
    }

    // 5. Tables (GFM Table: | Header 1 | Header 2 |)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const parseCells = (rowStr) => {
        let trimmed = rowStr.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
        return trimmed.split('|').map(c => c.trim());
      };

      const headers = parseCells(line);
      const sepRow = parseCells(lines[i + 1]);
      const aligns = sepRow.map(col => {
        const left = col.startsWith(':');
        const right = col.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
      });

      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseCells(lines[i]));
        i++;
      }

      blocks.push({
        type: 'table',
        headers,
        aligns,
        rows
      });
      continue;
    }

    // 6. Unordered List (- item or * item or + item)
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*+]\s+/, '').trim();
        items.push(itemText);
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items
      });
      continue;
    }

    // 7. Ordered List (1. item)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, '').trim();
        items.push(itemText);
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items
      });
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 8. Normal Paragraph
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^(#{1,6})\s+/) &&
      !lines[i].match(/^>\s?/) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1]))
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paraLines.join('\n')
      });
    }
  }

  return blocks;
}

/**
 * Sanitizes URLs to prevent javascript: or data: XSS attacks.
 * @param {string} url 
 * @returns {string} Safe URL or '#'
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (/^(https?:|\/|#|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return '#';
}

/**
 * Parses inline formatting: bold, italic, inline code, links, strikethrough.
 * Returns an array of token objects.
 * @param {string} text 
 * @returns {Array<object>}
 */
export function parseInlineMarkdown(text) {
  if (!text) return [];

  const tokens = [];
  // Tokenize regex pattern
  // Matches:
  // 1. Inline code: `code`
  // 2. Bold italic: ***text*** or ___text___
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  // 5. Strikethrough: ~~text~~
  // 6. Link: [label](url)
  // 7. Linebreak: \n
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[([^\]]+)\]\(([^)]+)\)|\n)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text preceding match
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, match.index)
      });
    }

    const matchedStr = match[0];

    if (matchedStr === '\n') {
      tokens.push({ type: 'br' });
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      tokens.push({
        type: 'code',
        value: matchedStr.slice(1, -1)
      });
    } else if (matchedStr.startsWith('***') && matchedStr.endsWith('***')) {
      tokens.push({
        type: 'bold_italic',
        value: matchedStr.slice(3, -3)
      });
    } else if (matchedStr.startsWith('___') && matchedStr.endsWith('___')) {
      tokens.push({
        type: 'bold_italic',
        value: matchedStr.slice(3, -3)
      });
    } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      tokens.push({
        type: 'bold',
        value: matchedStr.slice(2, -2)
      });
    } else if (matchedStr.startsWith('__') && matchedStr.endsWith('__')) {
      tokens.push({
        type: 'bold',
        value: matchedStr.slice(2, -2)
      });
    } else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
      tokens.push({
        type: 'strikethrough',
        value: matchedStr.slice(2, -2)
      });
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      tokens.push({
        type: 'italic',
        value: matchedStr.slice(1, -1)
      });
    } else if (matchedStr.startsWith('_') && matchedStr.endsWith('_')) {
      tokens.push({
        type: 'italic',
        value: matchedStr.slice(1, -1)
      });
    } else if (match[2] && match[3]) {
      // Link [text](url)
      tokens.push({
        type: 'link',
        text: match[2],
        href: sanitizeUrl(match[3])
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(lastIndex)
    });
  }

  return tokens;
}
