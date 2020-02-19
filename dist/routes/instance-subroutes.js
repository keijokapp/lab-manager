"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _child_process = require("child_process");

var _express = require("express");

var _expressOpenapiMiddleware = require("express-openapi-middleware");

var _common = require("../common");

var _renderLayout = _interopRequireDefault(require("../render-layout"));

var _util = require("../util");

var _config = _interopRequireDefault(require("../config"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
var _default = routes;
/**
 * Populates machine object with state properties
 * @nothrow
 * @param type {string} machine type ('lxd' or 'virtualbox')
 * @param machine {object} instance machine object
 * @param ip {boolean} whether to ask IP-s from VirtualBox
 * @returns {void}
 */

exports.default = _default;

async function machineInfo(type, machine, ip) {
  switch (type) {
    case 'lxd':
      Object.assign(machine, (await (0, _common.lxdMachineInfo)(machine.name)));
      break;

    case 'virtualbox':
      Object.assign(machine, (await (0, _common.virtualboxMachineInfo)(machine.name, ip)));
      break;

    default:
      _common.logger.error('Failed to get machine info', {
        type,
        machine: machine.name,
        e: 'Unknown machine type'
      });

  }
}

routes.use((req, res, next) => {
  if (req.instance && req.instance.imported && !req.instanceImported) {
    const {
      instance
    } = req;
    ('iTee' in _config.default ? (0, _common.iTeeLabinfo)(instance.privateToken) : Promise.resolve(null)).then(labinfo => {
      if (labinfo === null) {
        delete req.instance;
        delete req.instanceToken;
        return (0, _common.deleteInstance)(instance);
      }
    }).then(() => {
      _common.logger.debug('Deleted imported instance', {
        instance: instance._id,
        privateToken: instance.privateToken
      });
    }, e => {
      _common.logger.debug('Failed to delete imported instance', {
        instance: instance._id,
        privateToken: instance.privateToken,
        e: e.message
      });
    }).then(next);
  } else {
    next();
  }
});
routes.get('/', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Instance'],
  summary: 'Fetch instance',
  parameters: [{
    in: 'query',
    name: 'detailed',
    description: 'Request machine details',
    schema: {
      type: 'string'
    }
  }, {
    in: 'query',
    name: 'ip',
    description: 'Request machine IP-s',
    schema: {
      type: 'string'
    }
  }],
  responses: {
    200: {
      description: 'Instance'
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not Found',
            message: 'Instance does not exist'
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  let {
    instance
  } = req;

  if (!instance) {
    res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
    return;
  }

  const privateAccess = req.instanceToken === instance.privateToken;

  if (req.accepts('html') || 'detailed' in req.query) {
    const askIp = req.accepts('html') || 'ip' in req.query;
    await Promise.all(instance.lab.machineOrder.map(id => machineInfo(instance.lab.machines[id].type, instance.machines[id], askIp)));
  }

  if (!privateAccess) {
    const publicInstance = {
      _rev: instance._rev,
      username: instance.username,
      startTime: instance.startTime,
      publicToken: instance.publicToken,
      lab: {}
    };

    if ('assistant' in instance.lab) {
      publicInstance.lab.assistant = {
        url: instance.lab.assistant.url,
        lab: instance.lab.assistant.lab
      };
    }

    if ('assistant' in instance) {
      publicInstance.assistant = {
        userKey: instance.assistant.userKey,
        link: instance.assistant.link
      };
    }

    if ('machines' in instance.lab && 'machineOrder' in instance.lab && 'machines' in instance) {
      publicInstance.lab.machineOrder = instance.lab.machineOrder;
      publicInstance.lab.machines = {};

      for (const i in instance.lab.machines) {
        publicInstance.lab.machines[i] = {
          description: instance.lab.machines[i].description
        };
      }

      publicInstance.machines = {};

      for (const id in instance.machines) {
        publicInstance.machines[id] = {
          uuid: instance.lab.machines[id].enable_remote ? instance.machines[id].uuid : undefined,
          state: instance.lab.machines[id].enable_restart ? instance.machines[id].state : undefined,
          'rdp-port': instance.lab.machines[id].enable_remote ? instance.machines[id]['rdp-port'] : undefined
        };
      }
    }

    if ('gitlab' in instance.lab) {
      publicInstance.lab.gitlab = {
        url: instance.lab.gitlab.url
      };
    }

    if ('gitlab' in instance) {
      publicInstance.gitlab = {
        group: {
          name: instance.gitlab.group.name,
          link: instance.gitlab.group.link
        },
        user: {
          username: instance.gitlab.user.username,
          link: instance.gitlab.user.link,
          password: instance.gitlab.user.password
        }
      };
    }

    instance = publicInstance;
  }

  res.format({
    html() {
      res.send((0, _renderLayout.default)('Lab instance', {
        instance,
        instanceToken: req.instanceToken
      }, '<script src="bundle/instance.js"></script>'));
    },

    json() {
      res.send(instance);
    }

  });
}));
routes.get('/machine/:machine', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Instance'],
  summary: 'Fetch instance machine',
  parameters: [{
    in: 'path',
    name: 'machine',
    description: 'Instance machine ID',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'header',
    name: 'if-match',
    description: 'Instance E-Tag',
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'query',
    name: 'ip',
    description: 'Request machine IP-s',
    schema: {
      type: 'string'
    }
  }],
  responses: {
    200: {
      description: 'Instance machine'
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not Found',
            message: 'Instance machine does not exist'
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
  const {
    instance
  } = req;
  const id = req.params.machine;

  if (!instance) {
    res.status(404).send({
      error: 'Not found',
      message: 'Instance does not exist'
    });
  } else if ('if-match' in req.query && instance._rev !== req.headers['if-match']) {
    res.status(409).send({
      error: 'Conflict',
      message: 'Revision mismatch'
    });
  } else if (!(id in instance.machines) || !(id in instance.lab.machines)) {
    res.status(404).send({
      error: 'Not found',
      message: 'Machine does not exist'
    });
  } else {
    const privateAccess = req.instanceToken === instance.privateToken;
    let machine = instance.machines[id];
    await machineInfo(instance.lab.machines[id].type, machine, req.accepts('html') || 'ip' in req.query);

    if (!('state' in machine)) {
      res.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get machine info'
      });
      return;
    }

    if (!privateAccess) {
      machine = {
        uuid: instance.lab.machines[id].enable_remote ? machine.uuid : undefined,
        state: instance.lab.machines[id].enable_restart ? machine.state : undefined,
        'rdp-port': instance.lab.machines[id].enable_remote ? machine['rdp-port'] : undefined
      };
    }

    machine._rev = instance._rev;
    res.set('etag', instance._rev);
    res.send(machine);
  }
}));
routes.put('/machine/:machine', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Instance'],
  summary: 'Update state of instance machine',
  parameters: [{
    in: 'path',
    name: 'machine',
    description: 'Instance machine ID',
    required: true,
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'header',
    name: 'if-match',
    description: 'Instance E-Tag',
    schema: {
      type: 'string',
      minLength: 1
    }
  }, {
    in: 'query',
    name: 'ip',
    description: 'Request machine IP-s',
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
          type: 'object',
          properties: {
            _rev: {
              type: 'string',
              minLength: 1
            },
            // ignored
            state: {
              type: 'string',
              enum: ['starting', 'running', 'stopping', 'poweroff', 'acpipowerbutton']
            }
          },
          additionalProperties: false
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Instance machine'
    },
    404: {
      content: {
        'application/json': {
          example: {
            error: 'Not Found',
            message: 'Instance machine does not exist'
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
  const {
    instance
  } = req;
  const id = req.params.machine;

  if (!instance) {
    res.status(404).send({
      error: 'Not found',
      message: 'Instance does not exist'
    });
  } else if ('if-match' in req.headers && instance._rev !== req.headers['if-match']) {
    res.status(409).send({
      error: 'Conflict',
      message: 'Revision mismatch'
    });
  } else if (!(id in instance.machines) || !(id in instance.lab.machines)) {
    res.status(404).send({
      error: 'Not found',
      message: 'Machine does not exist'
    });
  } else {
    const privateAccess = req.instanceToken === instance.privateToken;
    let machine = instance.machines[id];

    if (!privateAccess && !instance.lab.machines[id].enable_restart) {
      delete req.body.state; //			delete req.body.networks;
    }

    switch (instance.lab.machines[id].type) {
      case 'lxd':
        if (req.body.state === 'acpipowerbutton') {
          res.status(422).send({
            error: 'Unprocessable Entity',
            message: 'Sending ACPI signals is not supported by containers'
          });
          return;
        }

        Object.assign(machine, (await (0, _common.lxdUpdateMachine)(machine.name, req.body)));
        break;

      case 'virtualbox':
        Object.assign(machine, (await (0, _common.virtualboxUpdateMachine)(machine.name, req.body, req.accepts('html') || 'ip' in req.query)));
        break;
    }

    if (!('state' in machine)) {
      res.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update machine state'
      });
      return;
    }

    if (!privateAccess) {
      machine = {
        uuid: instance.lab.machines[id].enable_remote ? instance.machines[id].uuid : undefined,
        state: instance.lab.machines[id].enable_restart ? instance.machines[id].state : undefined,
        'rdp-port': instance.lab.machines[id].enable_remote ? instance.machines[id]['rdp-port'] : undefined
      };
    }

    machine._rev = instance._rev;
    res.set('etag', instance._rev);
    res.send(machine);
  }
}));

function setHead(info, commit, ref) {
  const length = parseInt(info.slice(0, 4), 16);
  const firstLine = info.slice(0, length);
  const m = /^[a-z0-9]{44} HEAD\0(.*)\n$/.exec(firstLine);

  if (m) {
    const flags = m[1].split(' ').filter(v => !/^symref=HEAD:.*$/.test(v));
    flags.push(`symref=HEAD:${ref}`);
    const newLine = `${commit} HEAD\0${flags.join(' ')}\n`;
    return `${`0000${(newLine.length + 4).toString(16)}`.slice(-4)}${newLine}${info.slice(length)}`;
  }

  return info;
}

routes.get('/repository/:repository/info/refs', (req, res) => {
  const {
    instance
  } = req;
  const id = req.params.repository;

  if (!('repositories' in _config.default)) {
    res.status(501).send('Repositories are not available');
  } else if (req.query.service !== 'git-upload-pack') {
    res.status(403).send('Unauthorized service');
  } else if (!instance) {
    res.status(404).send('Instance does not exist');
  } else if (req.instanceToken !== instance.privateToken) {
    res.status(403).send('Forbidden');
  } else if (!(id in instance.lab.repositories)) {
    res.status(404).send('Repository does not exist');
  } else {
    res.set({
      'content-type': 'application/x-git-upload-pack-advertisement',
      'surrogate-control': 'no-store',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      pragma: 'no-cache',
      expires: '0'
    });
    const repository = instance.lab.repositories[id];
    const repositoryLocation = `${_config.default.repositories}/${repository.name}.git`;
    (0, _child_process.execFile)('git-upload-pack', ['--stateless-rpc', '--advertise-refs', repositoryLocation], (e, stdout) => {
      if (e) {
        _common.logger.error('Failed to execute git-upload-pack service', {
          e: e.message
        });

        res.status(500).send('Internal Server Error');
      } else if ('head' in repository) {
        (0, _child_process.execFile)('git', ['-C', repositoryLocation, 'show-ref', repository.head], (e, ref) => {
          if (e) {
            _common.logger.error('Failed to resolve head', {
              e: e.message
            });

            res.status(500).send('Internal Server Error');
          } else {
            const [commit, name] = ref.trim().split(' ');
            res.write('001e# service=git-upload-pack\n');
            res.write('0000');
            res.end(setHead(stdout, commit, name));
          }
        });
      } else {
        res.write('001e# service=git-upload-pack\n');
        res.write('0000');
        res.end(stdout);
      }
    });
  }
});
routes.use('/repository/:repository', (req, res) => {
  const {
    instance
  } = req;
  const id = req.params.repository;

  if (!instance) {
    res.status(404).send({
      error: 'Not found',
      message: 'Instance does not exist'
    });
  } else if (req.instanceToken !== instance.privateToken) {
    res.status(403).send({
      error: 'Forbidden',
      message: 'Access denied'
    });
  } else if (!(id in instance.lab.repositories)) {
    res.status(404).send({
      error: 'Not found',
      message: 'Repository does not exist'
    });
  } else {
    const repository = instance.lab.repositories[id];
    (0, _common.serveRepository)(req, res, repository.name);
  }
});