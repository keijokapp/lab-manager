'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _tableDragger = require('table-dragger');

var _tableDragger2 = _interopRequireDefault(_tableDragger);

var _semanticUiReact = require('semantic-ui-react');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let templatesLoadPromiseResolve;
let needTemplates = true;
let templatesLoadPromise = new Promise(resolve => {
	templatesLoadPromiseResolve = resolve;
});

async function loadTemplates() {
	if (needTemplates) {
		needTemplates = false;
		const response = await fetch('machine?templates', {
			headers: { 'accept': 'application/json' }
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
let repositoriesLoadPromise = new Promise(resolve => {
	repositoriesLoadPromiseResolve = resolve;
});

async function loadRepositories() {
	if (needRepositories) {
		needRepositories = false;
		const response = await fetch('repository', {
			headers: { 'accept': 'application/json' }
		});
		if (response.ok) {
			response.json().then(body => {
				repositoriesLoadPromiseResolve(body.map(t => t._id));
			}).catch(e => {
				console.error('Failed to load repositories: ', e);
			});
		}
	}
}

/**
 * Assistant
 */
class Assistant extends _react2.default.Component {

	constructor(props) {
		super();
		this.state = {
			errors: {},
			assistant: props.assistant
		};
	}

	getValue() {
		return this.state.assistant ? { ...this.state.assistant } : undefined;
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

	deleteAssistant() {
		this.setState({
			errors: {},
			assistant: undefined
		});
	}

	setField(field) {
		return e => {
			this.setState({
				assistant: {
					...this.state.assistant,
					[field]: e.target.value
				}
			});
		};
	}

	validateNotEmpty(field, message) {
		return e => {
			this.setState({
				errors: {
					...this.state.errors,
					[field]: e.target.value.length < 1 ? message : undefined
				}
			});
		};
	}

	render() {
		if (typeof this.state.assistant !== 'object' || !this.state.assistant) {
			return _react2.default.createElement(
				_semanticUiReact.Button,
				{ color: 'yellow', onClick: () => this.createAssistant() },
				'Add'
			);
		} else {
			return _react2.default.createElement(
				'div',
				null,
				_react2.default.createElement(
					'div',
					null,
					_react2.default.createElement(_semanticUiReact.Input, { label: 'URL', defaultValue: this.state.assistant.url, error: this.state.errors.url,
						onChange: this.validateNotEmpty('url', 'URL must not be empty'),
						onBlur: this.setField('url'), style: { width: '28.5em' } })
				),
				_react2.default.createElement(
					'div',
					null,
					_react2.default.createElement(_semanticUiReact.Input, { label: 'Lab ID', defaultValue: this.state.assistant.lab, error: this.state.errors.lab,
						onChange: this.validateNotEmpty('lab', 'Lab ID must not be empty'),
						onBlur: this.setField('lab') })
				),
				_react2.default.createElement(
					'div',
					null,
					_react2.default.createElement(_semanticUiReact.Input, { label: 'Key', defaultValue: this.state.assistant.key, error: this.state.errors.key,
						onChange: this.validateNotEmpty('key', 'Key must not be empty'),
						onBlur: this.setField('key'), style: { width: '23.5em' } })
				),
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ negative: true, onClick: () => this.deleteAssistant() },
					'Remove'
				)
			);
		}
	}
}

/**
 * Machines
 */

class Network extends _react2.default.Component {

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

		if (!this.state.name) {
			return null;
		}

		const ret = {
			name: this.state.name
		};

		if (this.props.machineType === 'virtualbox') {
			ret.type = this.state.type;

			if (this.state.promiscuous) {
				ret.promiscuous = true;
			}

			if (this.state.resetMac) {
				ret.resetMac = true;
			}

			if (this.state.ip) {
				ret.ip = this.state.ip;
			}
		}

		return ret;
	}

	validateNotEmpty(field, message) {
		return e => {
			this.setState({
				errors: {
					...this.state.errors,
					[field]: e.target.value.length < 1 ? message : undefined
				}
			});
		};
	}

	render() {
		const trigger = _react2.default.createElement(_semanticUiReact.Input, { defaultValue: this.state.name, icon: 'setting',
			error: this.state.errors.name,
			onChange: this.validateNotEmpty('name', 'Network name must not be empty'),
			onBlur: e => this.setState({ name: e.target.value }),
			autoFocus: this.props.autoFocus });

		const settings = this.props.machineType === 'virtualbox' ? _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(_semanticUiReact.Dropdown, { selection: true, fluid: true, defaultValue: this.state.type,
				options: [{ text: 'VirtualBox internal network', value: 'virtualbox' }, { text: 'Bridged', value: 'bridged' }], onChange: (e, data) => {
					this.setState({ type: data.value });
				} }),
			_react2.default.createElement(_semanticUiReact.Input, { label: 'IP:', defaultValue: this.state.ip, onBlur: e => this.setState({ ip: e.target.value }) }),
			_react2.default.createElement(_semanticUiReact.Checkbox, { toggle: true, label: 'Promiscuous', defaultChecked: this.state.promiscuous, onChange: (e, data) => {
					this.setState({ promiscuous: data.checked });
				} }),
			_react2.default.createElement(_semanticUiReact.Checkbox, { toggle: true, label: 'Reset MAC', defaultChecked: this.state.resetMac,
				onChange: (e, data) => this.setState({ resetMac: data.checked }) })
		) : _react2.default.createElement(_semanticUiReact.Dropdown, { selection: true, fluid: true, value: 'bridged', disabled: true,
			options: [{ text: 'Bridged', value: 'bridged' }] });

		return _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(_semanticUiReact.Popup, { hideOnScroll: true, trigger: trigger, content: settings, on: 'click', position: 'right center' }),
			_react2.default.createElement(
				_semanticUiReact.Button,
				{ negative: true, icon: true, onClick: this.props.onDelete },
				_react2.default.createElement(_semanticUiReact.Icon, { name: 'delete', style: { verticalAlign: 'middle' /* some bug in semantic? */ } })
			)
		);
	}
}

class Networks extends _react2.default.Component {

	constructor(props) {
		super();
		this.state = {
			networks: { ...props.networks },
			order: props.networks.map((n, i) => i),
			newIndex: props.networks.length
		};
	}

	getValue() {
		return this.state.order.map(i => this.refs['network-' + i].getValue());
	}

	addNetwork() {
		const index = this.state.newIndex + 1;
		const newOrder = [...this.state.order, index];
		const newNetworks = {
			...this.state.networks,
			[index]: {}
		};
		this.setState({
			newIndex: index,
			order: newOrder,
			networks: newNetworks
		});
	}

	deleteNetwork(index) {
		const newOrder = [...this.state.order];
		const newNetworks = { ...this.state.networks };

		const orderIndex = this.state.order.indexOf(index);
		delete newNetworks[index];

		if (orderIndex !== -1) {
			newOrder.splice(orderIndex, 1);
		}

		this.setState({
			order: newOrder,
			networks: newNetworks
		});
	}

	render() {
		const networks = this.state.order.map(i => _react2.default.createElement(Network, { ref: 'network-' + i, key: i,
			network: this.state.networks[i],
			onDelete: () => this.deleteNetwork(i),
			autoFocus: i === this.state.newIndex,
			machineType: this.props.machineType }));

		return _react2.default.createElement(
			'div',
			null,
			networks,
			_react2.default.createElement(
				_semanticUiReact.Button,
				{ positive: true, icon: true, onClick: () => this.addNetwork() },
				_react2.default.createElement(_semanticUiReact.Icon, { name: 'plus', size: 'large' })
			)
		);
	}
}

class MachineRepository extends _react2.default.Component {
	constructor(props) {
		super(props);
		this.state = {
			name: props.name || '',
			location: props.location || '',
			ref: props.gitRef || 'master'
		};
	}

	getValue() {
		if (!this.state.name || !this.state.location || !this.state.ref) {
			return null;
		}

		return {
			name: this.state.name,
			location: this.state.location,
			ref: this.state.ref
		};
	}

	validateName(name) {
		this.setState({
			nameInvalid: !/^[a-zA-Z0-9-_]+$/.test(name)
		});
	}

	validateLocation(location) {
		this.setState({
			locationInvalid: !/^\/.+$/.test(location)
		});
	}

	validateRef(ref) {
		this.setState({
			refInvalid: !/^[a-zA-Z0-9-_]+$/.test(ref)
		});
	}

	render() {
		return _react2.default.createElement(
			_semanticUiReact.Table.Row,
			null,
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(_semanticUiReact.Input, { defaultValue: this.state.name, error: this.state.nameInvalid, list: 'repositories',
					onChange: e => this.validateName(e.target.value),
					onBlur: e => this.setState({ name: e.target.value }),
					autoFocus: this.props.autoFocus, onFocus: loadRepositories, fluid: true })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(_semanticUiReact.Input, { defaultValue: this.state.location, error: this.state.locationInvalid,
					onChange: e => this.validateLocation(e.target.value),
					onBlur: e => this.setState({ location: e.target.value }), fluid: true })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(_semanticUiReact.Input, { defaultValue: this.state.ref, error: this.state.refInvalid,
					onChange: e => this.validateRef(e.target.value),
					onBlur: e => this.setState({ ref: e.target.value }), fluid: true })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ negative: true, icon: true, onClick: this.props.onDelete },
					_react2.default.createElement(_semanticUiReact.Icon, { name: 'delete' })
				)
			)
		);
	}
}

class MachineRepositories extends _react2.default.Component {
	constructor(props) {
		super();
		const repositories = props.repositories ? [...props.repositories] : [];
		this.state = {
			repositories: repositories,
			order: repositories.map((n, i) => i),
			newIndex: repositories.length,
			open: false,
			values: {}
		};
	}

	getValue() {
		const repositories = [];
		const values = [];
		for (const i of this.state.order) {
			let v;
			if ('repository-' + i in this.refs) {
				v = this.refs['repository-' + i].getValue();
			} else if (i in this.state.values) {
				v = this.state.values[i];
			} // else ¯\_(ツ)_/¯
			values[i] = v;
			if (v) {
				repositories.push(v);
			}
		}
		this.setState({
			values
		});
		return repositories.length ? repositories : undefined;
	}

	addRepository() {
		const index = this.state.newIndex + 1;
		const newOrder = [...this.state.order, index];
		const newRepositories = {
			...this.state.repositories,
			[index]: {}
		};
		this.setState({
			newIndex: index,
			order: newOrder,
			repositories: newRepositories
		});
	}

	deleteRepository(index) {
		const newOrder = [...this.state.order];
		const newRepositories = { ...this.state.repositories };
		const orderIndex = this.state.order.indexOf(index);
		delete newRepositories[index];
		if (orderIndex !== -1) {
			newOrder.splice(orderIndex, 1);
		}
		this.setState({
			order: newOrder,
			networks: newRepositories
		});
	}

	render() {
		const repositories = this.state.order.map(i => _react2.default.createElement(MachineRepository, {
			ref: 'repository-' + i, key: i,
			name: this.state.repositories[i].name,
			location: this.state.repositories[i].location,
			gitRef: this.state.repositories[i].ref,
			autoFocus: i === this.state.newIndex,
			onDelete: () => this.deleteRepository(i) }));

		return _react2.default.createElement(
			_semanticUiReact.Modal,
			{ trigger: _react2.default.createElement(
					_semanticUiReact.Button,
					{ color: 'teal' },
					'Repositories'
				), closeIcon: true, closeOnDimmerClick: false,
				onClose: () => this.getValue() },
			_react2.default.createElement(
				_semanticUiReact.Header,
				null,
				'Repositories'
			),
			_react2.default.createElement(
				_semanticUiReact.Modal.Content,
				null,
				_react2.default.createElement(
					_semanticUiReact.Table,
					null,
					_react2.default.createElement(
						_semanticUiReact.Table.Header,
						null,
						_react2.default.createElement(
							_semanticUiReact.Table.Row,
							null,
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								null,
								'Repository name'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								null,
								'Repository location in machine'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								null,
								'Ref'
							),
							_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null)
						)
					),
					_react2.default.createElement(
						_semanticUiReact.Table.Body,
						null,
						repositories
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ positive: true, onClick: () => this.addRepository(), autoFocus: true },
					'New'
				)
			)
		);
	}
}

class Machine extends _react2.default.Component {
	constructor(props) {
		super();
		this.state = {
			errors: {},
			machine: { type: 'virtualbox', ...props.machine }
		};

		if ('enable_token' in props.machine) {
			this.state.machine.enable_private = props.machine.enable_token;
			delete this.state.machine.enable_token;
		}
	}

	getValue() {
		return {
			...this.state.machine,
			networks: this.refs.networks.getValue(),
			repositories: 'repositories' in this.refs ? this.refs.repositories.getValue() : undefined
		};
	}

	setId(e) {
		const newId = e.target.value;
		const updated = this.props.onIdChange(newId);
		if (updated === false) {
			e.target.value = this.props.id;
			this.setState({
				errors: {
					...this.state.errors,
					id: undefined
				}
			});
		}
	}

	setMachineField(field, value) {
		this.setState({
			machine: {
				...this.state.machine,
				[field]: value
			}
		});
	}

	validateRegex(field, regex) {
		return e => {
			this.setState({
				errors: {
					...this.state.errors,
					[field]: regex.test(e.target.value) ? undefined : true
				}
			});
		};
	}

	render() {
		const machine = this.state.machine;
		const id = _react2.default.createElement(_semanticUiReact.Input, { fluid: true,
			defaultValue: this.props.id,
			autoFocus: this.props.autoFocus,
			onChange: this.validateRegex('id', /^[a-zA-Z0-9-_]+$/),
			error: this.state.errors.id,
			onFocus: e => e.target.select(),
			onBlur: e => this.setId(e),
			icon: machine.type === 'lxd' ? 'box' : 'desktop' });
		const description = _react2.default.createElement(_semanticUiReact.Input, { fluid: true,
			defaultValue: machine.description,
			onChange: this.validateRegex('description', /./),
			error: this.state.errors.description,
			onBlur: e => this.setMachineField('description', e.target.value) });
		const base = _react2.default.createElement(_semanticUiReact.Input, { fluid: true,
			list: machine.type === 'virtualbox' ? 'virtualbox-templates' : undefined,
			defaultValue: machine.base,
			error: this.state.errors.base,
			onChange: this.validateRegex('base', /[a-zA-Z0-9-_]+-template$/),
			onBlur: e => this.setMachineField('base', e.target.value), onFocus: loadTemplates });

		const createButton = (field, disabled = false) => {
			if (machine[field]) {
				return _react2.default.createElement(
					_semanticUiReact.Button,
					{ onClick: () => this.setMachineField(field, false), primary: true, icon: true, disabled: disabled },
					_react2.default.createElement(_semanticUiReact.Icon, {
						name: 'check' })
				);
			} else {
				return _react2.default.createElement(
					_semanticUiReact.Button,
					{ onClick: () => this.setMachineField(field, true), icon: true, disabled: disabled },
					_react2.default.createElement(_semanticUiReact.Icon, {
						name: 'circle' })
				);
			}
		};

		let primary;
		if (this.props.primary) {
			primary = _react2.default.createElement(_semanticUiReact.Icon, { name: 'star', size: 'big' });
		}

		return _react2.default.createElement(
			_semanticUiReact.Table.Row,
			null,
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ className: 'table-dragger-handle', collapsing: true },
				_react2.default.createElement(_semanticUiReact.Icon, { name: 'sort', size: 'big' })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ onClick: this.props.onPrimary, collapsing: true },
				primary
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				id
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				description
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				base
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				createButton('enable_autostart')
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				createButton('enable_private')
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				createButton('enable_remote', machine.type === 'lxd')
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				createButton('enable_restart')
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				_react2.default.createElement(Networks, { ref: 'networks', networks: machine.networks, machineType: machine.type })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				machine.type === 'lxd' && _react2.default.createElement(MachineRepositories, { ref: 'repositories', repositories: machine.repositories })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ negative: true, onClick: this.props.onDelete },
					'Delete'
				)
			)
		);
	}

}

class Machines extends _react2.default.Component {

	constructor(props) {
		super();
		this.state = {
			primary: props.primary,
			machines: { ...props.machines },
			machineOrder: [...props.machineOrder],
			keys: {}
		};

		for (let i = 0; i < props.machineOrder.length; i++) {
			this.state.keys[props.machineOrder[i]] = i;
		}

		templatesLoadPromise.then(templates => {
			this.setState({
				templates
			});
		});
	}

	getValue() {
		const ret = {
			machines: {},
			machineOrder: [...this.state.machineOrder],
			primaryMachine: this.state.primary
		};

		for (const id of this.state.machineOrder) {
			ret.machines[id] = this.refs['machine-' + id].getValue();
		}

		return ret;
	}

	createTableDragger() {
		if (this.tableDragger) {
			this.tableDragger.destroy();
		}
		try {
			const el = _reactDom2.default.findDOMNode(this).querySelector('table');
			this.tableDragger = (0, _tableDragger2.default)(el, {
				mode: 'row',
				dragHandler: '.table-dragger-handle',
				onlyBody: true,
				animation: 300
			}).on('drop', (from, to) => {
				// one-based?
				from--;
				to--;

				const newOrder = [...this.state.machineOrder];
				const index = newOrder.splice(from, 1);
				newOrder.splice(to, 0, index[0]);

				this.setState({
					machineOrder: newOrder
				});
			});
		} catch (e) {
			// ignored intentionally
		}
	}

	componentDidMount() {
		this.createTableDragger();
	}

	componentDidUpdate() {
		this.createTableDragger();
	}

	changeId(oldId) {
		return newId => {
			if (oldId === newId || newId === '' || this.state.machineOrder.includes(newId)) {
				return false;
			}

			const machines = { ...this.state.machines };
			const machineOrder = [...this.state.machineOrder];
			const keys = { ...this.state.keys };
			machines[newId] = machines[oldId];
			keys[newId] = keys[oldId];
			delete machines[oldId];
			delete keys[oldId];
			const orderIndex = machineOrder.indexOf(oldId);
			if (orderIndex !== -1) {
				machineOrder.splice(orderIndex, 1, newId);
			}
			let primary = this.state.primary;
			if (primary === oldId) {
				primary = newId;
			}
			this.setState({ machines, machineOrder, keys, primary });
		};
	}

	newMachine(type) {
		const machines = { ...this.state.machines };
		const machineOrder = [...this.state.machineOrder];
		const keys = { ...this.state.keys };
		const newId = Date.now().toString(16);
		machines[newId] = {
			type,
			description: '',
			base: '',
			networks: []
		};
		keys[newId] = Date.now();
		machineOrder.push(newId);
		this.setState({
			machines,
			machineOrder,
			keys,
			newMachine: newId
		});
	}

	deleteMachine(id) {
		return () => {
			const machines = { ...this.state.machines };
			const machineOrder = [...this.state.machineOrder];
			const keys = { ...this.state.keys };
			delete machines[id];
			delete keys[id];
			const orderIndex = machineOrder.indexOf(id);
			if (orderIndex >= 0) {
				machineOrder.splice(orderIndex, 1);
			}
			let primary = this.state.primary;
			if (primary === id) {
				primary = undefined;
			}
			this.setState({ machines, machineOrder, keys, primary });
		};
	}

	setPrimary(id) {
		return () => {
			this.setState({
				primary: id !== this.state.primary ? id : undefined
			});
		};
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (nextProps !== this.props) {
			return true;
		}

		if (nextState.machineOrder !== this.state.machineOrder) {
			return true;
		}

		if (nextState.templates !== this.state.templates) {
			return true;
		}

		return nextState.primary !== this.state.primary;
	}

	render() {
		if (this.state.machineOrder.length === 0) {
			return _react2.default.createElement(
				'div',
				null,
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ positive: true, onClick: () => this.newMachine('virtualbox') },
					'New machine'
				),
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ positive: true, onClick: () => this.newMachine('lxd') },
					'New container'
				)
			);
		}

		const machines = this.state.machineOrder.map(id => _react2.default.createElement(Machine, { ref: 'machine-' + id, key: this.state.keys[id],
			id: id,
			machine: this.state.machines[id],
			onIdChange: this.changeId(id),
			onDelete: this.deleteMachine(id),
			onPrimary: this.setPrimary(id),
			primary: this.state.primary === id,
			autoFocus: this.state.newMachine === id }));

		return _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				'datalist',
				{ id: 'virtualbox-templates' },
				'templates' in this.state && this.state.templates.map(t => _react2.default.createElement(
					'option',
					{ key: t },
					t
				))
			),
			_react2.default.createElement(
				_semanticUiReact.Table,
				null,
				_react2.default.createElement(
					_semanticUiReact.Table.Header,
					null,
					_react2.default.createElement(
						_semanticUiReact.Table.Row,
						null,
						_react2.default.createElement(_semanticUiReact.Table.HeaderCell, { collapsing: true }),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							{ collapsing: true },
							'Primary'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'ID'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'Description'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'Base template'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							{ width: 1 },
							'Autostart'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							{ width: 1 },
							'Private details'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							{ width: 1 },
							'Remote console'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							{ width: 1 },
							'Power control'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							{ collapsing: true },
							'Networks'
						),
						_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null),
						_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null)
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Table.Body,
					null,
					machines
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Button,
				{ positive: true, onClick: () => this.newMachine('virtualbox') },
				'New machine'
			),
			_react2.default.createElement(
				_semanticUiReact.Button,
				{ positive: true, onClick: () => this.newMachine('lxd') },
				'New container'
			)
		);
	}
}

/**
 * Repositories
 */
class Repositories extends _react2.default.Component {

	constructor(props) {
		super();
		this.state = {
			idErrors: {},
			nameErrors: {},
			repositories: {},
			order: [],
			newIndex: props.repositories.length
		};

		let counter = 0;
		for (const i in props.repositories) {
			this.state.repositories[counter] = { id: i, name: props.repositories[i] };
			this.state.order.push(counter++);
		}
		this.state.newIndex = counter;

		repositoriesLoadPromise.then(repositories => {
			this.setState({
				allRepositories: repositories
			});
		});
	}

	normalize() {
		const order = this.state.order.filter(i => this.state.repositories[i][0].length && this.state.repositories[i][1].length);
		this.setState({ order });
	}

	getValue() {
		const repositories = {};
		let hasRepositories = false;
		for (const i of this.state.order) {
			const repository = this.state.repositories[i];
			if (repository.id && repository.name && !(repository.id in repositories)) {
				repositories[repository.id] = repository.name;
				hasRepositories = true;
			}
		}
		return hasRepositories ? repositories : undefined;
	}

	addRepository() {
		const newIndex = ++this.state.newIndex;
		const order = [...this.state.order, newIndex];
		const repositories = { ...this.state.repositories, [newIndex]: { id: '', name: '' } };
		this.setState({ repositories, order, newIndex });
	}

	setRepository(id, field) {
		return e => {
			this.setState({
				repositories: {
					...this.state.repositories,
					[id]: {
						...this.state.repositories[id],
						[field]: e.target.value
					}
				}
			});
		};
	}

	validateId(id) {
		return e => {
			let invalid = false;
			if (!/^[a-zA-Z0-9_-]+$/.test(e.target.value)) {
				invalid = true;
			} else {
				for (const i of this.state.order) {
					if (i !== id) {
						if (this.state.repositories[i].id === e.target.value) {
							invalid = true;
							break;
						}
					}
				}
			}
			this.setState({
				idErrors: {
					...this.state.idErrors,
					[id]: invalid
				}
			});
		};
	}

	validateName(id) {
		return e => {
			this.setState({
				nameErrors: {
					...this.state.nameErrors,
					[id]: !/^[a-zA-Z0-9_-]+$/.test(e.target.value)
				}
			});
		};
	}

	render() {
		const repositories = this.state.order.map(i => _react2.default.createElement(
			_semanticUiReact.Table.Row,
			{ key: i },
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(_semanticUiReact.Input, { ref: 'repository-id-' + i,
					list: 'repositories',
					defaultValue: this.state.repositories[i].id,
					onBlur: this.setRepository(i, 'id'),
					onChange: this.validateId(i),
					autoFocus: i === this.state.newIndex,
					onFocus: loadRepositories,
					error: this.state.idErrors[i] })
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(_semanticUiReact.Input, { ref: 'repository-name-' + i,
					list: 'repositories',
					defaultValue: this.state.repositories[i].name,
					onBlur: this.setRepository(i, 'name'),
					onChange: this.validateName(i),
					onFocus: loadRepositories,
					error: this.state.nameErrors[i] })
			)
		));

		return _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				'datalist',
				{ id: 'repositories' },
				'allRepositories' in this.state && this.state.allRepositories.map(r => _react2.default.createElement(
					'option',
					{ key: r },
					r
				))
			),
			this.state.order.length ? _react2.default.createElement(
				_semanticUiReact.Table,
				{ collapsing: true },
				_react2.default.createElement(
					_semanticUiReact.Table.Header,
					null,
					_react2.default.createElement(
						_semanticUiReact.Table.Row,
						null,
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'ID'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'Name'
						)
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Table.Body,
					null,
					repositories
				)
			) : undefined,
			_react2.default.createElement(
				_semanticUiReact.Button,
				{ positive: true, onClick: () => this.addRepository() },
				'New'
			)
		);
	}
}

/**
 * Endpoints
 * TODO: disable duplicates
 */
class Endpoints extends _react2.default.Component {
	constructor(props) {
		super();
		this.state = {
			endpoints: { ...props.endpoints },
			order: props.endpoints.map((n, i) => i),
			newIndex: props.endpoints.length
		};
	}

	normalize() {
		const order = this.state.order.filter(i => this.state.endpoints[i].length);
		this.setState({ order });
	}

	getValue() {
		this.normalize();
		const endpoints = this.state.order.map(i => this.state.endpoints[i]);
		return endpoints.length ? endpoints : undefined;
	}

	addEndpoint() {
		const newIndex = ++this.state.newIndex;
		const order = [...this.state.order, newIndex];
		const endpoints = { ...this.state.endpoints, [newIndex]: '' };
		this.setState({ endpoints, order, newIndex });
	}

	setEndpoint(id) {
		return e => {
			if (e.target.value === '') {
				const order = [...this.state.order];
				const orderIndex = order.indexOf(id);
				if (orderIndex > -1) {
					order.splice(orderIndex, 1);
					this.setState({ order });
				}
			} else if (this.state.endpoints[id] !== e.target.value && this.state.order.find(id => this.state.endpoints[id] === e.target.value) === undefined) {
				const endpoints = { ...this.state.endpoints };
				endpoints[id] = e.target.value;
				this.setState({ endpoints });
			} else {
				e.target.value = this.state.endpoints[id];
			}
		};
	}

	render() {
		const endpoints = this.state.order.map(i => _react2.default.createElement(
			'div',
			{ key: i },
			_react2.default.createElement(_semanticUiReact.Input, { ref: 'endpoint-' + i,
				defaultValue: this.state.endpoints[i],
				onBlur: this.setEndpoint(i),
				autoFocus: i === this.state.newIndex })
		));

		return _react2.default.createElement(
			'div',
			null,
			endpoints,
			_react2.default.createElement(
				_semanticUiReact.Button,
				{ positive: true, onClick: () => this.addEndpoint() },
				'New'
			)
		);
	}
}

/**
 * Gitlab
 */
class Gitlab extends _react2.default.Component {

	constructor(props) {
		super();
		this.state = {
			gitlab: props.gitlab
		};
	}

	getValue() {
		return typeof this.state.gitlab === 'object' && this.state.gitlab ? { ...this.state.gitlab } : undefined;
	}

	createGitlab() {
		this.setState({
			gitlab: {
				url: '',
				key: ''
			}
		});
	}

	deleteGitlab() {
		this.setState({
			gitlab: undefined
		});
	}

	setField(field) {
		return e => {
			this.setState({
				gitlab: {
					...this.state.gitlab,
					[field]: e.target.value
				}
			});
		};
	}

	render() {
		if (typeof this.state.gitlab !== 'object' || !this.state.gitlab) {
			return _react2.default.createElement(
				_semanticUiReact.Button,
				{ color: 'yellow', onClick: () => this.createGitlab() },
				'Add'
			);
		} else {
			return _react2.default.createElement(
				'div',
				null,
				_react2.default.createElement(
					'div',
					null,
					_react2.default.createElement(_semanticUiReact.Input, { label: 'URL', defaultValue: this.state.gitlab.url, onBlur: this.setField('url'),
						style: { width: '28.5em' } })
				),
				_react2.default.createElement(
					'div',
					null,
					_react2.default.createElement(_semanticUiReact.Input, { label: 'Key', defaultValue: this.state.gitlab.key, onBlur: this.setField('key') })
				),
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ negative: true, onClick: () => this.deleteGitlab() },
					'Remove'
				)
			);
		}
	}
}

exports.default = class extends _react2.default.Component {

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
		if (this.state.loading) {
			return;
		}

		this.setState({ loading: 'save' });
		fetch('lab/' + encodeURIComponent(this.props.lab._id), {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': this.props.lab._rev },
			body: JSON.stringify(this.getValue())
		}).then(response => {
			if (response.ok) {
				window.location.href = 'lab';
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	render() {
		const lab = this.props.lab;

		const assistant = _react2.default.createElement(Assistant, { ref: 'assistant', assistant: lab.assistant });
		const machines = _react2.default.createElement(Machines, { ref: 'machines', machines: 'machines' in lab ? lab.machines : {},
			machineOrder: 'machineOrder' in lab ? lab.machineOrder : [],
			primary: lab.primaryMachine });
		const repositories = _react2.default.createElement(Repositories, { ref: 'repositories',
			repositories: 'repositories' in lab ? lab.repositories : {} });
		const endpoints = _react2.default.createElement(Endpoints, { ref: 'endpoints', endpoints: 'endpoints' in lab ? lab.endpoints : [] });
		const gitlab = _react2.default.createElement(Gitlab, { ref: 'gitlab', gitlab: lab.gitlab });

		return _react2.default.createElement(
			_semanticUiReact.Grid,
			null,
			_react2.default.createElement(
				_semanticUiReact.Grid.Column,
				null,
				_react2.default.createElement(
					_semanticUiReact.Header,
					{ color: 'teal', size: 'huge' },
					'Lab: ',
					lab._id
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Assistant ',
						_react2.default.createElement(
							_semanticUiReact.Popup,
							{ trigger: _react2.default.createElement(_semanticUiReact.Icon, { color: 'blue', name: 'info circle', size: 'tiny' }) },
							_react2.default.createElement(
								'p',
								null,
								'Virtual Teaching Assistant is proprietary software used to directly interact with end user.'
							),
							_react2.default.createElement(
								'p',
								null,
								'Lab manager can create VirtualTA lab instance and provide access to that instance to integrated applications.'
							)
						)
					),
					assistant
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Machines'
					),
					machines
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Repositories ',
						_react2.default.createElement(
							_semanticUiReact.Popup,
							{ trigger: _react2.default.createElement(_semanticUiReact.Icon, { color: 'blue', name: 'info circle', size: 'tiny' }) },
							_react2.default.createElement(
								'p',
								null,
								'Repositories which this lab has access to. ID is alias to repo (often equal to name), different labs can access to different repositories with same ID. Name is on-disk repository name.'
							)
						)
					),
					repositories
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Endpoints ',
						_react2.default.createElement(
							_semanticUiReact.Popup,
							{ trigger: _react2.default.createElement(_semanticUiReact.Icon, { color: 'blue', name: 'info circle', size: 'tiny' }) },
							_react2.default.createElement(
								'p',
								null,
								'This section configures endpoints exposed to user via lab proxy'
							)
						)
					),
					endpoints
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Gitlab'
					),
					gitlab
				),
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ primary: true, onClick: () => this.save(), disabled: !!this.state.loading },
					'Save'
				)
			)
		);
	}
};