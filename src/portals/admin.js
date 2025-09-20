'use strict';

const contract = require('../models/contract');
const Portal = require('./portal').Portal;
const ns = require('node-static');
const path = require('path');
const qs = require('querystring');
const { getTraceRing } = require('../lib/tracing-state');
const status = new ns.Server(path.resolve(__dirname, '../../webroot'));
// Support optional /stubbybutbetter prefix for admin API routes (root or numeric id)
// Only accept /stubbybutbetter and /stubbybutbetter/:id for REST endpoints
const urlPattern = /^\/stubbybutbetter(?:\/([1-9][0-9]*))?$/;

function isAdminPath (url) {
  // Suppress logs for internal admin/API paths and favicon fetches
  return /^(\/(admin|stubbybutbetter)(\/|$)|\/favicon\.ico$|\/stubbybutbetter\/favicon\.(ico|svg)$)/.test(url);
}

class Admin extends Portal {
  constructor (endpoints) {
    super();
    this.server = this.server.bind(this);
    this.endpoints = endpoints;
    this.contract = contract;
    this.name = '[admin]';
  }

  goPong (response) {
    this.writeHead(response, 200, {
      'Content-Type': 'text/plain'
    });

    response.end('pong');
  }

  // M4: Trace endpoints
  goGETTraces (request, response) {
    const ring = getTraceRing();
    const q = qs.parse(request.url.replace(/^.*\?(.*)$/, '$1'));
    let limit = parseInt(q.limit, 10);
    if (!limit || limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    const items = ring ? ring.getLast(limit) : [];
    return this.ok(response, items);
  }

  goGETTraceById (id, response) {
    const ring = getTraceRing();
    if (!ring) return this.ok(response, []);
    const item = ring.getById(id);
    if (!item) return this.notFound(response);
    return this.ok(response, item);
  }

  goClearTraces (response) {
    const ring = getTraceRing();
    if (ring) ring.clear();
    return this.noContent(response);
  }

  goPUT (request, response) {
    const id = this.getId(request.url);
    let data = '';

    if (!id) { return this.notSupported(response); }

    request.on('data', function (chunk) { data += chunk; });
    request.on('end', () => { this.processPUT(id, data, response); });
  }

  goPOST (request, response) {
    const id = this.getId(request.url);
    let data = '';

    if (id) { return this.notSupported(response); }

    request.on('data', function (chunk) { data += chunk; });
    request.on('end', () => { this.processPOST(data, response, request); });
  }

  goDELETE (request, response) {
    const id = this.getId(request.url);

    if (id) {
      try {
        this.endpoints.delete(id);
        this.noContent(response);
      } catch { this.notFound(response); }
    } else if (request.url === '/') {
      try {
        this.endpoints.deleteAll();
        this.noContent(response);
      } catch { this.notFound(response); }
    } else {
      this.notSupported(response);
    }
  }

  goGET (request, response) {
    const id = this.getId(request.url);

    if (id) {
      try {
        const endpoint = this.endpoints.retrieve(id);
        this.ok(response, endpoint);
      } catch (err) { this.notFound(response); }
    } else {
      const data = this.endpoints.gather();
      if (data.length === 0) { this.noContent(response); } else { this.ok(response, data); }
    }
  }

  processPUT (id, data, response) {
    try { data = JSON.parse(data); } catch (e) { return this.badRequest(response); }

    const errors = this.contract(data);
    if (errors) { return this.badRequest(response, errors); }

    try {
      this.endpoints.update(id, data);
      this.noContent(response);
    } catch (_) { this.notFound(response); }
  }

  processPOST (data, response, request) {
    try { data = JSON.parse(data); } catch (e) { return this.badRequest(response); }

    const errors = this.contract(data);
    if (errors) { return this.badRequest(response, errors); }

    const endpoint = this.endpoints.create(data);
    this.created(response, request, endpoint.id);
  }

  ok (response, result) {
    this.writeHead(response, 200, {
      'Content-Type': 'application/json'
    });

    if (result != null) { return response.end(JSON.stringify(result)); }
    return response.end();
  }

  created (response, request, id) {
    this.writeHead(response, 201, {
      Location: request.headers.host + '/' + id
    });

    response.end();
  }

  noContent (response) {
    response.statusCode = 204;
    response.end();
  }

  badRequest (response, errors) {
    this.writeHead(response, 400, {
      'Content-Type': 'application/json'
    });

    response.end(JSON.stringify(errors));
  }

  notSupported (response) {
    response.statusCode = 405;
    response.end();
  }

  notFound (response) {
    this.writeHead(response, 404, {
      'Content-Type': 'text/plain'
    });

    response.end();
  }

  saveError (response) {
    this.writeHead(response, 422, {
      'Content-Type': 'text/plain'
    });

    response.end();
  }

  serverError (response) {
    this.writeHead(response, 500, {
      'Content-Type': 'text/plain'
    });

    response.end();
  }

  urlValid (url) {
    return url.match(urlPattern) != null;
  }

  getId (url) {
    const m = url.match(urlPattern);
    return m && m[1] ? m[1] : '';
  }

  server (request, response) {
    const suppressLogs = isAdminPath(request.url);
    if (!suppressLogs) this.received(request, response);

    response.on('finish', () => {
      if (!suppressLogs) this.responded(response.statusCode, request.url);
    });

    if (request.url === '/ping') { return this.goPong(response); }
    // Favicon under both root and /stubbybutbetter
    if (/^\/(stubbybutbetter\/)?favicon\.(ico|svg)$/.test(request.url)) {
      const orig = request.url;
      request.url = '/favicon.svg';
      status.serve(request, response);
      request.url = orig;
      return;
    }
    if (/^\/stubbybutbetter\/(status|js|css|ui)(\/.*)?$/.test(request.url)) {
      const orig = request.url;
      request.url = request.url.replace(/^\/stubbybutbetter/, '');
      status.serve(request, response);
      request.url = orig;
      return;
    }

    // M4: Trace endpoints routing (only under /stubbybutbetter)
    const pathOnly = request.url.replace(/\?.*$/, '');
    if (/^\/stubbybutbetter\/match-traces(\/.*)?$/.test(pathOnly)) {
      switch (request.method.toUpperCase()) {
        case 'GET': {
          if (pathOnly === '/stubbybutbetter/match-traces') { return this.goGETTraces(request, response); }
          const id = decodeURIComponent(pathOnly.replace(/^\/stubbybutbetter\/match-traces\//, ''));
          if (!id || /\//.test(id)) { return this.notFound(response); }
          return this.goGETTraceById(id, response);
        }
        case 'POST':
          if (pathOnly === '/stubbybutbetter/match-traces/clear') { return this.goClearTraces(response); }
          return this.notSupported(response);
        default:
          return this.notSupported(response);
      }
    }

    if (this.urlValid(request.url)) {
      switch (request.method.toUpperCase()) {
        case 'PUT':
          return this.goPUT(request, response);
        case 'POST':
          return this.goPOST(request, response);
        case 'DELETE':
          return this.goDELETE(request, response);
        case 'GET':
          return this.goGET(request, response);
        default:
          return this.notSupported(response);
      }
    } else {
      return this.notFound(response);
    }
  }
}

module.exports.Admin = Admin;
