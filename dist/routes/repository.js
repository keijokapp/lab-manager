"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = require("fs");

var _child_process = require("child_process");

var _express = _interopRequireDefault(require("express"));

var _expressOpenapiMiddleware = require("express-openapi-middleware");

var _config = _interopRequireDefault(require("../config"));

var _common = require("../common");

var _renderLayout = _interopRequireDefault(require("../render-layout"));

var _util = require("../util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.default.Router();
var _default = routes;
/**
 * Reads refs of give repository
 * @nothrow
 * @param repository {string} repository name (not path)
 * @returns {string[]} commit & ref name pairs or null on error
 */

exports.default = _default;

async function getRepositoryRefs(repository) {
  try {
    return new Promise(resolve => {
      (0, _child_process.execFile)('git', ['-C', `${_config.default.repositories}/${repository}.git`, 'show-ref'], (e, stdout) => {
        if (e) {
          _common.logger.error('Failed to read refs of repository', {
            repository,
            e: e.message
          });

          resolve(null);
        } else {
          const refs = {};
          const lines = stdout.split('\n');

          for (const line of lines) {
            const [commit, name] = line.split(' ');

            if (commit && name) {
              if (name.startsWith('refs/heads/')) {
                refs[name.slice(11)] = commit;
              }
            }
          }

          resolve(refs);
        }
      });
    });
  } catch (e) {
    _common.logger.error('Failed to read refs of repository', {
      repository,
      e: e.message
    });
  }

  return null;
}
/**
 * Fetches remote refs of repository
 * @nothrow
 * @param repository {string} repository name (not path)
 * @returns {boolean} true on success, false on error
 */


async function fetchRepository(repository) {
  try {
    return new Promise(resolve => {
      (0, _child_process.execFile)('git', ['-C', `${_config.default.repositories}/${repository}.git`, 'fetch', '-a', '--prune'], e => {
        if (e) {
          _common.logger.error('Failed to fetch remote refs', {
            repository,
            e: e.message
          });

          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch (e) {
    _common.logger.error('Failed to fetch remote refs', {
      repository,
      e: e.message
    });
  }

  return false;
}

const repositorySchema = {
  type: 'object',
  properties: {
    _id: {
      description: 'Name',
      type: 'string',
      minLength: 1
    },
    link: {
      description: 'Clone URL',
      type: 'string',
      minLength: 1
    },
    refs: {
      description: 'Ref/commit map',
      type: 'object'
    }
  }
};
routes.get('/', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Repository'],
  summary: 'List repositories',
  responses: {
    200: {
      description: 'List of repositories',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: repositorySchema
          }
        }
      }
    },
    501: {
      content: {
        'application/json': {
          example: {
            error: 'Not Implemented',
            message: 'Repositories are not available'
          }
        }
      }
    }
  }
}), (0, _util.asyncMiddleware)(async (req, res) => {
  if (!(0, _common.authorize)(req.token)) {
    res.status(403).send({
      error: 'Permission Denied',
      message: 'Client is not authorized'
    });
    return;
  }

  if (!('repositories' in _config.default)) {
    res.status(501).send(req.apiOperation.responses[501].content['application/json'].example);
    return;
  }

  let failed = false;
  const repositories = await new Promise((resolve, reject) => {
    (0, _fs.readdir)(_config.default.repositories, (e, files) => {
      if (e) {
        reject(e);
      } else {
        const promises = [];

        for (const file of files) {
          if (file.endsWith('.git')) {
            const repository = file.slice(0, -4); // eslint-disable-next-line no-loop-func

            promises.push(getRepositoryRefs(repository).then(refs => {
              if (refs === null) {
                failed = true;
              } else {
                return {
                  _id: repository,
                  refs,
                  link: `${_config.default.appUrl}/repository/${repository}.git`
                };
              }
            }));
          }
        }

        Promise.all(promises).then(resolve);
      }
    });
  });

  if (failed) {
    res.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get refs'
    });
    return;
  }

  res.format({
    html() {
      res.send((0, _renderLayout.default)('Repositories', {
        repositories
      }, '<script src="bundle/repository.js"></script>'));
    },

    json() {
      res.send(repositories);
    }

  });
}));
routes.get('/:repository', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Repository'],
  summary: 'Get repository',
  parameters: [{
    in: 'path',
    name: 'repository',
    description: 'Repository name',
    required: true,
    schema: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]+$'
    }
  }],
  responses: {
    200: {
      description: 'Repository',
      content: {
        'application/json': {
          schema: repositorySchema
        }
      }
    },
    501: {
      content: {
        'application/json': {
          example: {
            error: 'Not Implemented',
            message: 'Repositories are not available'
          }
        }
      }
    }
  }
}), (req, res) => {
  if (!(0, _common.authorize)(req.token)) {
    res.status(403).send({
      error: 'Permission Denied',
      message: 'Client is not authorized'
    });
  } else if (!('repositories' in _config.default)) {
    res.status(501).send({
      error: 'Not Implemented',
      message: 'Repositories are not available'
    });
  } else {
    getRepositoryRefs(req.params.repository).then(refs => {
      if (refs === null) {
        res.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to read refs of repository'
        });
      } else {
        res.send({
          _id: req.params.repository,
          refs
        });
      }
    });
  }
});
routes.post('/:repository/fetch', (0, _expressOpenapiMiddleware.apiOperation)({
  tags: ['Repository'],
  summary: 'Fetch repository from remotes',
  parameters: [{
    in: 'path',
    name: 'repository',
    description: 'Repository name',
    required: true,
    schema: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]+$'
    }
  }],
  responses: {
    200: {
      description: 'Repository has been fetched'
    },
    501: {
      content: {
        'application/json': {
          example: {
            error: 'Not Implemented',
            message: 'Repositories are not available'
          }
        }
      }
    }
  }
}), (req, res) => {
  // No authorization
  if (!('repositories' in _config.default)) {
    res.status(501).send({
      error: 'Not Implemented',
      message: 'Repositories are not available'
    });
  } else {
    fetchRepository(req.params.repository).then(result => {
      if (!result) {
        res.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch remote refs'
        });
      } else {
        res.send({});
      }
    });
  }
});
routes.use('/:repository', (req, res, next) => {
  if (!(0, _common.authorize)(req.token)) {
    res.status(403).send({
      error: 'Permission Denied',
      message: 'Client is not authorized'
    });
  } else if (/^[a-zA-Z0-9-_]+\.git$/.exec(req.params.repository)) {
    (0, _common.serveRepository)(req, res, req.params.repository.slice(0, -4));
  } else {
    next();
  }
});