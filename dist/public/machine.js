"use strict";

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _Machines = require("../views/Machines");

var _Machines2 = _interopRequireDefault(_Machines);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

_reactDom2.default.render(_react2.default.createElement(_Machines2.default, {
  machines: window.INIT_STATE.machines,
  activeTab: window.INIT_STATE.activeTab
}), appContainer);