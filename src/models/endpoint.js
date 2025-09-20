'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const q = require('querystring');
const out = require('../console/out');

class Endpoint {
  constructor (endpoint, datadir, caseSensitiveHeaders) {
    if (endpoint == null) { endpoint = {}; }
    if (datadir == null) { datadir = process.cwd(); }

    Object.defineProperty(this, 'datadir', { value: datadir });

    // Preserve source metadata if provided by YAML loader
    if (endpoint.__source) { this.source = endpoint.__source; }
    if (endpoint.__sourceOrder !== undefined) { this.sourceOrder = endpoint.__sourceOrder; }

    this.request = purifyRequest(endpoint.request);
    this.response = purifyResponse(this, endpoint.response, caseSensitiveHeaders);
    this.hits = 0;
  }

  matches (request, traceRec) {
    let file, json, upperMethods;
    const matches = {};

    function record (field, expected, actual, ok, reason) {
      if (!traceRec || !traceRec.checks) return;
      traceRec.checks.push({ field, expected, actual, matched: !!ok, reason });
    }

    // URL
    matches.url = matchRegex(this.request.url, request.url);
    record('url', String(this.request.url), String(request.url), !!matches.url, matches.url ? undefined : 'regex_miss');
    if (!matches.url) { return null; }

    // Headers
    matches.headers = compareHashMaps(this.request.headers, request.headers, traceRec, 'headers');
    if (!matches.headers) { return null; }

    // Query
    matches.query = compareHashMaps(this.request.query, request.query, traceRec, 'query');
    if (!matches.query) { return null; }

    // Post / JSON / Form
    file = null;
    if (this.request.file != null) {
      try {
        file = fs.readFileSync(path.resolve(this.datadir, this.request.file), 'utf8');
      } catch (e) { /* ignored */ }
    }

    const post = file || this.request.post;
    if (post && request.post) {
      const actualPost = normalizeEOL(request.post);
      matches.post = matchRegex(normalizeEOL(post), actualPost);
      record('post', String(post), actualPost, !!matches.post, matches.post ? undefined : 'regex_miss');
      if (!matches.post) { return null; }
    } else if (this.request.json && request.post) {
      try {
        json = JSON.parse(request.post);
        const ok = compareObjects(this.request.json, json);
        record('json', JSON.stringify(this.request.json), '[parsed JSON]', ok, ok ? undefined : 'json_mismatch');
        if (!ok) { return null; }
      } catch (e) {
        record('json', JSON.stringify(this.request.json), '[unparseable JSON]', false, 'json_parse_error');
        return null;
      }
    } else if (this.request.form && request.post) {
      const decoded = q.decode(request.post);
      matches.post = compareHashMaps(this.request.form, decoded, traceRec, 'form');
      if (!matches.post) { return null; }
    }

    // Method
    if (this.request.method instanceof Array) {
      upperMethods = this.request.method.map(function (it) { return it.toUpperCase(); });
      const ok = upperMethods.indexOf(request.method) !== -1;
      record('method', this.request.method.join(','), request.method, ok, ok ? undefined : 'value_mismatch');
      if (!ok) { return null; }
    } else {
      const ok = this.request.method.toUpperCase() === request.method;
      record('method', this.request.method, request.method, ok, ok ? undefined : 'value_mismatch');
      if (!ok) { return null; }
    }

    return matches;
  }
}

function record (me, urlToRecord) {
  const recording = {};
  const parsed = new URL(urlToRecord);
  const options = {
    method: me.request.method == null ? 'GET' : me.request.method,
    hostname: parsed.hostname,
    headers: me.request.headers,
    port: parsed.port,
    path: parsed.pathname + '?'
  };

  if (parsed.query != null) {
    options.path += parsed.query + '&';
  }
  if (me.request.query != null) {
    options.path += q.stringify(me.request.query);
  }

  const recorder = http.request(options, function (res) {
    recording.status = res.statusCode;
    recording.headers = res.headers;
    recording.body = '';
    res.on('data', function (chunk) { recording.body += chunk; });
    res.on('end', function () { out.notice('recorded ' + urlToRecord); });
  });

  recorder.on('error', function (e) { out.warn('error recording response ' + urlToRecord + ': ' + e.message); });
  recording.post = me.request.post == null ? Buffer.alloc(0) : Buffer.from(me.request.post, 'utf8');

  if (me.request.file != null) {
    try {
      recording.post = fs.readFileSync(path.resolve(me.datadir, me.request.file));
    } catch (e) { /* ignored */ }
  }

  recorder.write(recording.post);
  recorder.end();

  return recording;
}

function normalizeEOL (string) {
  return string.replace(/\r\n/g, '\n').replace(/\s*$/, '');
}

function purifyRequest (incoming) {
  let outgoing;

  if (incoming == null) { incoming = {}; }

  outgoing = {
    url: incoming.url,
    method: incoming.method == null ? 'GET' : incoming.method,
    headers: purifyHeaders(incoming.headers),
    query: incoming.query,
    file: incoming.file,
    post: incoming.post,
    form: incoming.form
  };

  if (incoming.json) {
    outgoing.json = JSON.parse(incoming.json);
  }

  outgoing.headers = purifyAuthorization(outgoing.headers);
  outgoing = pruneUndefined(outgoing);
  return outgoing;
}

function purifyResponse (me, incoming, caseSensitiveHeaders) {
  const outgoing = [];

  if (incoming == null) { incoming = []; }
  if (!(incoming instanceof Array)) { incoming = [incoming]; }
  if (incoming.length === 0) { incoming.push({}); }

  incoming.forEach(function (response) {
    if (typeof response === 'string') {
      outgoing.push(record(me, response));
    } else {
      outgoing.push(pruneUndefined({
        headers: purifyHeaders(response.headers, caseSensitiveHeaders),
        status: parseInt(response.status, 10) || 200,
        latency: parseInt(response.latency, 10) || null,
        file: response.file,
        body: purifyBody(response.body)
      }));
    }
  });

  return outgoing;
}

function purifyHeaders (incoming, caseSensitiveHeaders) {
  let prop;
  const outgoing = {};

  for (prop in incoming) {
    if (Object.prototype.hasOwnProperty.call(incoming, prop)) {
      if (caseSensitiveHeaders) {
        outgoing[prop] = incoming[prop];
      } else {
        outgoing[prop.toLowerCase()] = incoming[prop];
      }
    }
  }

  return outgoing;
}

function purifyAuthorization (headers) {
  let userpass;

  if (headers == null || headers.authorization == null) { return headers; }

  const auth = headers.authorization || '';

  if (/^Basic .+:.+$/.test(auth)) {
    userpass = auth.substr(6);
    headers.authorization = 'Basic ' + Buffer.from(userpass).toString('base64');
  }

  return headers;
}

function purifyBody (body) {
  if (body == null) { body = ''; }

  if (typeof body === 'object') {
    return JSON.stringify(body);
  }

  return body;
}

function pruneUndefined (incoming) {
  let key, value;
  const outgoing = {};

  for (key in incoming) {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) { continue; }

    value = incoming[key];
    if (value != null) { outgoing[key] = value; }
  }

  return outgoing;
}

function compareHashMaps (configured, incoming, traceRec, category) {
  let key;
  const headers = {};
  if (configured == null) { configured = {}; }
  if (incoming == null) { incoming = {}; }

  for (key in configured) {
    if (!Object.prototype.hasOwnProperty.call(configured, key)) { continue; }
    const ok = matchRegex(configured[key], incoming[key]);
    headers[key] = ok;
    if (traceRec && traceRec.checks) {
      const fieldName = (category ? category + '.' : '') + key;
      const expected = String(configured[key]);
      const actual = incoming[key] == null ? '' : String(incoming[key]);
      traceRec.checks.push({ field: fieldName, expected, actual, matched: !!ok, reason: ok ? undefined : 'regex_miss' });
    }
    if (!headers[key]) { return null; }
  }

  return headers;
}

function compareObjects (configured, incoming) {
  let key;

  for (key in configured) {
    if (typeof configured[key] !== typeof incoming[key]) { return false; }

    if (typeof configured[key] === 'object') {
      if (!compareObjects(configured[key], incoming[key])) { return false; }
    } else if (configured[key] !== incoming[key]) { return false; }
  }

  return true;
}

function matchRegex (compileMe, testMe) {
  if (testMe == null) { testMe = ''; }
  return String(testMe).match(RegExp(compileMe, 'm'));
}

module.exports = Endpoint;
