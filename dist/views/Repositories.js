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
    const {
      name,
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: 'fetch'
    });
    fetch(`repository/${encodeURIComponent(name)}/fetch`, {
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
    const {
      name,
      loading
    } = this.state;

    if (!force && loading) {
      return;
    }

    this.setState({
      loading: 'reload'
    });
    fetch(`repository/${encodeURIComponent(name)}`).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          this.setState({
            refs: body.refs,
            loading: null
          });
        });
      }

      this.setState({
        loading: null
      });
    }).catch(e => {
      this.setState({
        loading: null
      });
    });
  }

  render() {
    const {
      name,
      link,
      showMore,
      refs,
      loading
    } = this.state;
    const commits = {};

    for (const ref in refs) {
      const commit = refs[ref];

      if (commit in commits) {
        commits[commit].push(ref);
      } else {
        commits[commit] = [ref];
      }
    }

    const refNodes = [];
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
      }, commit.slice(0, 8)), names);

      if (commits[commit].includes('master')) {
        refNodes.splice(0, 0, el);
        hasMaster = true;
      } else if (commits[commit].includes('dev')) {
        refNodes.splice(hasMaster ? 1 : 0, 0, el);
      } else {
        refNodes.push(el);
      }
    }

    return _react.default.createElement(_semanticUiReact.Table.Row, {
      verticalAlign: "top"
    }, _react.default.createElement(_semanticUiReact.Table.Cell, null, name), _react.default.createElement(_semanticUiReact.Table.Cell, null, showMore ? refNodes : refNodes.slice(0, 3), refNodes.length > 3 && _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Button, {
      style: {
        boxShadow: 'none',
        background: 'none',
        color: '#4183c4'
      },
      onClick: () => {
        this.setState({
          showMore: !showMore
        });
      }
    }, showMore ? 'Show less' : `${refNodes.length - 3} more`))), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, link, _react.default.createElement(_semanticUiReact.Icon, {
      name: "clipboard outline",
      style: {
        cursor: 'pointer',
        margin: '0 0 0 1em'
      },
      onClick: () => (0, _copyToClipboard.default)(link)
    }))), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      color: "violet",
      loading: loading === 'fetch',
      disabled: !!loading,
      onClick: () => this.fetch()
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "download"
    }), ' Fetch')), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      loading: loading === 'reload',
      disabled: !!loading,
      onClick: () => this.reload()
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "sync alternate"
    }))));
  }

}

var _default = ({
  repositories
}) => {
  return _react.default.createElement(_semanticUiReact.Grid, null, _react.default.createElement(_semanticUiReact.Grid.Column, null, _react.default.createElement(_semanticUiReact.Header, {
    size: "large",
    color: "teal"
  }, "Repositories"), _react.default.createElement(_semanticUiReact.Table, {
    selectable: true
  }, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Refs"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Clone URL"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement(_semanticUiReact.Table.Body, null, repositories.map(repository => _react.default.createElement(Repository, {
    key: repository._id,
    name: repository._id,
    refs: repository.refs,
    link: repository.link
  }))))));
};

exports.default = _default;