'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semanticUiReact = require('semantic-ui-react');

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Assistant(props) {
	if (typeof props.template !== 'object' || props.template === null) {
		return _react2.default.createElement(
			'i',
			null,
			'None'
		);
	}

	let userKey, link;
	if (typeof props.assistant === 'object' && props.assistant) {
		userKey = _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				_semanticUiReact.Label,
				{ size: 'big' },
				'User key: ',
				_react2.default.createElement(
					_semanticUiReact.Label.Detail,
					null,
					props.assistant.userKey
				)
			)
		);
		link = _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				_semanticUiReact.Label,
				{ size: 'big' },
				'Link: ',
				_react2.default.createElement(
					_semanticUiReact.Label.Detail,
					null,
					_react2.default.createElement(
						'a',
						{ href: props.assistant.link,
							target: '_blank' },
						props.assistant.link
					)
				)
			)
		);
	}

	if ('key' in props.template) {
		return _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				'div',
				null,
				_react2.default.createElement(
					_semanticUiReact.Label,
					{ size: 'big' },
					'URL: ',
					_react2.default.createElement(
						_semanticUiReact.Label.Detail,
						null,
						props.template.url
					)
				)
			),
			_react2.default.createElement(
				'div',
				null,
				_react2.default.createElement(
					_semanticUiReact.Label,
					{ size: 'big' },
					'Key: ',
					_react2.default.createElement(
						_semanticUiReact.Label.Detail,
						null,
						_react2.default.createElement(
							_util.SecretKey,
							null,
							props.template.key
						)
					)
				)
			),
			_react2.default.createElement(
				'div',
				null,
				_react2.default.createElement(
					_semanticUiReact.Label,
					{ size: 'big' },
					'Lab ID: ',
					_react2.default.createElement(
						_semanticUiReact.Label.Detail,
						null,
						props.template.lab
					)
				)
			),
			userKey,
			link
		);
	} else if (typeof props.assistant === 'object' && props.assistant && 'userKey' in props.assistant) {
		return _react2.default.createElement(
			'div',
			null,
			userKey,
			link
		);
	} else {
		return _react2.default.createElement(
			'i',
			null,
			'None'
		);
	}
}

class Machine extends _react2.default.Component {

	constructor(props) {
		super();
		this.state = {
			loading: null,
			machine: { ...props.machine }
		};
	}

	openRdp() {
		window.open(config.remote + '/' + encodeURIComponent(window.INIT_STATE.instanceToken) + ':' + encodeURIComponent(this.props.id));
	}

	setMachineState(state) {
		if (this.state.loading) {
			return;
		}

		this.setState({ loading: state });
		fetch('instance/' + encodeURIComponent(window.INIT_STATE.instanceToken) + '/machine/' + encodeURIComponent(this.props.id) + '?ip', {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': this.props.rev },
			body: JSON.stringify({ state })
		}).then(response => {
			if (response.ok) {
				return response.json().then(body => {
					this.setState({
						machine: body,
						loading: null
					});
				});
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	reload() {
		if (this.state.loading) {
			return;
		}

		this.setState({ loading: 'reload' });
		fetch('instance/' + encodeURIComponent(window.INIT_STATE.instanceToken) + '/machine/' + encodeURIComponent(this.props.id) + '?ip', {
			headers: { 'if-match': this.props.rev }
		}).then(response => {
			if (response.ok) {
				return response.json().then(body => {
					this.setState({
						machine: body,
						loading: null
					});
				});
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	render() {
		const machine = this.state.machine;
		const template = this.props.template;

		let primary;
		if (this.props.primary) {
			primary = _react2.default.createElement(_semanticUiReact.Icon, { name: 'star' });
		}

		let rdp;
		if ('rdp-port' in machine) {
			rdp = _react2.default.createElement(
				_semanticUiReact.Button,
				{ icon: true, color: 'blue', basic: true, onClick: () => this.openRdp() },
				'RDP: ',
				machine['rdp-port'],
				' ',
				_react2.default.createElement(_semanticUiReact.Icon, { name: 'external alternate' })
			);
		}

		let networks;
		if ('networks' in machine) {
			networks = machine.networks.map((network, i) => _react2.default.createElement(
				'div',
				{ key: i },
				network.name
			));
		}

		let stateButton;
		if (machine.state === 'poweroff' || machine.state === 'stopped') {
			stateButton = _react2.default.createElement(
				_semanticUiReact.Button,
				{ icon: true, primary: true, disabled: !!this.state.loading, loading: this.state.loading === 'running',
					onClick: () => this.setMachineState('running') },
				_react2.default.createElement(_semanticUiReact.Icon, { name: 'bolt' }),
				' Power on'
			);
		} else if (machine.state === 'running') {
			if (machine.type === 'virtualbox') {
				stateButton = _react2.default.createElement(
					_semanticUiReact.Button.Group,
					null,
					_react2.default.createElement(
						_semanticUiReact.Button,
						{ icon: true, color: 'yellow', disabled: !!this.state.loading,
							loading: this.state.loading === 'acpipowerbutton',
							onClick: () => this.setMachineState('acpipowerbutton') },
						_react2.default.createElement(_semanticUiReact.Icon, { name: 'power off' }),
						' Shutdown'
					),
					_react2.default.createElement(_semanticUiReact.Button.Or, null),
					_react2.default.createElement(
						_semanticUiReact.Button,
						{ icon: true, negative: true, disabled: !!this.state.loading, loading: this.state.loading === 'poweroff',
							onClick: () => this.setMachineState('poweroff') },
						_react2.default.createElement(_semanticUiReact.Icon, { name: 'plug' }),
						' Power off'
					)
				);
			} else {
				stateButton = _react2.default.createElement(
					_semanticUiReact.Button.Group,
					null,
					_react2.default.createElement(
						_semanticUiReact.Button,
						{ icon: true, negative: true, disabled: !!this.state.loading, loading: this.state.loading === 'poweroff',
							onClick: () => this.setMachineState('poweroff') },
						_react2.default.createElement(_semanticUiReact.Icon, { name: 'plug' }),
						' Power off'
					)
				);
			}
		} else {
			stateButton = _react2.default.createElement(
				_semanticUiReact.Button,
				{ disabled: true },
				'Unknown'
			);
		}

		const ip = [];
		if ('ip' in machine) {
			for (const iface in machine.ip) {
				if (ip.length >= 4) {
					ip.push(_react2.default.createElement(
						'p',
						{ key: iface },
						'...'
					));
					break;
				} else {
					ip.push(_react2.default.createElement(
						'p',
						{ key: iface },
						machine.ip[iface]
					));
				}
			}
		}

		const reload = _react2.default.createElement(
			_semanticUiReact.Button,
			{ icon: true, loading: this.state.loading === 'reload', disabled: !!this.state.loading,
				onClick: () => this.reload() },
			_react2.default.createElement(_semanticUiReact.Icon, { name: 'sync alternate' })
		);

		return _react2.default.createElement(
			_semanticUiReact.Table.Row,
			null,
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				primary
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				template.description
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				machine.name
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				template.base
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				networks
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				ip
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				rdp
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true, style: { textAlign: 'right' } },
				stateButton
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				reload
			)
		);
	}
}

function Machines(props) {
	if (!props.machineOrder || props.machineOrder.length === 0) {
		return _react2.default.createElement(
			'i',
			null,
			'None'
		);
	}

	const machines = props.machineOrder.map(id => _react2.default.createElement(Machine, { key: id, id: id, rev: props.rev,
		machine: props.machines[id],
		template: props.templates[id],
		primary: props.primary === id }));

	return _react2.default.createElement(
		'div',
		null,
		_react2.default.createElement(
			_semanticUiReact.Table,
			{ selectable: true },
			_react2.default.createElement(
				_semanticUiReact.Table.Header,
				null,
				_react2.default.createElement(
					_semanticUiReact.Table.Row,
					null,
					_react2.default.createElement(_semanticUiReact.Table.HeaderCell, { collapsing: true }),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						null,
						'Description'
					),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						null,
						'Name'
					),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						null,
						'Base template'
					),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						{ width: 3 },
						'Networks'
					),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						null,
						'IP-s'
					),
					_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null),
					_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null),
					_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null)
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Body,
				null,
				machines
			)
		)
	);
}

function Endpoints(props) {
	if (!Array.isArray(props.names)) {
		return _react2.default.createElement(
			'i',
			null,
			'None'
		);
	}

	function link(name) {
		const link = props.endpoints[name].link;
		if (link.startsWith('http:') || link.startsWith('https:')) {
			return _react2.default.createElement(
				'a',
				{ href: link, target: '_blank' },
				link
			);
		} else if (link.startsWith('ssh:')) {
			try {
				const [auth, port] = link.slice(6).split(':');
				return 'ssh ' + auth + ' -p' + port;
			} catch (e) {
				return link;
			}
		} else {
			return link;
		}
	}

	const endpoints = props.names.map(name => _react2.default.createElement(
		_semanticUiReact.Table.Row,
		{ key: name },
		_react2.default.createElement(
			_semanticUiReact.Table.Cell,
			null,
			name
		),
		_react2.default.createElement(
			_semanticUiReact.Table.Cell,
			null,
			props.endpoints[name].key
		),
		_react2.default.createElement(
			_semanticUiReact.Table.Cell,
			null,
			link(name)
		)
	));

	return _react2.default.createElement(
		'div',
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
						'Name'
					),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						null,
						'Key'
					),
					_react2.default.createElement(
						_semanticUiReact.Table.HeaderCell,
						null,
						'Link'
					)
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Body,
				null,
				endpoints
			)
		)
	);
}

function Gitlab(props) {
	if (typeof props.template !== 'object' || props.template === null) {
		return _react2.default.createElement(
			'i',
			null,
			'None'
		);
	}

	let groupLink, userLink;
	if (typeof props.gitlab === 'object' && props.gitlab !== null) {
		groupLink = _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				_semanticUiReact.Label,
				{ size: 'big' },
				'Group link: ',
				_react2.default.createElement(
					_semanticUiReact.Label.Detail,
					null,
					_react2.default.createElement(
						'a',
						{ target: '_blank', href: props.gitlab.group.link },
						props.gitlab.group.link
					)
				)
			)
		);

		userLink = _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				_semanticUiReact.Label,
				{ size: 'big' },
				'User link: ',
				_react2.default.createElement(
					_semanticUiReact.Label.Detail,
					null,
					_react2.default.createElement(
						'a',
						{ target: '_blank', href: props.gitlab.user.link },
						props.gitlab.user.link
					)
				)
			)
		);
	}

	let key;
	if ('key' in props.template) {
		key = _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				_semanticUiReact.Label,
				{ size: 'big' },
				'Key: ',
				_react2.default.createElement(
					_semanticUiReact.Label.Detail,
					null,
					_react2.default.createElement(
						_util.SecretKey,
						null,
						props.template.key
					)
				)
			)
		);
	}

	return _react2.default.createElement(
		'div',
		null,
		_react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				_semanticUiReact.Label,
				{ size: 'big' },
				'URL: ',
				_react2.default.createElement(
					_semanticUiReact.Label.Detail,
					null,
					_react2.default.createElement(
						'a',
						{ href: props.template.url, target: '_blank' },
						props.template.url
					)
				)
			)
		),
		key,
		groupLink,
		userLink
	);
}

function Timing(props) {
	function forEach(timing, cb, keys = []) {
		if (Array.isArray(timing)) {
			cb(keys, timing);
		} else {
			for (const i in timing) {
				forEach(timing[i], cb, [...keys, i]);
			}
		}
	}

	const startTime = new Date(props.startTime).getTime();

	let max = startTime;
	forEach(props.timing, (keys, timing) => {
		if (timing[1] > max) {
			max = timing[1];
		}
	});

	max -= startTime;
	let timing = [];

	forEach(props.timing, (keys, t) => {
		timing.push(_react2.default.createElement(
			_semanticUiReact.Table.Row,
			{ key: keys.join(': ') },
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ style: { fontWeight: 'body' } },
				keys.join(': ')
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(
					'span',
					{ style: {
							display: 'inline-block',
							width: (t[0] - startTime) / max * 80 + '%'
						} },
					t[0] - startTime
				),
				_react2.default.createElement(
					'span',
					{ style: {
							display: 'inline-block',
							width: (t[1] - t[0]) / max * 80 + '%',
							backgroundColor: 'lightgreen'
						} },
					t[1] - t[0]
				)
			)
		));
	});

	return _react2.default.createElement(
		_semanticUiReact.Table,
		{ compact: true },
		timing
	);
}

exports.default = class extends _react2.default.Component {
	constructor() {
		super();
		this.state = {
			loading: null
		};
	}

	deleteInstance() {
		if (this.state.loading) {
			return;
		}

		this.setState({ loading: 'delete' });
		fetch('lab/' + encodeURIComponent(this.props.instance.lab._id) + '/instance/' + encodeURIComponent(this.props.instance.username), {
			method: 'DELETE',
			headers: { 'if-match': this.props.instance._rev }
		}).then(response => {
			if (response.ok) {
				window.location.href = 'instance';
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	render() {
		const instance = this.props.instance;
		const lab = instance.lab;
		const startTime = new Date(instance.startTime);

		const assistant = _react2.default.createElement(Assistant, { assistant: instance.assistant, template: lab.assistant });
		const machines = _react2.default.createElement(Machines, { machines: instance.machines, templates: lab.machines, machineOrder: lab.machineOrder,
			primary: lab.primaryMachine, rev: instance._rev });
		const endpoints = _react2.default.createElement(Endpoints, { endpoints: instance.endpoints, names: lab.endpoints });
		const gitlab = _react2.default.createElement(Gitlab, { gitlab: instance.gitlab, template: lab.gitlab, publicToken: instance.publicToken });
		let deleteButton;
		if ('_id' in instance) {
			deleteButton = _react2.default.createElement(
				_semanticUiReact.Popup,
				{ on: 'click', position: 'top center', wide: true, hideOnScroll: true,
					trigger: _react2.default.createElement(
						_semanticUiReact.Button,
						{ negative: true, disabled: !!this.state.loading,
							loading: this.state.loading === 'delete', icon: true },
						_react2.default.createElement(_semanticUiReact.Icon, {
							name: 'trash' }),
						' Delete'
					) },
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ negative: true, onClick: () => this.deleteInstance() },
					'Confirm deletion'
				)
			);
		}

		return _react2.default.createElement(
			_semanticUiReact.Grid,
			null,
			_react2.default.createElement(
				_semanticUiReact.Grid.Column,
				null,
				_react2.default.createElement(
					_semanticUiReact.Header,
					{ color: 'teal', size: 'huge' },
					'Instance'
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					lab._id && _react2.default.createElement(
						'div',
						null,
						_react2.default.createElement(
							_semanticUiReact.Label,
							{ size: 'big' },
							'Lab: ',
							_react2.default.createElement(
								_semanticUiReact.Label.Detail,
								null,
								_react2.default.createElement(
									'a',
									{
										href: 'lab/' + encodeURIComponent(lab._id) },
									lab._id
								)
							)
						)
					),
					instance.username && _react2.default.createElement(
						'div',
						null,
						_react2.default.createElement(
							_semanticUiReact.Label,
							{ size: 'big' },
							'Username: ',
							_react2.default.createElement(
								_semanticUiReact.Label.Detail,
								null,
								instance.username
							)
						)
					),
					_react2.default.createElement(
						'div',
						null,
						_react2.default.createElement(
							_semanticUiReact.Label,
							{ size: 'big' },
							'Start time: ',
							_react2.default.createElement(
								_semanticUiReact.Label.Detail,
								null,
								startTime.toDateString(),
								' (',
								_react2.default.createElement(_util.TimeSince, { date: startTime }),
								')'
							)
						)
					),
					_react2.default.createElement(
						'div',
						null,
						_react2.default.createElement(
							_semanticUiReact.Label,
							{ size: 'big' },
							'Public token: ',
							_react2.default.createElement(
								_semanticUiReact.Label.Detail,
								null,
								_react2.default.createElement(
									'a',
									{ href: 'instance/' + encodeURIComponent(instance.publicToken) },
									instance.publicToken
								)
							)
						)
					),
					instance.privateToken && _react2.default.createElement(
						'div',
						null,
						_react2.default.createElement(
							_semanticUiReact.Label,
							{ size: 'big' },
							'Private token: ',
							_react2.default.createElement(
								_semanticUiReact.Label.Detail,
								null,
								_react2.default.createElement(
									_util.SecretKey,
									{ as: 'a',
										href: 'instance/' + encodeURIComponent(instance.privateToken) },
									instance.privateToken
								)
							)
						)
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Assistant'
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
						'Endpoints'
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
					_semanticUiReact.Segment,
					null,
					_react2.default.createElement(
						_semanticUiReact.Header,
						null,
						'Timing'
					),
					_react2.default.createElement(Timing, { startTime: instance.startTime, timing: instance.timing })
				),
				deleteButton
			)
		);
	}
};