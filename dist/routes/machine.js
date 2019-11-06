"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _express = require("express");

var _expressOpenapiMiddleware = require("express-openapi-middleware");

var _common = require("../common");

var _renderLayout = require("../render-layout");

var _renderLayout2 = _interopRequireDefault(_renderLayout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
exports.default = routes;
routes.use((req, res, next) => {
  if ((0, _common.authorize)(req.token)) {
    next();
  } else {
    res.status(403).send({
      error: 'Permission Denied',
      message: 'Client is not authorized'
    });
  }
});
routes.get('/', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Machine'],
  summary: 'List virtual machines',
  parameters: [{
    in: 'query',
    name: 'templates',
    description: 'Fetch templates only',
    schema: {
      type: 'string'
    }
  }, {
    in: 'query',
    name: 'running',
    description: 'Fetch running machines only',
    schema: {
      type: 'string'
    }
  }, {
    in: 'query',
    name: 'detailed',
    description: 'Ask for machine details',
    schema: {
      type: 'string'
    }
  }, {
    in: 'query',
    name: 'ip',
    description: 'Ask for machine IP-s',
    schema: {
      type: 'string'
    }
  }],
  responses: {
    200: {
      description: 'List of machines'
    }
  }
}), (req, res, next) => {
  const activeTab = 'templates' in req.query ? 1 : 'running' in req.query ? 2 : 0;

  function getMachines(html) {
    const params = [];

    if ('running' in req.query) {
      params.push('running');
    }

    if ('templates' in req.query) {
      params.push('filter=' + encodeURIComponent('-template$'));
    }

    if ('detailed' in req.query || html) {
      params.push('detailed');
    }

    if ('ip' in req.query || html) {
      params.push('ip');
    }

    return (0, _common.virtualboxRequest)('/machine?' + params.join('&')).then(response => {
      if (!response.ok) {
        return response.text().then(body => {
          _common.logger.error('Failed to request machines', {
            body
          });

          res.status(response.status).send(body);
          return Promise.reject(new Error('Failed to request machines'));
        });
      } else {
        return response.json();
      }
    });
  }

  let title;

  if ('running' in req.query && 'templates' in req.query) {
    title = 'Running templates';
  } else if ('templates' in req.query) {
    title = 'Templates';
  } else if ('running' in req.query) {
    title = 'Running machines';
  } else {
    title = 'Virtual machines';
  }

  res.format({
    html: function () {
      getMachines(true).then(body => {
        res.send((0, _renderLayout2.default)(title, {
          machines: body,
          activeTab
        }, '<script src="bundle/machine.js"></script>'));
      }).catch(next);
    },
    json: function () {
      getMachines().then(body => {
        res.send(body);
      }).catch(next);
    }
  });
});
routes.get('/:machine', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Machine'],
  summary: 'Fetch virtual machine',
  parameters: [{
    in: 'path',
    name: 'machine',
    description: 'Machine name',
    required: false,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'query',
    name: 'ip',
    description: 'Ask for machine IP-s',
    schema: {
      type: 'string'
    }
  }],
  responses: {
    200: {
      description: 'Machine'
    },
    404: {
      description: 'Machine does not exist'
    }
  }
}), (req, res, next) => {
  (0, _common.virtualboxRequest)('/machine/' + encodeURIComponent(req.params.machine) + ('ip' in req.query ? '?ip' : '')).then(response => {
    if (response.ok) {
      return response.json().then(body => {
        res.status(response.status).send(body);
      });
    } else {
      return response.text().then(body => {
        res.status(response.status).send(body);
      });
    }
  }).catch(next);
});
routes.put('/:machine', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Machine'],
  summary: 'Update state of virtual machine',
  parameters: [{
    in: 'path',
    name: 'machine',
    description: 'Machine name',
    required: false,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'query',
    name: 'ip',
    description: 'Ask for machine IP-s',
    schema: {
      type: 'string'
    }
  }],
  requestBody: {
    description: 'Machine state',
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object'
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Machine'
    },
    404: {
      description: 'Machine does not exist'
    }
  }
}), (req, res, next) => {
  (0, _common.virtualboxRequest)('/machine/' + encodeURIComponent(req.params.machine) + ('ip' in req.query ? '?ip' : ''), {
    method: 'PUT',
    body: req.body
  }).then(response => {
    if (response.ok) {
      return response.json().then(body => {
        res.status(response.status).send(body);
      });
    } else {
      return response.text().then(body => {
        res.status(response.status).send(body);
      });
    }
  }).catch(next);
});
routes.post('/:machine/snapshot/:snapshot', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Machine'],
  summary: 'Update state of virtual machine',
  parameters: [{
    in: 'path',
    name: 'machine',
    description: 'Machine name',
    required: false,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'path',
    name: 'snapshot',
    description: 'Snapshot name',
    schema: {
      type: 'string',
      minLength: 1
    }
  }],
  responses: {
    200: {
      description: 'Snapshot has been created'
    }
  }
}), (req, res, next) => {
  (0, _common.virtualboxRequest)('/machine/' + encodeURIComponent(req.params.machine) + '/snapshot/' + encodeURIComponent(req.params.snapshot), {
    method: 'POST'
  }).then(response => {
    if (response.ok) {
      return response.json().then(body => {
        res.status(response.status).send(body);
      });
    } else {
      return response.text().then(body => {
        res.status(response.status).send(body);
      });
    }
  }).catch(next);
});