"use strict";

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _Labs = require("../views/Labs");

var _Labs2 = _interopRequireDefault(_Labs);

var _Lab = require("../views/Lab");

var _Lab2 = _interopRequireDefault(_Lab);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

if ('labs' in window.INIT_STATE) {
  _reactDom2.default.render(_react2.default.createElement(_Labs2.default, {
    labs: window.INIT_STATE.labs
  }), appContainer);
} else if ('lab' in window.INIT_STATE) {
  _reactDom2.default.render(_react2.default.createElement(_Lab2.default, {
    lab: window.INIT_STATE.lab
  }), appContainer);
}