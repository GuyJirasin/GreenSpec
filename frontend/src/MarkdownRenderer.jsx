import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { parseMarkdownBlocks, parseInlineMarkdown } from './markdown-parser.mjs';

/**
 * Renders inline markdown tokens (bold, italic, code, link, etc.) into React elements.
 */
function renderInline(text) {
  if (!text) return null;
  const tokens = parseInlineMarkdown(text);

  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'code':
        return <code key={idx} className="copilot-inline-code">{token.value}</code>;
      case 'bold_italic':
        return <strong key={idx}><em>{token.value}</em></strong>;
      case 'bold':
        return <strong key={idx}>{token.value}</strong>;
      case 'italic':
        return <em key={idx}>{token.value}</em>;
      case 'strikethrough':
        return <del key={idx}>{token.value}</del>;
      case 'link':
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="copilot-link"
          >
            {token.text}
          </a>
        );
      case 'br':
        return <br key={idx} />;
      case 'text':
      default:
        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
    }
  });
}

/**
 * Fenced code block component with syntax language badge and copy-to-clipboard button.
 */
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore copy errors
    }
  };

  return (
    <div className="copilot-code-container">
      <div className="copilot-code-header">
        <span className="copilot-code-lang">{lang || 'text'}</span>
        <button
          type="button"
          className="copilot-code-copy-btn"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="copy-icon-success" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="copilot-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * GFM Markdown Table component with horizontal overflow and aligned columns.
 */
function TableBlock({ headers, aligns, rows }) {
  return (
    <div className="copilot-table-wrapper">
      <table className="copilot-table">
        {headers && headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  style={{ textAlign: aligns[idx] || 'left' }}
                >
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  style={{ textAlign: aligns[cIdx] || 'left' }}
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * GreenSpec Civil AI Copilot Markdown Renderer
 * Parses block elements (headers, lists, tables, code blocks, quotes) and inline tokens.
 */
export default function MarkdownRenderer({ content, role = 'assistant' }) {
  if (!content) return null;

  // For user messages, simple inline text rendering with pre-wrap
  if (role === 'user') {
    return <div className="copilot-user-text">{content}</div>;
  }

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="greenspec-copilot-markdown">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'code_block':
            return <CodeBlock key={idx} lang={block.lang} code={block.code} />;

          case 'heading': {
            if (block.level === 1) {
              return <h4 key={idx} className="copilot-heading h1">{renderInline(block.text)}</h4>;
            }
            if (block.level === 2) {
              return <h4 key={idx} className="copilot-heading h2">{renderInline(block.text)}</h4>;
            }
            if (block.level === 3) {
              return <h5 key={idx} className="copilot-heading h3">{renderInline(block.text)}</h5>;
            }
            return <h6 key={idx} className="copilot-heading h4">{renderInline(block.text)}</h6>;
          }

          case 'table':
            return (
              <TableBlock
                key={idx}
                headers={block.headers}
                aligns={block.aligns}
                rows={block.rows}
              />
            );

          case 'blockquote':
            return (
              <blockquote key={idx} className="copilot-blockquote">
                {renderInline(block.text)}
              </blockquote>
            );

          case 'list': {
            if (block.ordered) {
              return (
                <ol key={idx} className="copilot-ol">
                  {block.items.map((item, itemIdx) => (
                    <li key={itemIdx}>{renderInline(item)}</li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={idx} className="copilot-ul">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          }

          case 'hr':
            return <hr key={idx} className="copilot-hr" />;

          case 'paragraph':
          default:
            return (
              <p key={idx} className="copilot-p">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
