"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _semanticUiReact = require("semantic-ui-react");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class LabRow extends _react2.default.Component {
  constructor() {
    super();
    this.state = {
      loading: false
    };
  }

  deleteLab() {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: 'delete'
    });
    fetch('lab/' + encodeURIComponent(this.props.lab._id), {
      method: 'DELETE',
      headers: {
        'if-match': this.props.lab._rev
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
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: 'clone'
    });
    fetch('lab/' + encodeURIComponent(cloneName), {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(this.props.lab)
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          window.location.href = 'lab/' + encodeURIComponent(body._id);
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

  startLab(username) {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: 'start'
    });
    const resourceUrl = 'lab/' + encodeURIComponent(this.props.lab._id) + '/instance/' + encodeURIComponent(username);
    fetch(resourceUrl, {
      method: 'POST',
      headers: {
        'if-match': this.props.lab._rev
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
    const lab = this.props.lab;
    const repositories = [];

    for (const id in lab.repositories) {
      repositories.push(_react2.default.createElement("p", {
        key: id
      }, id, " (", lab.repositories[id].name, lab.repositories[id].head && '/' + lab.repositories[id].head, ")"));
    }

    return _react2.default.createElement(_semanticUiReact.Table.Row, null, _react2.default.createElement(_semanticUiReact.Table.Cell, null, lab._id), _react2.default.createElement(_semanticUiReact.Table.Cell, null, 'assistant' in lab ? lab.assistant.url : _react2.default.createElement("i", null, "None")), _react2.default.createElement(_semanticUiReact.Table.Cell, null, 'machineOrder' in lab ? lab.machineOrder.map(id => _react2.default.createElement("p", {
      key: id
    }, lab.machines[id].base, " (", lab.machines[id].description, ")")) : _react2.default.createElement("i", null, "None")), _react2.default.createElement(_semanticUiReact.Table.Cell, {
      singleLine: true
    }, repositories.length ? repositories : _react2.default.createElement("i", null, "None")), _react2.default.createElement(_semanticUiReact.Table.Cell, {
      singleLine: true
    }, 'endpoints' in lab ? lab.endpoints.map(name => _react2.default.createElement("p", {
      key: name
    }, name)) : _react2.default.createElement("i", null, "None")), _react2.default.createElement(_semanticUiReact.Table.Cell, null, _react2.default.createElement("a", {
      href: 'lab/' + encodeURIComponent(lab._id)
    }, "Details")), _react2.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react2.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      hideOnScroll: true,
      trigger: _react2.default.createElement(_semanticUiReact.Button, {
        color: "green",
        disabled: !!this.state.loading,
        loading: this.state.loading === 'start',
        icon: true
      }, _react2.default.createElement(_semanticUiReact.Icon, {
        name: "caret square right"
      }), " Start"),
      onOpen: () => setTimeout(() => this.refs.username.focus(), 1)
    }, _react2.default.createElement(_semanticUiReact.Form, {
      style: {
        marginBottom: '0px'
      }
    }, _react2.default.createElement(_semanticUiReact.Input, {
      ref: "username",
      placeholder: "Username"
    }), _react2.default.createElement("br", null), _react2.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.startLab(this.refs.username.inputRef.value)
    }, "Go")))), _react2.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react2.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      hideOnScroll: true,
      trigger: _react2.default.createElement(_semanticUiReact.Button, {
        color: "violet",
        disabled: !!this.state.loading,
        loading: this.state.loading === 'clone',
        icon: true
      }, _react2.default.createElement(_semanticUiReact.Icon, {
        name: "clone"
      }), " Clone"),
      onOpen: () => setTimeout(() => this.refs.cloneName.focus(), 1)
    }, _react2.default.createElement(_semanticUiReact.Form, {
      style: {
        marginBottom: '0px'
      }
    }, _react2.default.createElement(_semanticUiReact.Input, {
      ref: "cloneName",
      placeholder: "Lab name",
      defaultValue: lab._id
    }), _react2.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.cloneLab(this.refs.cloneName.inputRef.value)
    }, "Create")))), _react2.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react2.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      hideOnScroll: true,
      trigger: _react2.default.createElement(_semanticUiReact.Button, {
        negative: true,
        disabled: !!this.state.loading,
        loading: this.state.loading === 'delete',
        icon: true
      }, _react2.default.createElement(_semanticUiReact.Icon, {
        name: "trash"
      }), " Delete")
    }, _react2.default.createElement(_semanticUiReact.Button, {
      negative: true,
      onClick: () => this.deleteLab()
    }, "Confirm deletion"))));
  }

}

class Labs extends _react2.default.Component {
  constructor(props) {
    super();
    this.state = {
      labs: props.labs,
      loading: false
    };
  }

  newLab(newName) {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: 'new'
    });
    fetch('lab/' + encodeURIComponent(newName), {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          window.location.href = 'lab/' + encodeURIComponent(body._id);
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
    const labs = [];

    for (const lab of this.state.labs) {
      labs.push(_react2.default.createElement(LabRow, {
        key: lab._id,
        lab: lab
      }));
    }

    return _react2.default.createElement(_semanticUiReact.Grid, null, _react2.default.createElement(_semanticUiReact.Grid.Column, null, _react2.default.createElement(_semanticUiReact.Header, {
      size: "large",
      color: "teal"
    }, "Labs"), _react2.default.createElement(_semanticUiReact.Table, null, _react2.default.createElement(_semanticUiReact.Table.Header, null, _react2.default.createElement(_semanticUiReact.Table.Row, null, _react2.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Lab"), _react2.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Assistant"), _react2.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Machines"), _react2.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Repositories"), _react2.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Endpoints"), _react2.default.createElement(_semanticUiReact.Table.HeaderCell, {
      colSpan: 4
    }))), _react2.default.createElement(_semanticUiReact.Table.Body, null, labs), _react2.default.createElement(_semanticUiReact.Table.Footer, null, _react2.default.createElement(_semanticUiReact.Table.Row, null, _react2.default.createElement(_semanticUiReact.Table.Cell, {
      colSpan: 7
    }, _react2.default.createElement(_semanticUiReact.Popup, {
      on: "click",
      position: "top center",
      wide: true,
      trigger: _react2.default.createElement(_semanticUiReact.Button, {
        positive: true,
        disabled: !!this.state.loading,
        loading: this.state.loading === 'new'
      }, "New"),
      onOpen: () => setTimeout(() => this.refs['newName'].focus(), 1)
    }, _react2.default.createElement(_semanticUiReact.Form, {
      style: {
        marginBottom: '0px'
      }
    }, _react2.default.createElement(_semanticUiReact.Input, {
      ref: "newName",
      placeholder: "Lab name"
    }), _react2.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.newLab(this.refs.newName.inputRef.value)
    }, "Create")))))))));
  }

}

exports.default = Labs;