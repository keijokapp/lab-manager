"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SecretKey = exports.TimeSince = void 0;

var _react = _interopRequireDefault(require("react"));

var _semanticUiReact = require("semantic-ui-react");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function timeSince(date) {
  const seconds = Math.round((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  let reminder = seconds % 31536000;

  if (interval >= 1) {
    return Math.floor(interval) + ' years ' + Math.round(reminder / 86400) + ' months';
  }

  interval = seconds / 2592000;
  reminder = seconds % 2592000;

  if (interval >= 1) {
    return Math.floor(interval) + ' months ' + Math.round(reminder / 86400) + ' days';
  }

  interval = seconds / 86400;
  reminder = seconds % 86400;

  if (interval >= 1) {
    return Math.floor(interval) + ' days ' + Math.round(reminder / 3600) + ' hours';
  }

  interval = seconds / 3600;
  reminder = seconds % 3600;

  if (interval >= 1) {
    return Math.floor(interval) + ' hours ' + Math.round(reminder / 60) + ' minutes';
  }

  interval = seconds / 60;
  reminder = seconds % 60;

  if (interval >= 1) {
    return Math.floor(interval) + ' minutes ' + reminder + ' seconds';
  }

  return seconds + ' seconds';
}

class TimeSince extends _react.default.Component {
  render() {
    const t = timeSince(this.props.date);
    setTimeout(() => {
      this.forceUpdate();
    }, 6000);
    return t;
  }

}

exports.TimeSince = TimeSince;

class SecretKey extends _react.default.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    const c = { ...this.props
    };
    delete c.as;
    delete c.children;

    const child = _react.default.createElement('as' in this.props ? this.props.as : 'span', c, this.state.visible ? this.props.children : 'XXX');

    return _react.default.createElement("span", null, child, " ", _react.default.createElement(_semanticUiReact.Icon, {
      name: this.state.visible ? 'eye slash' : 'eye',
      onClick: () => {
        this.setState({
          visible: !this.state.visible
        });
      },
      link: true
    }));
  }

}

exports.SecretKey = SecretKey;