"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _semanticUiReact = require("semantic-ui-react");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class LabRow extends _react.default.Component {
  constructor() {
    super();
    this.state = {
      loading: false
    };
  }

  deleteLab() {
    const {
      lab
    } = this.props;
    const {
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: 'delete'
    });
    fetch(`lab/${encodeURIComponent(lab._id)}`, {
      method: 'DELETE',
      headers: {
        'if-match': lab._rev
      }
    }).then(response => {
      if (response.ok) {
        window.location.reload();
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

  cloneLab(cloneName) {
    const {
      lab
    } = this.props;
    const {
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: 'clone'
    });
    fetch(`lab/${encodeURIComponent(cloneName)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(lab)
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          window.location.href = `lab/${encodeURIComponent(body._id)}`;
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

  startLab(username) {
    const {
      lab
    } = this.props;
    const {
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: 'start'
    });
    const resourceUrl = `lab/${encodeURIComponent(lab._id)}/instance/${encodeURIComponent(username)}`;
    fetch(resourceUrl, {
      method: 'POST',
      headers: {
        'if-match': lab._rev
      }
    }).then(response => {
      if (response.ok) {
        window.location.href = resourceUrl;
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
    const {
      lab
    } = this.props;
    const {
      loading
    } = this.state;
    const repositories = 'repositories' in lab && Object.keys(lab.repositories).map(id => _react.default.createElement("p", {
      key: id
    }, `${id} (${lab.repositories[id].name}${lab.repositories[id].head ? `/${lab.repositories[id].head}` : ''})`));
    return _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, null, lab._id), _react.default.createElement(_semanticUiReact.Table.Cell, null, 'assistant' in lab ? lab.assistant.url : _react.default.createElement("i", null, "None")), _react.default.createElement(_semanticUiReact.Table.Cell, null, 'machineOrder' in lab ? lab.machineOrder.map(id => _react.default.createElement("p", {
      key: id
    }, `${lab.machines[id].base} (${lab.machines[id].description})`)) : _react.default.createElement("i", null, "None")), _react.default.createElement(_semanticUiReact.Table.Cell, {
      singleLine: true
    }, repositories.length ? repositories : _react.default.createElement("i", null, "None")), _react.default.createElement(_semanticUiReact.Table.Cell, {
      singleLine: true
    }, 'endpoints' in lab ? lab.endpoints.map(name => _react.default.createElement("p", {
      key: name
    }, name)) : _react.default.createElement("i", null, "None")), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement("a", {
      href: `lab/${encodeURIComponent(lab._id)}`
    }, "Details")), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      hideOnScroll: true,
      trigger: _react.default.createElement(_semanticUiReact.Button, {
        color: "green",
        disabled: !!loading,
        loading: loading === 'start',
        icon: true
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "caret square right"
      }), ' Start'),
      onOpen: () => setTimeout(() => this.refs.username.focus(), 1)
    }, _react.default.createElement(_semanticUiReact.Form, {
      style: {
        marginBottom: '0px'
      }
    }, _react.default.createElement(_semanticUiReact.Input, {
      ref: "username",
      placeholder: "Username"
    }), _react.default.createElement("br", null), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.startLab(this.refs.username.inputRef.current.value)
    }, "Go")))), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      hideOnScroll: true,
      trigger: _react.default.createElement(_semanticUiReact.Button, {
        color: "violet",
        disabled: !!loading,
        loading: loading === 'clone',
        icon: true
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "clone"
      }), ' Clone'),
      onOpen: () => setTimeout(() => this.refs.cloneName.focus(), 1)
    }, _react.default.createElement(_semanticUiReact.Form, {
      style: {
        marginBottom: '0px'
      }
    }, _react.default.createElement(_semanticUiReact.Input, {
      ref: "cloneName",
      placeholder: "Lab name",
      defaultValue: lab._id
    }), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.cloneLab(this.refs.cloneName.inputRef.current.value)
    }, "Create")))), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      hideOnScroll: true,
      trigger: _react.default.createElement(_semanticUiReact.Button, {
        negative: true,
        disabled: !!loading,
        loading: loading === 'delete',
        icon: true
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "trash"
      }), ' Delete')
    }, _react.default.createElement(_semanticUiReact.Button, {
      negative: true,
      onClick: () => this.deleteLab()
    }, "Confirm deletion"))));
  }

}

class Labs extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      loading: false
    };
  }

  newLab(newName) {
    const {
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: 'new'
    });
    fetch(`lab/${encodeURIComponent(newName)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          window.location.href = `lab/${encodeURIComponent(body._id)}`;
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
      labs
    } = this.props;
    const {
      loading
    } = this.state;
    return _react.default.createElement(_semanticUiReact.Grid, null, _react.default.createElement(_semanticUiReact.Grid.Column, null, _react.default.createElement(_semanticUiReact.Header, {
      size: "large",
      color: "teal"
    }, "Labs"), _react.default.createElement(_semanticUiReact.Table, null, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Lab"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Assistant"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Machines"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Repositories"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Endpoints"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      colSpan: 4
    }))), _react.default.createElement(_semanticUiReact.Table.Body, null, labs.map(lab => _react.default.createElement(LabRow, {
      key: lab._id,
      lab: lab
    }))), _react.default.createElement(_semanticUiReact.Table.Footer, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, {
      colSpan: 7
    }, _react.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      trigger: _react.default.createElement(_semanticUiReact.Button, {
        positive: true,
        disabled: !!loading,
        loading: loading === 'new'
      }, "New"),
      onOpen: () => setTimeout(() => this.refs.newName.focus(), 1)
    }, _react.default.createElement(_semanticUiReact.Form, {
      style: {
        marginBottom: '0px'
      }
    }, _react.default.createElement(_semanticUiReact.Input, {
      ref: "newName",
      placeholder: "Lab name"
    }), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.newLab(this.refs.newName.inputRef.current.value)
    }, "Create")))))))));
  }

}

exports.default = Labs;