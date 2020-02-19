"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _semanticUiReact = require("semantic-ui-react");

var _util = require("./util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Assistant({
  template,
  assistant
}) {
  if (typeof template !== 'object' || template === null) {
    return _react.default.createElement("i", null, "None");
  }

  let userKey;
  let link;

  if (typeof assistant === 'object' && assistant) {
    userKey = _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "User key:", _react.default.createElement(_semanticUiReact.Label.Detail, null, assistant.userKey)));
    link = _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Link:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement("a", {
      href: assistant.link,
      rel: "noopener noreferrer",
      target: "_blank"
    }, assistant.link))));
  }

  if ('key' in template) {
    return _react.default.createElement("div", null, _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "URL:", _react.default.createElement(_semanticUiReact.Label.Detail, null, template.url))), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Key:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement(_util.SecretKey, null, template.key)))), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Lab ID:", _react.default.createElement(_semanticUiReact.Label.Detail, null, template.lab))), userKey, link);
  }

  if (typeof assistant === 'object' && assistant && 'userKey' in assistant) {
    return _react.default.createElement("div", null, userKey, link);
  }

  return _react.default.createElement("i", null, "None");
}

class Machine extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      loading: null,
      machine: { ...props.machine
      }
    };
  }

  setMachineState(state) {
    const {
      id,
      rev
    } = this.props;
    const {
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: state
    });
    fetch(`instance/${encodeURIComponent(window.INIT_STATE.instanceToken)}/machine/${encodeURIComponent(id)}?ip`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'if-match': rev
      },
      body: JSON.stringify({
        state
      })
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          this.setState({
            machine: body,
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

  openRdp() {
    const {
      id
    } = this.props;
    window.open(`${config.remote}/${encodeURIComponent(window.INIT_STATE.instanceToken)}:${encodeURIComponent(id)}`);
  }

  reload() {
    const {
      id,
      rev
    } = this.props;
    const {
      loading
    } = this.state;

    if (loading) {
      return;
    }

    this.setState({
      loading: 'reload'
    });
    fetch(`instance/${encodeURIComponent(window.INIT_STATE.instanceToken)}/machine/${encodeURIComponent(id)}?ip`, {
      headers: {
        'if-match': rev
      }
    }).then(response => {
      if (response.ok) {
        return response.json().then(body => {
          this.setState({
            machine: body,
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
      primary,
      template
    } = this.props;
    const {
      machine,
      loading
    } = this.state;
    let stateButton;

    if (machine.state === 'poweroff' || machine.state === 'stopped') {
      stateButton = _react.default.createElement(_semanticUiReact.Button, {
        icon: true,
        primary: true,
        disabled: !!loading,
        loading: loading === 'running',
        onClick: () => this.setMachineState('running')
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: "bolt"
      }), "Power on");
    } else if (machine.state === 'running') {
      if (template.type === 'virtualbox') {
        stateButton = _react.default.createElement(_semanticUiReact.Button.Group, null, _react.default.createElement(_semanticUiReact.Button, {
          icon: true,
          color: "yellow",
          disabled: !!loading,
          loading: loading === 'acpipowerbutton',
          onClick: () => this.setMachineState('acpipowerbutton')
        }, _react.default.createElement(_semanticUiReact.Icon, {
          name: "power off"
        }), "Shutdown"), _react.default.createElement(_semanticUiReact.Button.Or, null), _react.default.createElement(_semanticUiReact.Button, {
          icon: true,
          negative: true,
          disabled: !!loading,
          loading: loading === 'poweroff',
          onClick: () => this.setMachineState('poweroff')
        }, _react.default.createElement(_semanticUiReact.Icon, {
          name: "plug"
        }), "Power off"));
      } else {
        stateButton = _react.default.createElement(_semanticUiReact.Button.Group, null, _react.default.createElement(_semanticUiReact.Button, {
          icon: true,
          negative: true,
          disabled: !!loading,
          loading: loading === 'poweroff',
          onClick: () => this.setMachineState('poweroff')
        }, _react.default.createElement(_semanticUiReact.Icon, {
          name: "plug"
        }), "Power off"));
      }
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

    return _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, !!primary && _react.default.createElement(_semanticUiReact.Icon, {
      name: "star"
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, template.description), _react.default.createElement(_semanticUiReact.Table.Cell, null, machine.name), _react.default.createElement(_semanticUiReact.Table.Cell, null, template.base), _react.default.createElement(_semanticUiReact.Table.Cell, null, 'networks' in machine && machine.networks.map((network, i) => _react.default.createElement("div", {
      key: i
    }, network.name))), _react.default.createElement(_semanticUiReact.Table.Cell, null, ip), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, 'rdp-port' in machine && _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      color: "blue",
      basic: true,
      onClick: () => this.openRdp()
    }, `RDP: ${machine['rdp-port']}`, _react.default.createElement(_semanticUiReact.Icon, {
      name: "external alternate"
    }))), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true,
      style: {
        textAlign: 'right'
      }
    }, stateButton), _react.default.createElement(_semanticUiReact.Table.Cell, {
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

function Machines({
  machineOrder,
  machines,
  rev,
  primary,
  templates
}) {
  if (!machineOrder || machineOrder.length === 0) {
    return _react.default.createElement("i", null, "None");
  }

  return _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Table, {
    selectable: true
  }, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
    collapsing: true
  }), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Description"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Base template"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
    width: 3
  }, "Networks"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "IP-s"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement(_semanticUiReact.Table.Body, null, machineOrder.map(id => _react.default.createElement(Machine, {
    key: id,
    id: id,
    rev: rev,
    machine: machines[id],
    template: templates[id],
    primary: primary === id
  })))));
}

function Repositories(props) {
  const {
    template,
    repositories
  } = props;

  if (!template) {
    return _react.default.createElement("i", null, "None");
  }

  return _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Table, null, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "ID"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Repository"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Head"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Link"))), _react.default.createElement(_semanticUiReact.Table.Body, null, Object.keys(template).map(id => _react.default.createElement(_semanticUiReact.Table.Row, {
    key: id
  }, _react.default.createElement(_semanticUiReact.Table.Cell, null, id), _react.default.createElement(_semanticUiReact.Table.Cell, null, template[id].name), _react.default.createElement(_semanticUiReact.Table.Cell, null, template[id].head), _react.default.createElement(_semanticUiReact.Table.Cell, null, repositories[id].link))))));
}

function Endpoints({
  names,
  endpoints
}) {
  if (!Array.isArray(names)) {
    return _react.default.createElement("i", null, "None");
  }

  function link(name) {
    const {
      link
    } = endpoints[name];

    if (link.startsWith('http:') || link.startsWith('https:')) {
      return _react.default.createElement("a", {
        href: link,
        rel: "noopener noreferrer",
        target: "_blank"
      }, link);
    }

    if (link.startsWith('ssh:')) {
      try {
        const [auth, port] = link.slice(6).split(':');
        return `ssh ${auth} -p${port}`;
      } catch (e) {
        return link;
      }
    } else {
      return link;
    }
  }

  return _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Table, null, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Key"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Link"))), _react.default.createElement(_semanticUiReact.Table.Body, null, names.map(name => _react.default.createElement(_semanticUiReact.Table.Row, {
    key: name
  }, _react.default.createElement(_semanticUiReact.Table.Cell, null, name), _react.default.createElement(_semanticUiReact.Table.Cell, null, endpoints[name].key), _react.default.createElement(_semanticUiReact.Table.Cell, null, link(name)))))));
}

function Gitlab({
  template,
  gitlab
}) {
  if (typeof template !== 'object' || template === null) {
    return _react.default.createElement("i", null, "None");
  }

  return _react.default.createElement("div", null, _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
    size: "big"
  }, "URL:", ' ', _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement("a", {
    href: template.url,
    rel: "noopener noreferrer",
    target: "_blank"
  }, template.url)))), 'key' in template && _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
    size: "big"
  }, "Key:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement(_util.SecretKey, null, template.key)))), typeof gitlab === 'object' && gitlab !== null && _react.default.createElement(_react.default.Fragment, null, _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
    size: "big"
  }, "Group link:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement("a", {
    rel: "noopener noreferrer",
    target: "_blank",
    href: gitlab.group.link
  }, gitlab.group.link)))), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
    size: "big"
  }, "User link:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement("a", {
    rel: "noopener noreferrer",
    target: "_blank",
    href: gitlab.user.link
  }, gitlab.user.link))))));
}

function Timing(props) {
  const {
    timing,
    startTime
  } = props;

  function forEach(timing, cb, keys = []) {
    if (Array.isArray(timing)) {
      cb(keys, timing);
    } else {
      for (const i in timing) {
        forEach(timing[i], cb, [...keys, i]);
      }
    }
  }

  let max = startTime;
  forEach(timing, (keys, timing) => {
    if (timing[1] > max) {
      [, max] = timing;
    }
  });
  max -= startTime;
  const timingNodes = [];
  forEach(timing, (keys, t) => {
    timingNodes.push(_react.default.createElement(_semanticUiReact.Table.Row, {
      key: keys.join(': ')
    }, _react.default.createElement(_semanticUiReact.Table.Cell, {
      style: {
        fontWeight: 'body'
      }
    }, keys.join(': ')), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement("span", {
      style: {
        display: 'inline-block',
        width: `${(t[0] - startTime) / max * 80}%`
      }
    }, t[0] - startTime), _react.default.createElement("span", {
      style: {
        display: 'inline-block',
        width: `${(t[1] - t[0]) / max * 80}%`,
        backgroundColor: 'lightgreen'
      }
    }, t[1] - t[0]))));
  });
  return _react.default.createElement(_semanticUiReact.Table, {
    compact: true
  }, _react.default.createElement(_semanticUiReact.Table.Body, null, timingNodes));
}

class _default extends _react.default.Component {
  constructor() {
    super();
    this.state = {
      loading: null
    };
  }

  deleteInstance() {
    const {
      instance
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
    fetch(`lab/${encodeURIComponent(instance.lab._id)}/instance/${encodeURIComponent(instance.username)}`, {
      method: 'DELETE',
      headers: {
        'if-match': instance._rev
      }
    }).then(response => {
      if (response.ok) {
        window.location.href = 'instance';
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
      instance
    } = this.props;
    const {
      loading
    } = this.state;
    const {
      lab
    } = instance;
    const startTime = new Date(instance.startTime);
    return _react.default.createElement(_semanticUiReact.Grid, null, _react.default.createElement(_semanticUiReact.Grid.Column, null, _react.default.createElement(_semanticUiReact.Header, {
      color: "teal",
      size: "huge"
    }, "Instance"), instance.imported && _react.default.createElement(_semanticUiReact.Header, {
      color: "blue",
      size: "medium"
    }, "Imported"), _react.default.createElement(_semanticUiReact.Segment, null, lab._id && _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Lab:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement("a", {
      href: `lab/${encodeURIComponent(lab._id)}`
    }, lab._id)))), instance.username && _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Username:", _react.default.createElement(_semanticUiReact.Label.Detail, null, instance.username))), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Start time:", _react.default.createElement(_semanticUiReact.Label.Detail, null, `${startTime.toDateString()} ${startTime.toTimeString().split(' ')[0]} `, "(", _react.default.createElement(_util.TimeSince, {
      date: startTime
    }), ")"))), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Public token:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement("a", {
      href: `instance/${encodeURIComponent(instance.publicToken)}`
    }, instance.publicToken)))), instance.privateToken && _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Label, {
      size: "big"
    }, "Private token:", _react.default.createElement(_semanticUiReact.Label.Detail, null, _react.default.createElement(_util.SecretKey, {
      as: "a",
      href: `instance/${encodeURIComponent(instance.privateToken)}`
    }, instance.privateToken))))), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Assistant"), _react.default.createElement(Assistant, {
      assistant: instance.assistant,
      template: lab.assistant
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Machines"), _react.default.createElement(Machines, {
      machines: instance.machines,
      templates: lab.machines,
      machineOrder: lab.machineOrder,
      primary: lab.primaryMachine,
      rev: instance._rev
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Repositories"), _react.default.createElement(Repositories, {
      repositories: instance.repositories,
      template: lab.repositories
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Endpoints"), _react.default.createElement(Endpoints, {
      endpoints: instance.endpoints,
      names: lab.endpoints
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Gitlab"), _react.default.createElement(Gitlab, {
      gitlab: instance.gitlab,
      template: lab.gitlab,
      publicToken: instance.publicToken
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Timing"), _react.default.createElement(Timing, {
      startTime: startTime.getTime(),
      timing: instance.timing
    })), instance._id && _react.default.createElement(_semanticUiReact.Popup, {
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
      onClick: () => this.deleteInstance()
    }, "Confirm deletion"))));
  }

}

exports.default = _default;