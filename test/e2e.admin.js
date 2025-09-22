'use strict';

const Stubby = require('../src/main').Stubby;
const fs = require('fs');
const yaml = require('js-yaml');
const clone = require('../src/lib/clone');
const endpointData = yaml.load((fs.readFileSync('test/data/e2e.yaml', 'utf8')).trim());
const assert = require('assert');
const createRequest = require('./helpers/create-request');

describe('End 2 End Admin Test Suite', function () {
  let sut;
  const port = 8889;

  async function stopStubby () {
    if (sut != null) await sut.stop();
  }

  beforeEach(async function () {
    this.context = {
      done: false,
      port: port
    };

    await stopStubby();

    sut = new Stubby();
    await sut.start({ data: endpointData, ui: true });
  });

  afterEach(stopStubby);

  it('should react to /ping', function (done) {
    this.context.url = '/ping';

    createRequest(this.context, function (response) {
      assert.strictEqual(response.data, 'pong');
      return done();
    });
  });

  it('should be able to retreive an endpoint through GET', function (done) {
    const id = 3;
    const endpoint = clone(endpointData[id - 1]);
    endpoint.id = id;
    this.context.url = '/stubbybutbetter/' + id;
    this.context.method = 'get';

    createRequest(this.context, function (response) {
      let prop, value;
      const returned = JSON.parse(response.data);
      const req = endpoint.req;

      for (prop in req) {
        if (!Object.prototype.hasOwnProperty.call(req, prop)) { continue; }

        value = req[prop];
        assert.strictEqual(value, returned.request[prop]);
      }

      done();
    });
  });

  it('should be able to edit an endpoint through PUT', function (done) {
    const self = this;
    const id = 2;
    const endpoint = clone(endpointData[id - 1]);
    this.context.url = '/stubbybutbetter/' + id;
    endpoint.request.url = '/munchkin';
    this.context.method = 'put';
    this.context.post = JSON.stringify(endpoint);

    createRequest(this.context, function () {
      endpoint.id = id;
      self.context.method = 'get';
      self.context.post = null;

      createRequest(self.context, function (response) {
        const returned = JSON.parse(response.data);

        assert.strictEqual(returned.request.url, endpoint.request.url);

        done();
      });
    });
  });

  it('should return traces when UI is enabled', function (done) {
    const self = this;
    // First: hit the stubs server to generate a trace
    const stubCtx = { port: 8882, url: '/basic/get', method: 'get', done: false };
    createRequest(stubCtx, function () {
      // Then: query the admin tracing endpoint
      self.context.url = '/stubbybutbetter/match-traces?limit=10';
      self.context.method = 'get';
      createRequest(self.context, function (response) {
        const items = JSON.parse(response.data || '[]');
        assert(Array.isArray(items));
        assert(items.length >= 1);
        // sanity check minimal shape
        assert(items[0].request && items[0].response);
        done();
      });
    });
  });

  it('should clear traces', function (done) {
    const self = this;
    // Ensure there is at least one trace
    const stubCtx = { port: 8882, url: '/basic/get', method: 'get', done: false };
    createRequest(stubCtx, function () {
      // Clear via admin
      self.context.url = '/stubbybutbetter/match-traces/clear';
      self.context.method = 'post';
      createRequest(self.context, function (response) {
        assert.strictEqual(response.statusCode, 204);
        // Verify empty
        self.context.method = 'get';
        self.context.url = '/stubbybutbetter/match-traces?limit=10';
        createRequest(self.context, function (response2) {
          const items = JSON.parse(response2.data || '[]');
          assert(Array.isArray(items));
          // After clear, ring may still contain earlier items if not reinitialized; our API clears ring
          assert(items.length === 0);
          done();
        });
      });
    });
  });

  it('should be about to create an endpoint through POST', function (done) {
    const self = this;
    const endpoint = {
      request: {
        url: '/posted/endpoint'
      },
      response: {
        status: 200
      }
    };
    this.context.url = '/stubbybutbetter';
    this.context.method = 'post';
    this.context.post = JSON.stringify(endpoint);

    createRequest(this.context, function (response) {
      const id = response.headers.location.replace(/localhost:8889\/([0-9]+)/, '$1');

      assert.strictEqual(response.statusCode, 201);

      self.context = {
        port: port,
        done: false,
        url: '/stubbybutbetter/' + id,
        method: 'get'
      };

      createRequest(self.context, function (response2) {
        const returned = JSON.parse(response2.data);

        assert.strictEqual(returned.request.url, endpoint.request.url);
        done();
      });
    });
  });

  it('should be about to delete an endpoint through DELETE', function (done) {
    const self = this;
    this.context.url = '/stubbybutbetter/2';
    this.context.method = 'delete';

    createRequest(this.context, function (response) {
      assert.strictEqual(response.statusCode, 204);

      self.context = {
        port: port,
        done: false,
        url: '/stubbybutbetter/2',
        method: 'get'
      };

      createRequest(self.context, function (response2) {
        assert.strictEqual(response2.statusCode, 404);
        done();
      });
    });
  });
});
