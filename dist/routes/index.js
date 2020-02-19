"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _express = require("express");

var _config = _interopRequireDefault(require("../config"));

var _iTeeCompat = _interopRequireDefault(require("./i-tee-compat"));

var _lab = _interopRequireDefault(require("./lab"));

var _instance = _interopRequireDefault(require("./instance"));

var _machine = _interopRequireDefault(require("./machine"));

var _repository = _interopRequireDefault(require("./repository"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
var _default = routes;
exports.default = _default;
routes.use(_iTeeCompat.default);
routes.use('/lab', _lab.default);
routes.use('/instance', _instance.default);
routes.use('/machine', _machine.default);
routes.use('/repository', _repository.default);
routes.get('/', (req, res) => {
  res.redirect(`${_config.default.appUrl}/lab`);
});