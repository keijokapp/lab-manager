"use strict";

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _Labs = _interopRequireDefault(require("../views/Labs"));

var _Lab = _interopRequireDefault(require("../views/Lab"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

if ('labs' in window.INIT_STATE) {
  _reactDom.default.render(_react.default.createElement(_Labs.default, {
    labs: window.INIT_STATE.labs
  }), appContainer);
} else if ('lab' in window.INIT_STATE) {
  _reactDom.default.render(_react.default.createElement(_Lab.default, {
    lab: window.INIT_STATE.lab
  }), appContainer);
}