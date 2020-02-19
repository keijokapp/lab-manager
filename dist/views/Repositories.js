"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _semanticUiReact = require("semantic-ui-react");

var _copyToClipboard = _interopRequireDefault(require("copy-to-clipboard"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Repository extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      name: props.name,
      refs: props.refs,
      link: props.link,
      showMore: false
    };
  }

  fetch() {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: 'fetch'
    });
    fetch('repository/' + encodeURIComponent(this.state.name) + '/fetch', {
      method: 'POST'
    }).then(response => {
      if (response.ok) {
        this.reload(true);
      } else {
        this.setState({
          loading: null
        });
      }
    }).catch(e => {
      this.setState({
        loading: null
      });
    });
  }

  reload(force) {
    if (!force && this.state.loading) {
      return;
    }

    this.setState({
      loading: 'reload'
    });
    fetch('repository/' + encodeURIComponent(this.state.name)).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          this.setState({
            refs: body.refs,
            loading: null
          });
        });
      } else {
        this.setState({
          loading: null
        });
      }
    }).catch(e => {
      this.setState({
        loading: null
      });
    });
  }

  render() {
    const commits = {};

    for (const ref in this.state.refs) {
      const commit = this.state.refs[ref];

      if (commit in commits) {
        commits[commit].push(ref);
      } else {
        commits[commit] = [ref];
      }
    }

    const refs = [];
    let hasMaster = false;

    for (const commit in commits) {
      const names = commits[commit].map(name => _react.default.createElement(_semanticUiReact.Label, {
        key: name,
        color: name === 'master' ? 'green' : name === 'dev' ? 'yellow' : name.endsWith('-dev') ? 'orange' : undefined,
        tag: true
      }, name));

      const el = _react.default.createElement("div", {
        key: commit
      }, _react.default.createElement(_semanticUiReact.Label, {
        basic: true
      }, commit.slice(0, 8)), " ", names);

      if (commits[commit].includes('master')) {
        refs.splice(0, 0, el);
        hasMaster = true;
      } else if (commits[commit].includes('dev')) {
        refs.splice(hasMaster ? 1 : 0, 0, el);
      } else {
        refs.push(el);
      }
    }

    const showMore = refs.length > 3 ? _react.default.createElement("div", null, _react.default.createElement("a", {
      href: "javascript:void(0)",
      onClick: () => {
        this.setState({
          showMore: !this.state.showMore
        });
      }
    }, this.state.showMore ? 'Show less' : refs.length - 3 + ' more')) : undefined;
    return _react.default.createElement(_semanticUiReact.Table.Row, {
      verticalAlign: "top"
    }, _react.default.createElement(_semanticUiReact.Table.Cell, null, this.state.name), _react.default.createElement(_semanticUiReact.Table.Cell, null, this.state.showMore ? refs : refs.slice(0, 3), showMore), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, this.state.link, " ", _react.default.createElement(_semanticUiReact.Icon, {
      name: "clipboard outline",
      style: {
        cursor: 'pointer',
        padding: '0 0 0 01em'
      },
      onClick: () => (0, _copyToClipboard.default)(this.state.link)
    }))), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      color: "violet",
      loading: this.state.loading === 'fetch',
      disabled: !!this.state.loading,
      onClick: () => this.fetch()
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "download"
    }), " Fetch")), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      loading: this.state.loading === 'reload',
      disabled: !!this.state.loading,
      onClick: () => this.reload()
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "sync alternate"
    }))));
  }

}

var _default = props => {
  const repositories = props.repositories.map(repository => _react.default.createElement(Repository, {
    key: repository._id,
    name: repository._id,
    refs: repository.refs,
    link: repository.link
  }));
  return _react.default.createElement(_semanticUiReact.Grid, null, _react.default.createElement(_semanticUiReact.Grid.Column, null, _react.default.createElement(_semanticUiReact.Header, {
    size: "large",
    color: "teal"
  }, "Repositories"), _react.default.createElement(_semanticUiReact.Table, {
    selectable: true
  }, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Refs"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Clone URL"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement(_semanticUiReact.Table.Body, null, repositories))));
};

exports.default = _default;