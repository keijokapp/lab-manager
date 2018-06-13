'use strict';

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _Repositories = require('../views/Repositories');

var _Repositories2 = _interopRequireDefault(_Repositories);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appContainer = document.querySelector('#app');

_reactDom2.default.render(_react2.default.createElement(_Repositories2.default, { repositories: window.INIT_STATE.repositories }), appContainer);