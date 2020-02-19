"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _express = _interopRequireDefault(require("express"));

var _browserifyMiddleware = _interopRequireDefault(require("browserify-middleware"));

var _expressWinston = _interopRequireDefault(require("express-winston"));

var _expressBearerToken = _interopRequireDefault(require("express-bearer-token"));

var _expressOpenapiMiddleware = require("express-openapi-middleware");

var _swaggerUiExpress = _interopRequireDefault(require("swagger-ui-express"));

var _config = _interopRequireDefault(require("./config"));

var _common = require("./common");

var _routes = _interopRequireDefault(require("./routes"));

var _iTeeCompat = require("./routes/i-tee-compat");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// eslint-disable-next-line import/no-extraneous-dependencies
const babelify = process.env.NODE_ENV !== 'production' ? require('babelify') : undefined;
const app = (0, _express.default)();
var _default = app;
exports.default = _default;
app.set('json spaces', 2);
app.set('trust proxy', true);
app.use(_common.reqid);

_expressWinston.default.requestWhitelist.push('body');

app.use(_expressWinston.default.logger({
  winstonInstance: _common.logger
}));
const openapi = {
  openapi: '3.0.0',
  servers: [{
    url: _config.default.appUrl
  }],
  tags: [{
    name: 'Lab',
    description: 'Labs'
  }, {
    name: 'Instance',
    description: 'Running labs'
  }, {
    name: 'Machine',
    description: 'VirtualBox machines'
  }, {
    name: 'Repository',
    description: 'Git repositories'
  }, {
    name: 'I-Tee compatibility',
    description: 'Limited I-Tee compatibility API'
  }],
  paths: { ...(0, _expressOpenapiMiddleware.createPaths)(_routes.default),
    ...(0, _expressOpenapiMiddleware.createPaths)(_iTeeCompat.routes)
  }
};
app.use('/docs/api', _swaggerUiExpress.default.serve, _swaggerUiExpress.default.setup(openapi));
const externalModules = ['react', 'react-dom', 'semantic-ui-react', 'table-dragger'];
app.get('/bundle.js', (0, _browserifyMiddleware.default)(externalModules, {
  transform: babelify,
  paths: [`${__dirname}/../node_modules`],
  external: externalModules.concat(['!!../node_modules/css-loader/index.js!./main.css'])
}));
app.use('/bundle', (0, _browserifyMiddleware.default)(`${__dirname}/public`, {
  transform: babelify,
  paths: [`${__dirname}/../node_modules`],
  external: externalModules.concat(['!!../node_modules/css-loader/index.js!./main.css'])
}));
app.use(_express.default.static(`${__dirname}/../public`));
app.use(_express.default.json());
app.use((0, _expressBearerToken.default)());
app.use(_routes.default); // catch 404 and forward to error handler

app.use((req, res, next) => {
  res.status(404).send({
    error: 'Not Found',
    message: 'Page not found'
  });
});
app.use((e, req, res, next) => {
  if (e instanceof Error) {
    if (e.name === 'OpenAPIValidationError') {
      res.status(400).send({
        error: 'Bad Request',
        validations: e.errors
      });
    } else {
      _common.logger.error('Application error ', {
        e: e.message,
        stack: e.stack
      });

      res.status(500).send({
        error: 'Internal Server Error',
        message: 'Something has gone wrong'
      });
    }
  } else {
    _common.logger.error('Unknown application error ', {
      e
    });

    res.status(500).send();
  }
});