"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _browserifyMiddleware = require("browserify-middleware");

var _browserifyMiddleware2 = _interopRequireDefault(_browserifyMiddleware);

var _expressWinston = require("express-winston");

var _expressWinston2 = _interopRequireDefault(_expressWinston);

var _expressBearerToken = require("express-bearer-token");

var _expressBearerToken2 = _interopRequireDefault(_expressBearerToken);

var _expressOpenapiMiddleware = require("express-openapi-middleware");

var _swaggerUiExpress = require("swagger-ui-express");

var _swaggerUiExpress2 = _interopRequireDefault(_swaggerUiExpress);

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var _common = require("./common");

var _routes = require("./routes");

var _routes2 = _interopRequireDefault(_routes);

var _iTeeCompat = require("./routes/i-tee-compat");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const babelify = process.env.NODE_ENV !== 'production' ? require('babelify') : undefined;
const app = (0, _express2.default)();
exports.default = app;
app.set('json spaces', 2);
app.set('trust proxy', true);
app.use(_common.reqid);

_expressWinston2.default.requestWhitelist.push('body');

app.use(_expressWinston2.default.logger({
  winstonInstance: _common.logger
}));
const openapi = {
  openapi: '3.0.0',
  servers: [{
    url: _config2.default.appUrl
  }],
  tags: [{
    'name': 'Lab',
    'description': 'Labs'
  }, {
    'name': 'Instance',
    'description': 'Running labs'
  }, {
    'name': 'Machine',
    'description': 'VirtualBox machines'
  }, {
    'name': 'Repository',
    'description': 'Git repositories'
  }, {
    'name': 'I-Tee compatibility',
    'description': 'Limited I-Tee compatibility API'
  }],
  paths: { ...(0, _expressOpenapiMiddleware.createPaths)(_routes2.default),
    ...(0, _expressOpenapiMiddleware.createPaths)(_iTeeCompat.routes)
  }
};
app.use('/docs/api', _swaggerUiExpress2.default.serve, _swaggerUiExpress2.default.setup(openapi));
const externalModules = ['react', 'react-dom', 'semantic-ui-react', 'table-dragger'];
app.get('/bundle.js', (0, _browserifyMiddleware2.default)(externalModules, {
  transform: babelify,
  paths: [__dirname + '/../node_modules'],
  external: externalModules.concat(['!!./../node_modules/css-loader/index.js!./main.css'])
}));
app.use('/bundle', (0, _browserifyMiddleware2.default)(_path2.default.join(__dirname, 'public'), {
  transform: babelify,
  paths: [__dirname + '/../node_modules'],
  external: externalModules.concat(['!!./../node_modules/css-loader/index.js!./main.css'])
}));
app.use(_express2.default.static(_path2.default.join(__dirname, '..', 'public')));
app.use(_express2.default.json());
app.use((0, _expressBearerToken2.default)());
app.use(_routes2.default); // catch 404 and forward to error handler

app.use((req, res, next) => {
  res.status(404).send({
    error: 'Not Found',
    message: 'Page not found'
  });
});
app.use((e, req, res, next) => {
  if (e instanceof Error) {
    if (e.name === 'OpenAPIValidation') {
      res.status(400).send({
        error: 'Bad Request',
        validations: e.validations
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