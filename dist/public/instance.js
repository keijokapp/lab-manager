"use strict";

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _Instance = require("../views/Instance");

var _Instance2 = _interopRequireDefault(_Instance);

var _Instances = require("../views/Instances");

var _Instances2 = _interopRequireDefault(_Instances);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

if ('instances' in window.INIT_STATE) {
  _reactDom2.default.render(_react2.default.createElement(_Instances2.default, {
    instances: window.INIT_STATE.instances
  }), appContainer);
} else if ('instance' in window.INIT_STATE) {
  _reactDom2.default.render(_react2.default.createElement(_Instance2.default, {
    instance: window.INIT_STATE.instance
  }), appContainer);
}