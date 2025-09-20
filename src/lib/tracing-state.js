'use strict';

const { TraceRing } = require('./trace');

let enabled = false;
let bodyMaxBytes = 65536;
let ring = null;

function setTraceConfig (cfg) {
  enabled = !!cfg.enabled;
  bodyMaxBytes = parseInt(cfg.bodyMaxBytes, 10) || 65536;
  const size = parseInt(cfg.bufferSize, 10) || 10;
  ring = new TraceRing(size);
}

function getTraceConfig () {
  return { enabled, bodyMaxBytes };
}

function getTraceRing () {
  return ring;
}

module.exports = {
  setTraceConfig: setTraceConfig,
  getTraceConfig: getTraceConfig,
  getTraceRing: getTraceRing
};
