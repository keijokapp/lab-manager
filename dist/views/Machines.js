"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _semanticUiReact = require("semantic-ui-react");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Machine extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      machine: props.machine
    };
  }

  getNextSnapshot() {
    if (!this.state.machine.id.endsWith('-template')) {
      return '';
    }

    const basename = this.state.machine.id.replace(/-template$/, '');

    if (!this.state.machine.snapshot) {
      return basename + '-1-template';
    }

    const snapshotIndex = Number(this.state.machine.snapshot.replace(basename + '-', '').replace('-template', ''));

    if (Number.isInteger(snapshotIndex)) {
      return basename + '-' + (snapshotIndex + 1) + '-template';
    } else {
      return '';
    }
  }

  openRdp() {
    window.open(config.remote + '/' + encodeURIComponent(this.state.machine.id));
  }

  createSnapshot(snapshotName) {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: 'snapshot'
    });
    fetch('machine/' + encodeURIComponent(this.state.machine.id) + '/snapshot/' + encodeURIComponent(snapshotName), {
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

  setMachineState(state) {
    if (this.state.loading) {
      return;
    }

    this.setState({
      loading: state
    });
    fetch('machine/' + encodeURIComponent(this.state.machine.id) + '?ip', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        state
      })
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          this.setState({
            machine: { ...this.state.machine,
              ...body
            },
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

  reload(force) {
    if (!force && this.state.loading) {
      return;
    }

    this.setState({
      loading: 'reload'
    });
    fetch('machine/' + encodeURIComponent(this.state.machine.id) + '?ip').then(response => {
      if (response.ok) {
        return response.json().then(body => {
          this.setState({
            machine: body,
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
    const machine = this.state.machine;
    let rdpOrSnapshotButton;

    if (machine.state === 'running') {
      if ('rdp-port' in machine) {
        rdpOrSnapshotButton = _react.default.createElement(_semanticUiReact.Button, {
          icon: true,
          color: "blue",
          basic: true,
          onClick: () => this.openRdp()
        }, "RDP: ", machine['rdp-port'], " ", _react.default.createElement(_semanticUiReact.Icon, {
          name: "external alternate"
        }));
      }
    } else if (this.state.machine.state === 'poweroff' && this.state.machine.id.endsWith('-template')) {
      rdpOrSnapshotButton = _react.default.createElement(_semanticUiReact.Popup, {
        on: "click",
        hideOnScroll: true,
        trigger: _react.default.createElement(_semanticUiReact.Button, {
          icon: true,
          color: "violet",
          loading: this.state.loading === 'snapshot',
          disabled: !!this.state.loading
        }, _react.default.createElement(_semanticUiReact.Icon, {
          name: "save"
        }), " Snapshot"),
        onOpen: () => setTimeout(() => this.refs['snapshotName'].focus(), 1)
      }, _react.default.createElement(_semanticUiReact.Form, {
        style: {
          marginBottom: '0px'
        }
      }, _react.default.createElement(_semanticUiReact.Input, {
        ref: "snapshotName",
        placeholder: "Snapshot name",
        defaultValue: this.getNextSnapshot()
      }), _react.default.createElement(_semanticUiReact.Button, {
        positive: true,
        onClick: () => this.createSnapshot(this.refs.snapshotName.inputRef.value)
      }, "Create")));
    }

    let stateButton;

    if (machine.state === 'poweroff') {
      stateButton = _react.default.createElement(_semanticUiReact.Button, {
        icon: true,
        primary: true,
        disabled: !!this.state.loading,
        loading: this.state.loading === 'running',
        onClick: () => this.setMachineState('running')
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "bolt"
      }), " Power on");
    } else if (machine.state === 'running') {
      stateButton = _react.default.createElement(_semanticUiReact.Button.Group, null, _react.default.createElement(_semanticUiReact.Button, {
        icon: true,
        color: "yellow",
        disabled: !!this.state.loading,
        loading: this.state.loading === 'acpipowerbutton',
        onClick: () => this.setMachineState('acpipowerbutton')
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "power off"
      }), " Shutdown"), _react.default.createElement(_semanticUiReact.Button.Or, null), _react.default.createElement(_semanticUiReact.Button, {
        icon: true,
        negative: true,
        disabled: !!this.state.loading,
        loading: this.state.loading === 'poweroff',
        onClick: () => this.setMachineState('poweroff')
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "plug"
      }), " Power off"));
    } else {
      stateButton = _react.default.createElement(_semanticUiReact.Button, {
        disabled: true
      }, "Unknown");
    }

    const ip = [];

    if ('ip' in machine) {
      for (const iface in machine.ip) {
        if (ip.length >= 4) {
          ip.push(_react.default.createElement("p", {
            key: iface
          }, "..."));
          break;
        } else {
          ip.push(_react.default.createElement("p", {
            key: iface
          }, machine.ip[iface]));
        }
      }
    }

    return _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, null, machine.id), _react.default.createElement(_semanticUiReact.Table.Cell, null, machine.state), _react.default.createElement(_semanticUiReact.Table.Cell, null), _react.default.createElement(_semanticUiReact.Table.Cell, null, machine.snapshot), _react.default.createElement(_semanticUiReact.Table.Cell, null), _react.default.createElement(_semanticUiReact.Table.Cell, null, ip), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, rdpOrSnapshotButton), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true,
      style: {
        textAlign: 'right'
      }
    }, stateButton), _react.default.createElement(_semanticUiReact.Table.Cell, {
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
  const tabs = [['machine', 'All machines'], ['machine?templates', 'Templates'], ['machine?running', 'Running machines']].map((link, i) => _react.default.createElement("a", {
    key: i,
    className: props.activeTab === i ? 'active item' : 'item',
    href: link[0]
  }, link[1]));
  const machines = props.machines.map(machine => _react.default.createElement(Machine, {
    key: machine.id,
    machine: machine
  }));
  return _react.default.createElement(_semanticUiReact.Grid, null, _react.default.createElement(_semanticUiReact.Grid.Column, null, _react.default.createElement(_semanticUiReact.Header, {
    size: "large",
    color: "teal"
  }, "Virtual machines"), _react.default.createElement("div", {
    className: "ui top attached tabular menu"
  }, tabs), _react.default.createElement("div", {
    className: "ui bottom attached segment active tab"
  }, _react.default.createElement(_semanticUiReact.Table, {
    selectable: true
  }, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
    colSpan: 2
  }, "State"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
    colSpan: 2
  }, "Snapshot"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "IP-s"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement("tbody", null, machines)))));
};

exports.default = _default;