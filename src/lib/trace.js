'use strict';

// Simple unique ID generator: ISO timestamp + counter
let __traceCounter = 0;
function createTraceId () {
  __traceCounter = (__traceCounter + 1) % 1000000;
  return new Date().toISOString() + '_' + __traceCounter;
}

class TraceRing {
  constructor (cap) {
    this.cap = Math.max(1, parseInt(cap, 10) || 10);
    this.buf = new Array(this.cap);
    this.next = 0;
    this.filled = false;
    this.indexById = new Map();
  }

  push (trace) {
    const idx = this.next;
    const old = this.buf[idx];
    if (old && old.id) { this.indexById.delete(old.id); }

    this.buf[idx] = trace;
    this.indexById.set(trace.id, idx);

    this.next = (this.next + 1) % this.cap;
    if (this.next === 0) this.filled = true;
  }

  clear () {
    this.buf = new Array(this.cap);
    this.indexById.clear();
    this.next = 0;
    this.filled = false;
  }

  getLast (n) {
    const size = this.filled ? this.cap : this.next;
    const count = Math.min(Math.max(0, parseInt(n, 10) || 0), size) || size;
    const out = [];
    for (let i = 0; i < count; i++) {
      const idx = (this.next - 1 - i + this.cap) % this.cap;
      out.push(this.buf[idx]);
    }
    return out.reverse();
  }

  getById (id) {
    const idx = this.indexById.get(id);
    if (idx == null) return null;
    return this.buf[idx] || null;
  }
}

module.exports = {
  TraceRing,
  createTraceId
};
