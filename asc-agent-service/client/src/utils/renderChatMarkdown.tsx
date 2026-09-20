import type { ReactNode } from 'react';

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmed);
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return [];
  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim());
}

function formatInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function renderChatMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="chat-md-hr" />);
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key++} className="chat-md-h3">{formatInline(line.slice(4), `h3-${key}`)}</h3>
      );
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={key++} className="chat-md-h2">{formatInline(line.slice(3), `h2-${key}`)}</h2>
      );
      i += 1;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={key++} className="chat-md-h1">{formatInline(line.slice(2), `h1-${key}`)}</h1>
      );
      i += 1;
      continue;
    }

    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headerCells = parseTableRow(line);
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        bodyRows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push(
        <div key={key++} className="chat-md-table-wrap">
          <table className="chat-md-table">
            <thead>
              <tr>
                {headerCells.map((cell, ci) => (
                  <th key={ci}>{formatInline(cell, `th-${key}-${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{formatInline(cell, `td-${key}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="chat-md-list">
          {items.map((item, ii) => (
            <li key={ii}>{formatInline(item, `li-${key}-${ii}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const paraLines: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="chat-md-p">
        {formatInline(paraLines.join(' '), `p-${key}`)}
      </p>
    );
  }

  return <div className="chat-md">{blocks}</div>;
}
