"use strict";

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _Instance = _interopRequireDefault(require("../views/Instance"));

var _Instances = _interopRequireDefault(require("../views/Instances"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

if ('instances' in window.INIT_STATE) {
  _reactDom.default.render(_react.default.createElement(_Instances.default, {
    instances: window.INIT_STATE.instances
  }), appContainer);
} else if ('instance' in window.INIT_STATE) {
  _reactDom.default.render(_react.default.createElement(_Instance.default, {
    instance: window.INIT_STATE.instance
  }), appContainer);
}