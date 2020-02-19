"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _tableDragger = _interopRequireDefault(require("table-dragger"));

var _semanticUiReact = require("semantic-ui-react");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let templatesLoadPromiseResolve;
let needTemplates = true;
const templatesLoadPromise = new Promise(resolve => {
  templatesLoadPromiseResolve = resolve;
});

async function loadTemplates() {
  if (needTemplates) {
    needTemplates = false;
    const response = await fetch('machine?templates', {
      headers: {
        accept: 'application/json'
      }
    });

    if (response.ok) {
      response.json().then(body => {
        templatesLoadPromiseResolve(body.map(t => t.id));
      }).catch(e => {
        console.error('Failed to load templates: ', e);
      });
    }
  }
}

let repositoriesLoadPromiseResolve;
let needRepositories = true;
const repositoriesLoadPromise = new Promise(resolve => {
  repositoriesLoadPromiseResolve = resolve;
});

async function loadRepositories() {
  if (needRepositories) {
    needRepositories = false;
    const response = await fetch('repository', {
      headers: {
        accept: 'application/json'
      }
    });

    if (response.ok) {
      response.json().then(body => {
        const repositories = {};

        for (const repository of body) {
          repositories[repository._id] = Object.keys(repository.refs);
        }

        repositoriesLoadPromiseResolve(repositories);
      }).catch(e => {
        console.error('Failed to load repositories: ', e);
      });
    }
  }
}
/**
 * Assistant
 */


class Assistant extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      errors: {},
      assistant: props.assistant
    };
  }

  getValue() {
    const {
      assistant
    } = this.state;
    return assistant ? { ...assistant
    } : undefined;
  }

  setField(field) {
    const {
      assistant
    } = this.state;
    return e => {
      this.setState({
        assistant: { ...assistant,
          [field]: e.target.value
        }
      });
    };
  }

  deleteAssistant() {
    this.setState({
      errors: {},
      assistant: undefined
    });
  }

  createAssistant() {
    this.setState({
      assistant: {
        url: '',
        lab: '',
        key: ''
      }
    });
  }

  validateNotEmpty(field, message) {
    return e => {
      const {
        errors
      } = this.state;
      this.setState({
        errors: { ...errors,
          [field]: e.target.value.length < 1 ? message : undefined
        }
      });
    };
  }

  render() {
    const {
      assistant,
      errors
    } = this.state;

    if (typeof assistant !== 'object' || !assistant) {
      return _react.default.createElement(_semanticUiReact.Button, {
        color: "yellow",
        onClick: () => this.createAssistant()
      }, "Add");
    }

    return _react.default.createElement("div", null, _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Input, {
      label: "URL",
      defaultValue: assistant.url,
      error: errors.url,
      onChange: this.validateNotEmpty('url', 'URL must not be empty'),
      onBlur: this.setField('url'),
      style: {
        width: '28.5em'
      }
    })), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Input, {
      label: "Lab ID",
      defaultValue: assistant.lab,
      error: errors.lab,
      onChange: this.validateNotEmpty('lab', 'Lab ID must not be empty'),
      onBlur: this.setField('lab')
    })), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Input, {
      label: "Key",
      defaultValue: assistant.key,
      error: errors.key,
      onChange: this.validateNotEmpty('key', 'Key must not be empty'),
      onBlur: this.setField('key'),
      style: {
        width: '23.5em'
      }
    })), _react.default.createElement(_semanticUiReact.Button, {
      negative: true,
      onClick: () => this.deleteAssistant()
    }, "Remove"));
  }

}
/**
 * Machines
 */


class Network extends _react.default.Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: {},
      type: props.network.type || 'virtualbox',
      name: props.network.name || '',
      promiscuous: Boolean(props.network.promiscuous),
      resetMac: Boolean(props.network.resetMac),
      ip: props.network.ip || ''
    };
  }

  getValue() {
    const {
      machineType
    } = this.props;
    const {
      type,
      name,
      promiscuous,
      resetMac,
      ip
    } = this.state;

    if (!name) {
      return null;
    }

    const ret = {
      name
    };

    if (machineType === 'virtualbox') {
      ret.type = type;

      if (promiscuous) {
        ret.promiscuous = true;
      }

      if (resetMac) {
        ret.resetMac = true;
      }

      if (ip) {
        ret.ip = ip;
      }
    }

    return ret;
  }

  validateNotEmpty(field, message) {
    return e => {
      const {
        errors
      } = this.state;
      this.setState({
        errors: { ...errors,
          [field]: e.target.value.length < 1 ? message : undefined
        }
      });
    };
  }

  render() {
    const {
      machineType,
      autoFocus,
      onDelete
    } = this.props;
    const {
      type,
      name,
      ip,
      promiscuous,
      resetMac,
      errors
    } = this.state;
    const settings = machineType === 'virtualbox' ? _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Dropdown, {
      selection: true,
      fluid: true,
      defaultValue: type,
      options: [{
        text: 'VirtualBox internal network',
        value: 'virtualbox'
      }, {
        text: 'Bridged',
        value: 'bridged'
      }],
      onChange: (e, data) => {
        this.setState({
          type: data.value
        });
      }
    }), _react.default.createElement(_semanticUiReact.Input, {
      label: "IP:",
      defaultValue: ip,
      onBlur: e => this.setState({
        ip: e.target.value
      })
    }), _react.default.createElement(_semanticUiReact.Checkbox, {
      toggle: true,
      label: "Promiscuous",
      defaultChecked: promiscuous,
      onChange: (e, data) => {
        this.setState({
          promiscuous: data.checked
        });
      }
    }), _react.default.createElement(_semanticUiReact.Checkbox, {
      toggle: true,
      label: "Reset MAC",
      defaultChecked: resetMac,
      onChange: (e, data) => this.setState({
        resetMac: data.checked
      })
    })) : _react.default.createElement(_semanticUiReact.Dropdown, {
      selection: true,
      fluid: true,
      value: "bridged",
      disabled: true,
      options: [{
        text: 'Bridged',
        value: 'bridged'
      }]
    });
    return _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Popup, {
      position: "right center",
      hideOnScroll: true,
      on: "click",
      trigger: _react.default.createElement(_semanticUiReact.Input, {
        icon: "setting",
        error: errors.name,
        defaultValue: name,
        onChange: this.validateNotEmpty('name', 'Network name must not be empty'),
        onBlur: e => this.setState({
          name: e.target.value
        }),
        autoFocus: autoFocus
      }),
      content: settings
    }), _react.default.createElement(_semanticUiReact.Button, {
      negative: true,
      icon: true,
      onClick: onDelete
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "delete",
      style: {
        verticalAlign: 'middle'
      }
      /* some bug in semantic? */

    })));
  }

}

class Networks extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      networks: { ...props.networks
      },
      order: props.networks.map((n, i) => i),
      newIndex: props.networks.length
    };
  }

  getValue() {
    const {
      order
    } = this.state;
    return order.map(i => this.refs[`network-${i}`].getValue());
  }

  addNetwork() {
    const {
      newIndex,
      order,
      networks
    } = this.state;
    const index = newIndex + 1;
    this.setState({
      newIndex: index,
      order: [...order, index],
      networks: { ...networks,
        [index]: {}
      }
    });
  }

  deleteNetwork(index) {
    const {
      order,
      networks
    } = this.state;
    const newOrder = [...order];
    const newNetworks = { ...networks
    };
    delete newNetworks[index];
    const orderIndex = order.indexOf(index);

    if (orderIndex !== -1) {
      newOrder.splice(orderIndex, 1);
    }

    this.setState({
      order: newOrder,
      networks: newNetworks
    });
  }

  render() {
    const {
      machineType
    } = this.props;
    const {
      order,
      networks,
      newIndex
    } = this.state;
    return _react.default.createElement("div", null, order.map(i => _react.default.createElement(Network, {
      ref: `network-${i}`,
      key: i,
      network: networks[i],
      onDelete: () => this.deleteNetwork(i),
      autoFocus: i === newIndex,
      machineType: machineType
    })), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      icon: true,
      onClick: () => this.addNetwork()
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "plus",
      size: "large"
    })));
  }

}

class MachineLimits extends _react.default.Component {
  constructor(props) {
    super();
    const limits = props.limits || [];
    this.state = {
      cpu: limits.cpu || undefined,
      cpuAllowance: limits.cpuAllowance || 100,
      memory: limits.memory || undefined
    };
  }

  getValue() {
    const {
      cpu,
      cpuAllowance,
      memory
    } = this.state;

    if (cpu || cpuAllowance !== 100 || memory) {
      return {
        cpu: cpu || undefined,
        cpuAllowance: !cpuAllowance || cpuAllowance === 100 ? undefined : cpuAllowance,
        memory: memory || undefined
      };
    }
  }

  render() {
    const {
      cpu,
      cpuAllowance,
      memory
    } = this.state;
    return _react.default.createElement(_semanticUiReact.Table, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Table.Body, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, "CPU:"), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Input, {
      type: "number",
      style: {
        width: '10em'
      },
      defaultValue: cpu,
      onChange: e => this.setState({
        cpu: Number(e.target.value)
      })
    }))), _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, "CPU Allowance:"), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement("input", {
      type: "range",
      min: "1",
      max: "100",
      defaultValue: cpuAllowance || '100',
      onChange: e => this.setState({
        cpuAllowance: Number(e.target.value)
      })
    }), `${cpuAllowance}%`)), _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, "Memory:"), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Input, {
      type: "number",
      style: {
        width: '10em'
      },
      defaultValue: memory,
      onChange: e => this.setState({
        memory: Number(e.target.value)
      })
    }), "MiB"))));
  }

}

class MachineRepositories extends _react.default.Component {
  constructor(props) {
    super();
    const repositories = props.repositories ? [...props.repositories] : [];
    this.state = {
      allRepositories: {},
      nameErrors: {},
      locationErrors: {},
      refErrors: {},
      repositories: { ...repositories
      },
      order: repositories.map((n, i) => i),
      newIndex: repositories.length
    };
    repositoriesLoadPromise.then(repositories => {
      this.setState({
        allRepositories: repositories
      });
    });
  }

  getValue() {
    const {
      repositories
    } = this.state;

    if (!repositories.length) {
      return;
    }

    return repositories.map(i => repositories[i]);
  }

  setRepository(i, field) {
    return e => {
      const {
        repositories
      } = this.state;
      this.setState({
        repositories: { ...repositories,
          [i]: { ...repositories[i],
            [field]: e.target.value
          }
        }
      });
    };
  }

  deleteRepository(i) {
    const {
      repositories,
      order
    } = this.state;
    const newRepositories = { ...repositories
    };
    delete newRepositories[i];
    const newOrder = [...order];
    const orderIndex = order.indexOf(i);

    if (orderIndex >= 0) {
      newOrder.splice(orderIndex, 1);
    }

    this.setState({
      repositories: newRepositories,
      order: newOrder
    });
  }

  addRepository() {
    const {
      newIndex,
      order,
      repositories
    } = this.state;
    this.setState({
      repositories: { ...repositories,
        [newIndex + 1]: {}
      },
      order: [...order, newIndex],
      newIndex: newIndex + 1
    });
  }

  validateName(i) {
    return e => {
      const {
        nameErrors
      } = this.state;
      this.setState({
        nameErrors: { ...nameErrors,
          [i]: !/^[a-zA-Z0-9_-]+$/.test(e.target.value)
        }
      });
    };
  }

  validateLocation(i) {
    return e => {
      const {
        locationErrors
      } = this.state;
      this.setState({
        locationErrors: { ...locationErrors,
          [i]: !/^\/.+$/.test(e.target.value)
        }
      });
    };
  }

  validateRef(i) {
    return e => {
      const {
        refErrors
      } = this.state;
      this.setState({
        refErrors: { ...refErrors,
          [i]: !/^[a-zA-Z0-9_/-]*$/.test(e.target.value)
        }
      });
    };
  }

  render() {
    const {
      order,
      repositories,
      allRepositories,
      newIndex,
      nameErrors,
      locationErrors,
      refErrors
    } = this.state;
    return _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Table, null, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Repository name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Repository location in machine"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Ref"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement(_semanticUiReact.Table.Body, null, order.map(i => _react.default.createElement(_semanticUiReact.Table.Row, {
      key: i
    }, _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Input, {
      fluid: true,
      list: "repositories",
      defaultValue: repositories[i].name,
      onBlur: this.setRepository(i, 'name'),
      onChange: this.validateName(i),
      autoFocus: i === newIndex,
      onFocus: loadRepositories,
      error: nameErrors[i]
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Input, {
      fluid: true,
      defaultValue: repositories[i].location,
      onBlur: this.setRepository(i, 'location'),
      onChange: this.validateLocation(i),
      error: locationErrors[i]
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement("datalist", {
      id: `refs-${i}`
    }, repositories[i].name in allRepositories && allRepositories[repositories[i].name].map(r => _react.default.createElement("option", {
      key: r
    }, r))), _react.default.createElement(_semanticUiReact.Input, {
      fluid: true,
      list: `refs-${i}`,
      WdefaultValue: repositories[i].ref,
      onBlur: this.setRepository(i, 'ref'),
      onChange: this.validateRef(i),
      onFocus: loadRepositories,
      error: refErrors[i]
    })), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      negative: true,
      onClick: () => this.deleteRepository(i)
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "delete"
    }))))))), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.addRepository(),
      autoFocus: true
    }, "New"));
  }

}

class Machine extends _react.default.Component {
  constructor(props) {
    super();
    const machine = {
      type: 'virtualbox',
      ...props.machine
    };

    if ('enable_token' in props.machine) {
      machine.enable_private = props.machine.enable_token;
      delete machine.enable_token;
    }

    this.state = {
      errors: {},
      machine
    };
  }

  getValue() {
    const {
      machine
    } = this.state;
    return { ...machine,
      networks: this.refs.networks.getValue()
    };
  }

  setId(e) {
    const {
      onIdChange,
      id
    } = this.props;
    const {
      errors
    } = this.state;
    const newId = e.target.value;
    const updated = onIdChange(newId);

    if (updated === false) {
      e.target.value = id;
      this.setState({
        errors: { ...errors,
          id: undefined
        }
      });
    }
  }

  setMachineField(field, value) {
    const {
      machine
    } = this.state;
    this.setState({
      machine: { ...machine,
        [field]: value
      }
    });
  }

  validateRegex(field, regex) {
    return e => {
      const {
        errors
      } = this.state;
      this.setState({
        errors: { ...errors,
          [field]: regex.test(e.target.value) ? undefined : true
        }
      });
    };
  }

  render() {
    const {
      id,
      primary,
      autoFocus,
      onPrimary,
      onDelete
    } = this.props;
    const {
      machine,
      errors
    } = this.state;

    const idNode = _react.default.createElement(_semanticUiReact.Input, {
      fluid: true,
      defaultValue: id,
      autoFocus: autoFocus,
      onChange: this.validateRegex('id', /^[a-zA-Z0-9-_]+$/),
      error: errors.id,
      onFocus: e => e.target.select(),
      onBlur: e => this.setId(e),
      icon: machine.type === 'lxd' ? 'box' : 'desktop'
    });

    const description = _react.default.createElement(_semanticUiReact.Input, {
      fluid: true,
      defaultValue: machine.description,
      onChange: this.validateRegex('description', /./),
      error: errors.description,
      onBlur: e => this.setMachineField('description', e.target.value)
    });

    const base = _react.default.createElement(_semanticUiReact.Input, {
      fluid: true,
      list: machine.type === 'virtualbox' ? 'virtualbox-templates' : undefined,
      defaultValue: machine.base,
      error: errors.base,
      onChange: this.validateRegex('base', /[a-zA-Z0-9-_]+-template$/),
      onBlur: e => this.setMachineField('base', e.target.value),
      onFocus: loadTemplates
    });

    let containerConfigiration;

    if (machine.type === 'lxd') {
      containerConfigiration = _react.default.createElement(_semanticUiReact.Modal, {
        closeIcon: true,
        closeOnDimmerClick: false,
        trigger: _react.default.createElement(_semanticUiReact.Button, {
          color: "teal"
        }, "Configure"),
        onClose: () => {
          const {
            machine
          } = this.state;
          this.setState({
            machine: { ...machine,
              limits: this.refs.limits.getValue(),
              repositories: this.refs.repositories.getValue()
            }
          });
        }
      }, _react.default.createElement(_semanticUiReact.Header, null, "Container configuration"), _react.default.createElement(_semanticUiReact.Modal.Content, null, _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Limits"), _react.default.createElement(MachineLimits, {
        ref: "limits",
        limits: machine.limits
      })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Repositories"), _react.default.createElement(MachineRepositories, {
        ref: "repositories",
        repositories: machine.repositories
      }))));
    }

    const createButton = (field, disabled = false) => {
      return _react.default.createElement(_semanticUiReact.Button, {
        primary: !!machine[field],
        icon: true,
        disabled: disabled,
        onClick: () => this.setMachineField(field, !machine[field])
      }, _react.default.createElement(_semanticUiReact.Icon, {
        name: machine[field] ? 'check' : 'circle'
      }));
    };

    return _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.Cell, {
      className: "table-dragger-handle",
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "sort",
      size: "big"
    })), _react.default.createElement(_semanticUiReact.Table.Cell, {
      onClick: onPrimary,
      collapsing: true
    }, !!primary && _react.default.createElement(_semanticUiReact.Icon, {
      name: "star",
      size: "big"
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, idNode), _react.default.createElement(_semanticUiReact.Table.Cell, null, description), _react.default.createElement(_semanticUiReact.Table.Cell, null, base), _react.default.createElement(_semanticUiReact.Table.Cell, null, createButton('enable_autostart')), _react.default.createElement(_semanticUiReact.Table.Cell, null, createButton('enable_private')), _react.default.createElement(_semanticUiReact.Table.Cell, null, createButton('enable_remote', machine.type === 'lxd')), _react.default.createElement(_semanticUiReact.Table.Cell, null, createButton('enable_restart')), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(Networks, {
      ref: "networks",
      networks: machine.networks,
      machineType: machine.type
    })), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, containerConfigiration), _react.default.createElement(_semanticUiReact.Table.Cell, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Button, {
      negative: true,
      onClick: onDelete
    }, "Delete")));
  }

}

class Machines extends _react.default.Component {
  constructor(props) {
    super();
    const keys = {};

    for (let i = 0; i < props.machineOrder.length; i++) {
      keys[props.machineOrder[i]] = i;
    }

    this.state = {
      primary: props.primary,
      machines: { ...props.machines
      },
      machineOrder: [...props.machineOrder],
      keys
    };
    templatesLoadPromise.then(templates => {
      this.setState({
        templates
      });
    });
  }

  componentDidMount() {
    this.createTableDragger();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps !== this.props) {
      return true;
    }

    const {
      machineOrder,
      templates,
      primary
    } = this.state;

    if (nextState.machineOrder !== machineOrder) {
      return true;
    }

    if (nextState.templates !== templates) {
      return true;
    }

    return nextState.primary !== primary;
  }

  componentDidUpdate() {
    this.createTableDragger();
  }

  getValue() {
    const {
      machineOrder,
      primary
    } = this.state;
    const ret = {
      machines: {},
      machineOrder: [...machineOrder],
      primaryMachine: primary
    };

    for (const id of machineOrder) {
      ret.machines[id] = this.refs[`machine-${id}`].getValue();
    }

    return ret;
  }

  setPrimary(id) {
    return () => {
      const {
        primary
      } = this.state;
      this.setState({
        primary: id !== primary ? id : undefined
      });
    };
  }

  deleteMachine(id) {
    return () => {
      const {
        machines,
        machineOrder,
        keys,
        primary
      } = this.state;
      const newMachines = { ...machines
      };
      const newMachineOrder = [...machineOrder];
      const newKeys = { ...keys
      };
      const newPrimary = primary !== id ? primary : undefined;
      delete newMachines[id];
      delete newKeys[id];
      const orderIndex = newMachineOrder.indexOf(id);

      if (orderIndex >= 0) {
        newMachineOrder.splice(orderIndex, 1);
      }

      this.setState({
        machines: newMachines,
        machineOrder: newMachineOrder,
        keys: newKeys,
        primary: newPrimary
      });
    };
  }

  newMachine(type) {
    const {
      machines,
      machineOrder,
      keys
    } = this.state;
    const newMachines = { ...machines
    };
    const newMachineOrder = [...machineOrder];
    const newKeys = { ...keys
    };
    const newId = Date.now().toString(16);
    newMachines[newId] = {
      type,
      description: '',
      base: '',
      networks: []
    };
    newKeys[newId] = Date.now();
    newMachineOrder.push(newId);
    this.setState({
      machines: newMachines,
      machineOrder: newMachineOrder,
      keys: newKeys,
      newMachine: newId
    });
  }

  changeId(oldId) {
    return newId => {
      const {
        machines,
        machineOrder,
        keys,
        primary
      } = this.state;

      if (oldId === newId || newId === '' || machineOrder.includes(newId)) {
        return false;
      }

      const newMachines = { ...machines
      };
      const newMachineOrder = [...machineOrder];
      const newKeys = { ...keys
      };
      const newPrimary = primary === oldId ? newId : primary;
      newMachines[newId] = newMachines[oldId];
      newKeys[newId] = newKeys[oldId];
      delete newMachines[oldId];
      delete newKeys[oldId];
      const orderIndex = newMachineOrder.indexOf(oldId);

      if (orderIndex !== -1) {
        newMachineOrder.splice(orderIndex, 1, newId);
      }

      this.setState({
        machines: newMachines,
        machineOrder: newMachineOrder,
        keys: newKeys,
        primary: newPrimary
      });
    };
  }

  createTableDragger() {
    if (this.tableDragger) {
      this.tableDragger.destroy();
    }

    try {
      const el = _reactDom.default.findDOMNode(this).querySelector('table');

      this.tableDragger = (0, _tableDragger.default)(el, {
        mode: 'row',
        dragHandler: '.table-dragger-handle',
        onlyBody: true,
        animation: 300
      }).on('drop', (from, to) => {
        const {
          machineOrder
        } = this.state;
        from--;
        to--;
        const newOrder = [...machineOrder];
        const index = newOrder.splice(from, 1);
        newOrder.splice(to, 0, index[0]);
        this.setState({
          machineOrder: newOrder
        });
      });
    } catch (e) {// ignored intentionally
    }
  }

  render() {
    const {
      machines,
      machineOrder,
      primary,
      keys,
      newMachine,
      templates
    } = this.state;

    if (machineOrder.length === 0) {
      return _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Button, {
        positive: true,
        onClick: () => this.newMachine('virtualbox')
      }, "New machine"), _react.default.createElement(_semanticUiReact.Button, {
        positive: true,
        onClick: () => this.newMachine('lxd')
      }, "New container"));
    }

    return _react.default.createElement("div", null, _react.default.createElement("datalist", {
      id: "virtualbox-templates"
    }, templates ? templates.map(t => _react.default.createElement("option", {
      key: t
    }, t)) : undefined), _react.default.createElement(_semanticUiReact.Table, null, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      collapsing: true
    }), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      collapsing: true
    }, "Primary"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "ID"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Description"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Base template"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      width: 1
    }, "Autostart"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      width: 1
    }, "Private details"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      width: 1
    }, "Remote console"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      width: 1
    }, "Power control"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, {
      collapsing: true
    }, "Networks"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement(_semanticUiReact.Table.Body, null, machineOrder.map(id => _react.default.createElement(Machine, {
      ref: `machine-${id}`,
      key: keys[id],
      id: id,
      machine: machines[id],
      onIdChange: this.changeId(id),
      onDelete: this.deleteMachine(id),
      onPrimary: this.setPrimary(id),
      primary: primary === id,
      autoFocus: newMachine === id
    })))), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.newMachine('virtualbox')
    }, "New machine"), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.newMachine('lxd')
    }, "New container"));
  }

}
/**
 * Repositories
 */


class Repositories extends _react.default.Component {
  constructor(props) {
    super();
    const repositories = {};
    const order = [];
    let counter = 0;

    for (const i in props.repositories) {
      repositories[counter] = {
        id: i,
        name: props.repositories[i].name,
        head: props.repositories[i].head
      };
      order.push(counter++);
    }

    this.state = {
      allRepositories: {},
      idErrors: {},
      nameErrors: {},
      headErrors: {},
      repositories,
      order,
      newIndex: counter
    };
    repositoriesLoadPromise.then(repositories => {
      this.setState({
        allRepositories: repositories
      });
    });
  }

  getValue() {
    const {
      order,
      repositories
    } = this.state;
    const value = {};
    let hasRepositories = false;

    for (const i of order) {
      const repository = repositories[i];

      if (repository.id && repository.name && !(repository.id in value)) {
        value[repository.id] = {
          name: repository.name
        };

        if (repository.head) {
          value[repository.id].head = repository.head;
        }

        hasRepositories = true;
      }
    }

    return hasRepositories ? value : undefined;
  }

  setRepository(id, field) {
    return e => {
      const {
        repositories
      } = this.state;
      this.setState({
        repositories: { ...repositories,
          [id]: { ...repositories[id],
            [field]: e.target.value
          }
        }
      });
    };
  }

  deleteRepository(id) {
    const {
      repositories,
      order
    } = this.state;
    const newRepositories = { ...repositories
    };
    const newOrder = [...order];
    delete newRepositories[id];
    const orderIndex = newOrder.indexOf(id);

    if (orderIndex >= 0) {
      newOrder.splice(orderIndex, 1);
    }

    this.setState({
      repositories: newRepositories,
      order: newOrder
    });
  }

  addRepository() {
    const {
      order,
      repositories,
      newIndex
    } = this.state;
    const index = newIndex + 1;
    this.setState({
      repositories: { ...repositories,
        [index]: {
          id: '',
          name: ''
        }
      },
      order: [...order, index],
      newIndex: index
    });
  }

  validateId(id) {
    return e => {
      const {
        order,
        repositories,
        idErrors
      } = this.state;
      let invalid = false;

      if (!/^[a-zA-Z0-9_-]+$/.test(e.target.value)) {
        invalid = true;
      } else {
        for (const i of order) {
          if (i !== id) {
            if (repositories[i].id === e.target.value) {
              invalid = true;
              break;
            }
          }
        }
      }

      this.setState({
        idErrors: { ...idErrors,
          [id]: invalid
        }
      });
    };
  }

  validateName(id) {
    return e => {
      const {
        nameErrors
      } = this.state;
      this.setState({
        nameErrors: { ...nameErrors,
          [id]: !/^[a-zA-Z0-9_-]+$/.test(e.target.value)
        }
      });
    };
  }

  validateHead(id) {
    return e => {
      const {
        headErrors
      } = this.state;
      this.setState({
        headErrors: { ...headErrors,
          [id]: !/^[a-zA-Z0-9_/-]*$/.test(e.target.value)
        }
      });
    };
  }

  render() {
    const {
      order,
      repositories,
      newIndex,
      idErrors,
      nameErrors,
      headErrors,
      allRepositories
    } = this.state;
    return _react.default.createElement("div", null, _react.default.createElement("datalist", {
      id: "repositories"
    }, Object.keys(allRepositories).map(r => _react.default.createElement("option", {
      key: r
    }, r))), order.length !== 0 && _react.default.createElement(_semanticUiReact.Table, {
      collapsing: true
    }, _react.default.createElement(_semanticUiReact.Table.Header, null, _react.default.createElement(_semanticUiReact.Table.Row, null, _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "ID"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Name"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null, "Head"), _react.default.createElement(_semanticUiReact.Table.HeaderCell, null))), _react.default.createElement(_semanticUiReact.Table.Body, null, order.map(i => _react.default.createElement(_semanticUiReact.Table.Row, {
      key: i
    }, _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Input, {
      list: "repositories",
      defaultValue: repositories[i].id,
      onBlur: this.setRepository(i, 'id'),
      onChange: this.validateId(i),
      autoFocus: i === newIndex,
      onFocus: loadRepositories,
      error: idErrors[i]
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Input, {
      list: "repositories",
      defaultValue: repositories[i].name,
      onBlur: this.setRepository(i, 'name'),
      onChange: this.validateName(i),
      onFocus: loadRepositories,
      error: nameErrors[i]
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement("datalist", {
      id: `refs-${i}`
    }, repositories[i].name in allRepositories && allRepositories[repositories[i].name].map(r => _react.default.createElement("option", {
      key: r
    }, r))), _react.default.createElement(_semanticUiReact.Input, {
      list: `refs-${i}`,
      defaultValue: repositories[i].head,
      onBlur: this.setRepository(i, 'head'),
      onChange: this.validateHead(i),
      onFocus: loadRepositories,
      error: headErrors[i]
    })), _react.default.createElement(_semanticUiReact.Table.Cell, null, _react.default.createElement(_semanticUiReact.Button, {
      icon: true,
      negative: true,
      onClick: () => this.deleteRepository(i)
    }, _react.default.createElement(_semanticUiReact.Icon, {
      name: "delete"
    }))))))), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.addRepository()
    }, "New"));
  }

}
/**
 * Endpoints
 * TODO: disable duplicates
 */


class Endpoints extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      endpoints: { ...props.endpoints
      },
      order: props.endpoints.map((n, i) => i),
      newIndex: props.endpoints.length
    };
  }

  getValue() {
    const {
      order,
      endpoints
    } = this.state;
    this.normalize();
    return order.length ? order.map(i => endpoints[i]) : undefined;
  }

  setEndpoint(id) {
    return e => {
      const {
        order,
        endpoints
      } = this.state;

      if (e.target.value === '') {
        const orderIndex = order.indexOf(id);

        if (orderIndex > -1) {
          const newOrder = [...order];
          newOrder.splice(orderIndex, 1);
          this.setState({
            order: newOrder
          });
        }
      } else if (endpoints[id] !== e.target.value && !order.some(id => endpoints[id] === e.target.value)) {
        const newEndpoints = { ...endpoints
        };
        newEndpoints[id] = e.target.value;
        this.setState({
          endpoints: newEndpoints
        });
      } else {
        e.target.value = endpoints[id];
      }
    };
  }

  addEndpoint() {
    const {
      newIndex,
      order,
      endpoints
    } = this.state;
    const index = newIndex + 1;
    this.setState({
      endpoints: { ...endpoints,
        [index]: ''
      },
      order: [...order, index],
      newIndex: index
    });
  }

  normalize() {
    const {
      order,
      endpoints
    } = this.state;
    this.setState({
      order: order.filter(i => endpoints[i].length)
    });
  }

  render() {
    const {
      order,
      endpoints,
      newIndex
    } = this.state;
    return _react.default.createElement("div", null, order.map(i => _react.default.createElement("div", {
      key: i
    }, _react.default.createElement(_semanticUiReact.Input, {
      ref: `endpoint-${i}`,
      defaultValue: endpoints[i],
      onBlur: this.setEndpoint(i),
      autoFocus: i === newIndex
    }))), _react.default.createElement(_semanticUiReact.Button, {
      positive: true,
      onClick: () => this.addEndpoint()
    }, "New"));
  }

}
/**
 * Gitlab
 */


class Gitlab extends _react.default.Component {
  constructor(props) {
    super();
    this.state = {
      gitlab: props.gitlab
    };
  }

  getValue() {
    const {
      gitlab
    } = this.state;
    return typeof gitlab === 'object' && gitlab ? { ...gitlab
    } : undefined;
  }

  setField(field) {
    return e => {
      const {
        gitlab
      } = this.state;
      this.setState({
        gitlab: { ...gitlab,
          [field]: e.target.value
        }
      });
    };
  }

  deleteGitlab() {
    this.setState({
      gitlab: undefined
    });
  }

  createGitlab() {
    this.setState({
      gitlab: {
        url: '',
        key: ''
      }
    });
  }

  render() {
    const {
      gitlab
    } = this.state;

    if (typeof gitlab !== 'object' || !gitlab) {
      return _react.default.createElement(_semanticUiReact.Button, {
        color: "yellow",
        onClick: () => this.createGitlab()
      }, "Add");
    }

    return _react.default.createElement("div", null, _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Input, {
      label: "URL",
      defaultValue: gitlab.url,
      onBlur: this.setField('url'),
      style: {
        width: '28.5em'
      }
    })), _react.default.createElement("div", null, _react.default.createElement(_semanticUiReact.Input, {
      label: "Key",
      defaultValue: gitlab.key,
      onBlur: this.setField('key')
    })), _react.default.createElement(_semanticUiReact.Button, {
      negative: true,
      onClick: () => this.deleteGitlab()
    }, "Remove"));
  }

}

class _default extends _react.default.Component {
  constructor() {
    super();
    this.state = {
      loading: false
    };
  }

  getValue() {
    return {
      assistant: this.refs.assistant.getValue(),
      ...this.refs.machines.getValue(),
      repositories: this.refs.repositories.getValue(),
      endpoints: this.refs.endpoints.getValue(),
      gitlab: this.refs.gitlab.getValue()
    };
  }

  async save() {
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
      loading: 'save'
    });
    fetch(`lab/${encodeURIComponent(lab._id)}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'if-match': lab._rev
      },
      body: JSON.stringify(this.getValue())
    }).then(response => {
      if (response.ok) {
        window.location.href = 'lab';
      } else {
        this.setState({
          loading: null
        });
      }
    }, e => {
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
    return _react.default.createElement(_semanticUiReact.Grid, null, _react.default.createElement(_semanticUiReact.Grid.Column, null, _react.default.createElement(_semanticUiReact.Header, {
      color: "teal",
      size: "huge"
    }, `Lab: ${lab._id}`), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Assistant", _react.default.createElement(_semanticUiReact.Popup, {
      trigger: _react.default.createElement(_semanticUiReact.Icon, {
        color: "blue",
        name: "info circle",
        size: "tiny"
      })
    }, _react.default.createElement("p", null, "Virtual Teaching Assistant is proprietary software used to directly interact with end user."), _react.default.createElement("p", null, "Lab manager can create VirtualTA lab instance and provide access to that instance to integrated applications."))), _react.default.createElement(Assistant, {
      ref: "assistant",
      assistant: lab.assistant
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Machines"), _react.default.createElement(Machines, {
      ref: "machines",
      machines: 'machines' in lab ? lab.machines : {},
      machineOrder: 'machineOrder' in lab ? lab.machineOrder : [],
      primary: lab.primaryMachine
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Repositories", _react.default.createElement(_semanticUiReact.Popup, {
      trigger: _react.default.createElement(_semanticUiReact.Icon, {
        color: "blue",
        name: "info circle",
        size: "tiny"
      })
    }, _react.default.createElement("p", null, "Repositories which this lab has access to. ID is alias to repo (often equal to name), different labs can access to different repositories with same ID. Name is on-disk repository name."))), _react.default.createElement(Repositories, {
      ref: "repositories",
      repositories: 'repositories' in lab ? lab.repositories : {}
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Endpoints", _react.default.createElement(_semanticUiReact.Popup, {
      trigger: _react.default.createElement(_semanticUiReact.Icon, {
        color: "blue",
        name: "info circle",
        size: "tiny"
      })
    }, _react.default.createElement("p", null, "This section configures endpoints exposed to user via lab proxy"))), _react.default.createElement(Endpoints, {
      ref: "endpoints",
      endpoints: 'endpoints' in lab ? lab.endpoints : []
    })), _react.default.createElement(_semanticUiReact.Segment, null, _react.default.createElement(_semanticUiReact.Header, null, "Gitlab"), _react.default.createElement(Gitlab, {
      ref: "gitlab",
      gitlab: lab.gitlab
    })), _react.default.createElement(_semanticUiReact.Button, {
      primary: true,
      onClick: () => this.save(),
      disabled: !!loading
    }, "Save")));
  }

}

exports.default = _default;