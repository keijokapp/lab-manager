"use strict";

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _Repositories = _interopRequireDefault(require("../views/Repositories"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

_reactDom.default.render(_react.default.createElement(_Repositories.default, {
  repositories: window.INIT_STATE.repositories
}), appContainer);