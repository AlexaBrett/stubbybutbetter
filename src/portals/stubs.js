'use strict';

const Portal = require('./portal').Portal;
const qs = require('querystring');
const { getTraceConfig, getTraceRing } = require('../lib/tracing-state');
const { createTraceId } = require('../lib/trace');

function isAdminPath (url) {
  // Treat internal admin/API paths as non-stub routes
  return /^\/(admin|stubbybutbetter)(\/|$)/.test(url);
}

class Stubs extends Portal {
  constructor (endpoints) {
    super();
    this.server = this.server.bind(this);
    this.Endpoints = endpoints;
    this.name = '[stubs]';
  }

  server (request, response) {
    let data = null;

    request.on('data', function (chunk) {
      data = data != null ? data : '';
      data += chunk;

      return data;
    });

    request.on('end', () => {
      const fullUrl = request.url;
      const pathOnly = fullUrl.replace(/(.*)\?.*/, '$1');

      // Do not log or match any /admin/* or /stubbybutbetter/* paths on the stubs portal
      if (isAdminPath(pathOnly)) {
        this.writeHead(response, 404, {});
        response.end();
        return;
      }

      this.received(request, response);

      const parsedQuery = qs.parse(fullUrl.replace(/^.*\?(.*)$/, '$1'));

      const criteria = {
        url: pathOnly,
        method: request.method,
        post: data,
        headers: request.headers,
        query: parsedQuery
      };

      const { enabled, bodyMaxBytes } = getTraceConfig();
      const ring = getTraceRing();
      let trace = null;
      if (enabled) {
        const bodyText = typeof data === 'string' ? data.slice(0, bodyMaxBytes) : null;
        const bodyTruncated = typeof data === 'string' ? data.length > bodyMaxBytes : false;
        trace = {
          id: createTraceId(),
          timestamp: new Date().toISOString(),
          request: {
            method: request.method,
            url: fullUrl,
            path: pathOnly,
            query: parsedQuery,
            headers: request.headers,
            bodyText: bodyText,
            bodyTruncated: bodyTruncated
          },
          candidates: [],
          selected: null,
          response: null,
          timing: { receivedAt: Date.now(), matchedAt: null, respondedAt: null }
        };
      }

      const traceCtx = enabled ? { candidates: [] } : null;

      try {
        const endpointResponse = this.Endpoints.find(criteria, traceCtx);
        if (enabled) {
          trace.candidates = traceCtx.candidates;
          trace.timing.matchedAt = Date.now();
          const rid = endpointResponse.headers ? endpointResponse.headers['x-stubby-resource-id'] : null;
          trace.selected = rid ? { id: rid, sourceOrder: (traceCtx.candidates.find(c => String(c.id) === String(rid)) || {}).sourceOrder } : null;
          trace.response = {
            status: endpointResponse.status,
            headers: endpointResponse.headers,
            latencyMs: endpointResponse.latency || 0,
            bodySummary: endpointResponse.body ? ('length=' + endpointResponse.body.length) : 'empty'
          };
        }
        const finalize = () => {
          this.writeHead(response, endpointResponse.status, endpointResponse.headers);
          response.write(endpointResponse.body);
          this.responded(endpointResponse.status, request.url);
          if (enabled) {
            trace.timing.respondedAt = Date.now();
            ring.push(trace);
          }
          response.end();
        };
        if (parseInt(endpointResponse.latency, 10)) setTimeout(finalize, endpointResponse.latency);
        else finalize();
      } catch (e) {
        this.writeHead(response, 404, {});
        this.responded(404, request.url, 'is not a registered endpoint');
        if (enabled) {
          trace.candidates = traceCtx ? traceCtx.candidates : [];
          trace.timing.matchedAt = Date.now();
          trace.selected = null;
          trace.response = { status: 404, headers: {}, bodySummary: 'empty', latencyMs: 0 };
          trace.timing.respondedAt = Date.now();
          ring.push(trace);
        }
        response.end();
      }
    });
  }
}

module.exports.Stubs = Stubs;
