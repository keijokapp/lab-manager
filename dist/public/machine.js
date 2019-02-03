"use strict";

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _Machines = _interopRequireDefault(require("../views/Machines"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

_reactDom.default.render(_react.default.createElement(_Machines.default, {
  machines: window.INIT_STATE.machines,
  activeTab: window.INIT_STATE.activeTab
}), appContainer);