"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _express = require("express");

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

var _iTeeCompat = require("./i-tee-compat");

var _iTeeCompat2 = _interopRequireDefault(_iTeeCompat);

var _lab = require("./lab");

var _lab2 = _interopRequireDefault(_lab);

var _instance = require("./instance");

var _instance2 = _interopRequireDefault(_instance);

var _machine = require("./machine");

var _machine2 = _interopRequireDefault(_machine);

var _repository = require("./repository");

var _repository2 = _interopRequireDefault(_repository);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
exports.default = routes;
routes.use(_iTeeCompat2.default);
routes.use('/lab', _lab2.default);
routes.use('/instance', _instance2.default);
routes.use('/machine', _machine2.default);
routes.use('/repository', _repository2.default);
routes.get('/', (req, res) => {
  res.redirect(_config2.default.appUrl + '/lab');
});