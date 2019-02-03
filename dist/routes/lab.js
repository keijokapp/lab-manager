"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _express = require("express");

var _jsonschema = require("jsonschema");

var _expressOpenapiMiddleware = require("express-openapi-middleware");

var _util = require("../util");

var _common = require("../common");

var _renderLayout = _interopRequireDefault(require("../render-layout"));

var _createInstance = _interopRequireDefault(require("../create-instance"));

var _instanceSubroutes = _interopRequireDefault(require("./instance-subroutes"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
var _default = routes;
exports.default = _default;
const labSchema = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-]+$'
    },
    _rev: {
      type: 'string'
    },
    machines: {
      type: 'object',
      minItems: 1,
      additionalProperties: {
        type: 'object',
        oneOf: [{
          properties: {
            type: {
              type: 'string',
              enum: ['virtualbox']
            },
            base: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-]+-template$'
            },
            description: {
              type: 'string'
            },
            enable_autostart: {
              type: 'boolean'
            },
            enable_private: {
              type: 'boolean'
            },
            enable_remote: {
              type: 'boolean'
            },
            enable_restart: {
              type: 'boolean'
            },
            networks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['bridged', 'virtualbox']
                  },
                  name: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9-]+$'
                  },
                  ip: {
                    type: 'string',
                    minLength: 1
                  },
                  promiscuous: {
                    type: 'boolean'
                  },
                  resetMac: {
                    type: 'boolean'
                  }
                },
                required: ['type', 'name'],
                additionalProperties: false
              }
            }
          },
          additionalProperties: false,
          required: ['type', 'base', 'description', 'networks']
        }, {
          properties: {
            type: {
              type: 'string',
              enum: ['lxd']
            },
            base: {
              type: 'string',
              pattern: '^[a-zA-Z0-9-]+-template$'
            },
            description: {
              type: 'string'
            },
            enable_autostart: {
              type: 'boolean'
            },
            enable_private: {
              type: 'boolean'
            },
            enable_restart: {
              type: 'boolean'
            },
            networks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9-]+$'
                  }
                },
                required: ['name'],
                additionalProperties: false
              }
            },
            limits: {
              type: 'object',
              properties: {
                cpu: {
                  type: 'integer',
                  min: 1
                },
                cpuAllowance: {
                  type: 'integer',
                  min: 1,
                  max: 99
                },
                memory: {
                  type: 'integer',
                  min: 1
                }
              },
              minProperties: 1
            },
            repositories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9_-]+$'
                  },
                  location: {
                    type: 'string',
                    pattern: '^/.+$'
                  },
                  ref: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9_/-]+$'
                  }
                },
                additionalProperties: false,
                required: ['name', 'location', 'ref']
              },
              minItems: 1
            }
          },
          additionalProperties: false,
          required: ['type', 'base', 'description', 'networks']
        }]
      }
    },
    machineOrder: {
      type: 'array',
      'items': {
        type: 'string',
        minLength: 1
      }
    },
    primaryMachine: {
      type: 'string',
      minLength: 1
    },
    assistant: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          minLength: 1
        },
        key: {
          type: 'string',
          minLength: 1
        },
        lab: {
          type: 'string',
          minLength: 1
        }
      },
      additionalProperties: false
    },
    repositories: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9_-]+$': {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              pattern: '^[a-zA-Z0-9_-]+$'
            },
            head: {
              type: 'string',
              pattern: '^[a-zA-Z0-9_/-]+$'
            }
          },
          required: ['name']
        }
      },
      minItems: 1
    },
    endpoints: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'string',
        minLength: 1
      }
    },
    gitlab: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          minLength: 1
        },
        key: {
          type: 'string',
          minLength: 1
        }
      },
      additionalProperties: false,
      required: ['url', 'key']
    }
  },
  additionalProperties: false,
  dependencies: {
    machines: ['machineOrder'],
    machineOrder: ['machines'],
    primaryMachine: ['machines']
  }
};

function normalizeMachines(lab) {
  if ('machines' in lab) {
    const keyExists = new Array(Object.keys(lab.machines).length);
    const newOrder = [];
    const machineOrder = lab.machineOrder;

    for (const id of machineOrder) {
      if (id in lab.machines) {
        newOrder.push(id);
        keyExists[id] = true;
      }
    }

    for (const id in lab.machines) {
      if (!keyExists[id]) {
        newOrder.push(id);
      }
    }

    if (!(lab.primaryMachine in lab.machines)) {
      delete lab.primaryMachine;
    }
  }
}

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
  tags: ['Lab'],
  summary: 'List labs',
  responses: {
    200: {
      description: 'List of labs',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: labSchema
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  const result = await _common.db.allDocs({
    startkey: 'lab/',
    endkey: 'lab/\uffff',
    include_docs: true
  });
  const labs = result.rows.map(d => {
    d.doc._id = d.doc._id.slice(4);
    return d.doc;
  });
  res.format({
    html: function () {
      res.send((0, _renderLayout.default)('Labs', {
        labs
      }, '<script src="bundle/lab.js"></script>'));
    },
    json: function () {
      res.send(labs);
    }
  });
}));
routes.post('/:lab', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Lab'],
  summary: 'Create lab',
  parameters: [{
    in: 'path',
    name: 'lab',
    description: 'Lab name',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: labSchema
      }
    }
  },
  responses: {
    200: {
      headers: {
        etag: {
          description: 'Lab E-Tag',
          schema: labSchema.properties._rev
        }
      },
      content: {
        'application/json': {
          schema: labSchema
        }
      }
    },
    409: {
      content: {
        'application/json': {
          example: {
            error: 'Conflict',
            message: 'Lab with given id already exists'
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  const lab = { ...req.body,
    _id: 'lab/' + req.params.lab,
    _rev: undefined
  };
  normalizeMachines(lab);

  try {
    const result = await _common.db.post(lab);
    lab._id = result.id.slice(4);
    lab._rev = result.rev;
    res.set('etag', lab._rev);
    res.send(lab);
  } catch (e) {
    if (e.name === 'conflict') {
      res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
    } else {
      throw e;
    }
  }
}));
routes.put('/:lab', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Lab'],
  summary: 'Update lab',
  parameters: [{
    in: 'path',
    name: 'lab',
    description: 'Lab name',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'header',
    name: 'if-match',
    description: 'Lab E-Tag',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: labSchema
      }
    }
  },
  responses: {
    200: {
      headers: {
        etag: {
          description: 'Lab E-Tag',
          schema: labSchema.properties._rev
        }
      },
      content: {
        'application/json': {
          schema: labSchema
        }
      }
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not Found',
            message: 'Lab does not exist'
          }
        }
      }
    },
    409: {
      content: {
        'application/json': {
          example: {
            error: 'Conflict',
            message: 'Revision mismatch'
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  const lab = { ...req.body,
    _id: 'lab/' + req.params.lab,
    _rev: req.headers['if-match']
  };
  normalizeMachines(lab);

  try {
    const result = await _common.db.put(lab);
    lab._id = result.id.slice(4);
    lab._rev = result.rev;
    res.set('etag', lab._rev);
    res.send(lab);
  } catch (e) {
    if (e.name === 'not_found') {
      res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
    } else if (e.name === 'conflict') {
      res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
    } else {
      throw e;
    }
  }
}));
routes.get('/:lab', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Lab'],
  summary: 'Fetch lab',
  parameters: [{
    in: 'path',
    name: 'lab',
    description: 'Lab name',
    required: true,
    schema: labSchema.properties._id
  }],
  responses: {
    200: {
      headers: {
        etag: {
          description: 'Lab E-Tag',
          schema: labSchema.properties._rev
        }
      },
      content: {
        'application/json': {
          schema: labSchema
        }
      }
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not found',
            message: 'Lab does not exist'
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  try {
    const lab = await _common.db.get('lab/' + req.params.lab);
    lab._id = lab._id.slice(4);
    res.set('etag', lab._rev);
    res.format({
      html: function () {
        res.send((0, _renderLayout.default)('Lab', {
          lab
        }, '<script src="bundle/lab.js"></script>'));
      },
      json: function () {
        res.send(lab);
      }
    });
  } catch (e) {
    if (e.name === 'not_found') {
      res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
    } else {
      throw e;
    }
  }
}));
routes.delete('/:lab', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Lab'],
  summary: 'Delete lab',
  parameters: [{
    in: 'path',
    name: 'lab',
    description: 'Lab name',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'header',
    name: 'if-match',
    description: 'Instance E-Tag',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }],
  responses: {
    200: {
      description: 'Lab has been deleted'
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not Found',
            message: 'Lab does not exist'
          }
        }
      }
    },
    409: {
      content: {
        'application/json': {
          example: {
            error: 'Conflict',
            message: 'Revision mismatch'
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  try {
    await _common.db.remove('lab/' + req.params.lab, req.headers['if-match']);
    res.send({// ok
    });
  } catch (e) {
    if (e.name === 'not_found') {
      res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
    } else if (e.name === 'conflict') {
      res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
      throw e;
    }
  }
}));
routes.post('/:lab/instance/:username', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Instance'],
  summary: 'Start lab',
  parameters: [{
    in: 'path',
    name: 'lab',
    description: 'Lab name',
    required: true,
    schema: labSchema.properties._id
  }, {
    in: 'path',
    name: 'username',
    description: 'Username',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'header',
    name: 'if-match',
    description: 'Lab E-Tag',
    schema: labSchema.properties._rev
  }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            lab: labSchema
          },
          additionalProperties: false
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Instance'
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not found',
            message: 'Lab does not exist'
          }
        }
      }
    },
    409: {
      content: {
        'application/json': {
          example: {
            error: 'Conflict',
            message: 'Instance already exists'
          }
        }
      }
    },
    410: {
      content: {
        'application/json': {
          example: {
            error: 'Gone',
            message: 'Requested lab revision is not available'
          }
        }
      }
    },
    412: {
      content: {
        'application/json': {
          example: {
            error: 'Precondition Failed',
            message: 'Requested lab is in invalid state',
            errors: []
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  const username = req.params.username;
  let lab;

  if (req.body instanceof Object && 'lab' in req.body) {
    lab = req.body.lab;
    lab._id = req.params.lab;
    delete lab._rev;
  } else {
    try {
      lab = await _common.db.get('lab/' + req.params.lab);
    } catch (e) {
      if (e.name === 'not_found') {
        res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
      } else {
        throw e;
      }

      return;
    }

    if ('if-match' in req.headers && lab._rev !== req.headers['if-match']) {
      res.status(410).send(req.apiOperation.responses[410].content['application/json'].example);
      return;
    }

    lab._id = lab._id.slice(4);
    const validationResult = (0, _jsonschema.validate)(lab, labSchema);

    if (!validationResult.valid) {
      res.status(410).send({ ...req.apiOperation.responses[410].content['application/json'].example,
        errors: validationResult.errors
      });
      return;
    }
  }

  const instance = await (0, _createInstance.default)({
    _id: 'instance/' + lab._id + ':' + username,
    lab,
    username
  });

  if (typeof instance === 'string') {
    if (instance === 'Instance already exists') {
      res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
    } else {
      res.status(500).send({
        error: 'Internal Server Error',
        message: instance
      });
    }
  } else {
    instance._id = instance._id.slice(9);
    res.send(instance);
  }
}));
routes.use('/:lab/instance/:username', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Instance'],
  parameters: [{
    in: 'path',
    name: 'lab',
    description: 'Lab name',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'path',
    name: 'username',
    description: 'Username',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }]
}), (req, res, next) => {
  _common.db.get('instance/' + req.params.lab + ':' + req.params.username).then(instance => {
    instance._id = instance._id.slice(9);
    req.instance = instance;
    req.instanceToken = instance.privateToken;
    next();
  }, e => {
    if (e.name !== 'not_found') {
      next(e);
    } else {
      next();
    }
  });
});
routes.delete('/:lab/instance/:username', (0, _expressOpenapiMiddleware.apiOperation)({
  summary: 'End lab',
  parameters: [{
    in: 'header',
    name: 'if-match',
    description: 'Instance E-Tag',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }],
  responses: {
    200: {
      description: 'Lab has been ended'
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not found',
            message: 'Instance does not exist'
          }
        }
      }
    },
    409: {
      content: {
        'application/json': {
          example: {
            error: 'Conflict',
            message: 'Revision mismatch'
          }
        }
      }
    }
  }
}), (req, res, next) => {
  if (!('instance' in req)) {
    res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
    return;
  }

  const instance = req.instance;
  instance._rev = req.headers['if-match'];
  (0, _common.deleteInstance)(instance).then(() => {
    res.send({});
  }).catch(e => {
    if (e.name === 'conflict') {
      res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
    } else {
      next(e);
    }
  });
});
routes.use('/:lab/instance/:username', _instanceSubroutes.default);