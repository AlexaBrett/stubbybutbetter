'use strict';

const fs = require('fs');
const { parseDocument, LineCounter } = require('yaml');

function parseTextWithSource (text, file) {
  // Ensure string
  const src = String(text);
  const lineCounter = new LineCounter();
  const doc = parseDocument(src, { keepCstNodes: true, lineCounter });

  const root = doc.toJSON();

  // Helper to convert offset to 1-based line numbers
  const toLine = (offset) => {
    try {
      const pos = lineCounter.linePos(offset);
      return pos.line;
    } catch (e) {
      return null;
    }
  };

  if (doc.contents && doc.contents.type === 'SEQ') {
    // Top-level sequence: annotate each item
    const items = doc.contents.items || [];
    const result = (root || []).map((value, idx) => {
      const node = items[idx];
      const range = node && node.range ? node.range : null; // [start, end]
      const annotated = (value && typeof value === 'object') ? value : { value };
      annotated.__source = {
        file,
        lineStart: range ? toLine(range[0]) : null,
        lineEnd: range ? toLine(range[1]) : null
      };
      annotated.__sourceOrder = idx;
      return annotated;
    });
    return result;
  } else if (doc.contents && (doc.contents.type === 'MAP' || doc.contents.type === 'BLOCK_MAP' || doc.contents.type === 'FLOW_MAP')) {
    // Single mapping (single endpoint)
    const node = doc.contents;
    const range = node && node.range ? node.range : null;
    const annotated = (root && typeof root === 'object') ? root : { value: root };
    annotated.__source = {
      file,
      lineStart: range ? toLine(range[0]) : null,
      lineEnd: range ? toLine(range[1]) : null
    };
    annotated.__sourceOrder = 0;
    return annotated;
  } else {
    // Fallback for scalars or unexpected shapes
    return root;
  }
}

function loadFileWithSource (file) {
  const text = fs.readFileSync(file, 'utf8');
  return parseTextWithSource(text, file);
}

module.exports = {
  parseTextWithSource,
  loadFileWithSource
};
