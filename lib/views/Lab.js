import React from 'react';
import ReactDOM from 'react-dom';
import tableDragger from 'table-dragger';
import { Button, Checkbox, Dropdown, Grid, Header, Icon, Input, Modal, Popup, Segment, Table } from 'semantic-ui-react';


let templatesLoadPromiseResolve;
let needTemplates = true;
let templatesLoadPromise = new Promise(resolve => {
	templatesLoadPromiseResolve = resolve;
});

async function loadTemplates() {
	if(needTemplates) {
		needTemplates = false;
		const response = await fetch('machine?templates', {
			headers: { 'accept': 'application/json' }
		});
		if(response.ok) {
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
	if(needRepositories) {
		needRepositories = false;
		const response = await fetch('repository', {
			headers: { 'accept': 'application/json' }
		});
		if(response.ok) {
			response.json().then(body => {
				const repositories = {};
				for(const repository of body) {
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
class Assistant extends React.Component {

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
		if(typeof this.state.assistant !== 'object' || !this.state.assistant) {
			return <Button color="yellow" onClick={() => this.createAssistant()}>Add</Button>;
		} else {
			return <div>
				<div>
					<Input label="URL" defaultValue={this.state.assistant.url} error={this.state.errors.url}
					       onChange={this.validateNotEmpty('url', 'URL must not be empty')}
					       onBlur={this.setField('url')} style={{ width: '28.5em' }}/>
				</div>
				<div>
					<Input label="Lab ID" defaultValue={this.state.assistant.lab} error={this.state.errors.lab}
					       onChange={this.validateNotEmpty('lab', 'Lab ID must not be empty')}
					       onBlur={this.setField('lab')}/>
				</div>
				<div>
					<Input label="Key" defaultValue={this.state.assistant.key} error={this.state.errors.key}
					       onChange={this.validateNotEmpty('key', 'Key must not be empty')}
					       onBlur={this.setField('key')} style={{ width: '23.5em' }}/>
				</div>
				<Button negative onClick={() => this.deleteAssistant()}>Remove</Button>
			</div>;
		}
	}
}


/**
 * Machines
 */

class Network extends React.Component {

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

		if(!this.state.name) {
			return null;
		}

		const ret = {
			name: this.state.name
		};

		if(this.props.machineType === 'virtualbox') {
			ret.type = this.state.type;

			if(this.state.promiscuous) {
				ret.promiscuous = true;
			}

			if(this.state.resetMac) {
				ret.resetMac = true;
			}

			if(this.state.ip) {
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
		const trigger = <Input defaultValue={this.state.name} icon="setting"
		                       error={this.state.errors.name}
		                       onChange={this.validateNotEmpty('name', 'Network name must not be empty')}
		                       onBlur={e => this.setState({ name: e.target.value })}
		                       autoFocus={this.props.autoFocus}/>;

		const settings = this.props.machineType === 'virtualbox' ? <div>
				<Dropdown selection fluid defaultValue={this.state.type}
				          options={[
					          { text: 'VirtualBox internal network', value: 'virtualbox' },
					          { text: 'Bridged', value: 'bridged' }
				          ]} onChange={(e, data) => {
					this.setState({ type: data.value });
				}}/>
				<Input label="IP:" defaultValue={this.state.ip} onBlur={e => this.setState({ ip: e.target.value })}/>
				<Checkbox toggle label="Promiscuous" defaultChecked={this.state.promiscuous} onChange={(e, data) => {
					this.setState({ promiscuous: data.checked });
				}}/>
				<Checkbox toggle label="Reset MAC" defaultChecked={this.state.resetMac}
				          onChange={(e, data) => this.setState({ resetMac: data.checked })}/>
			</div>
			:
			<Dropdown selection fluid value="bridged" disabled
			          options={[{ text: 'Bridged', value: 'bridged' }]}/>;

		return <div>
			<Popup hideOnScroll trigger={trigger} content={settings} on="click" position="right center"/>
			<Button negative icon onClick={this.props.onDelete}>
				<Icon name="delete" style={{ verticalAlign: 'middle' } /* some bug in semantic? */}/>
			</Button>
		</div>;
	}
}


class Networks extends React.Component {

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

		if(orderIndex !== -1) {
			newOrder.splice(orderIndex, 1);
		}

		this.setState({
			order: newOrder,
			networks: newNetworks
		});
	}

	render() {
		const networks = this.state.order.map(i => <Network ref={'network-' + i} key={i}
		                                                    network={this.state.networks[i]}
		                                                    onDelete={() => this.deleteNetwork(i)}
		                                                    autoFocus={i === this.state.newIndex}
		                                                    machineType={this.props.machineType}/>);

		return <div>
			{networks}
			<Button positive icon onClick={() => this.addNetwork()}><Icon name="plus" size="large"/></Button>
		</div>;
	}
}


class MachineLimits extends React.Component {
	constructor(props) {
		super();
		const limits = props.limits || [];
		this.state = {
			cpu: limits.cpu || undefined,
			cpuAllowance: limits.cpuAllowance || 100,
			memory: limits.memory || undefined,
			errors: {}
		};
	}

	getValue() {
		if(this.state.cpu || this.state.cpuAllowance !== 100 || this.state.memory) {
			return {
				cpu: this.state.cpu || undefined,
				cpuAllowance: !this.state.cpuAllowance || this.state.cpuAllowance === 100
					? undefined : this.state.cpuAllowance,
				memory: this.state.memory || undefined
			}
		}
	}

	render() {
		return <Table collapsing>
			<Table.Body>
				<Table.Row>
					<Table.Cell collapsing>CPU:</Table.Cell>
					<Table.Cell><Input type='number' style={{width: '10em'}} defaultValue={this.state.cpu} onChange={e => this.setState({ cpu: Number(e.target.value) })}/></Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell collapsing>CPU Allowance:</Table.Cell>
					<Table.Cell><input type='range' min='1' max='100' defaultValue={this.state.cpuAllowance || '100'} onChange={e => this.setState({ cpuAllowance: Number(e.target.value) })}/> {this.state.cpuAllowance}%</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell collapsing>Memory:</Table.Cell>
					<Table.Cell><Input type='number' style={{width: '10em'}} defaultValue={this.state.memory} onChange={e => this.setState({ memory: Number(e.target.value) })}/> MiB</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table>;
	}
}


class MachineRepositories extends React.Component {
	constructor(props) {
		super();
		const repositories = props.repositories ? [...props.repositories] : [];
		this.state = {
			allRepositories: {},
			nameErrors: {},
			locationErrors: {},
			refErrors: {},
			repositories: { ...repositories },
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
		const repositories = [];
		for(const i of this.state.order) {
			repositories.push(this.state.repositories[i]);
		}
		return repositories.length ? repositories : undefined;
	}


	addRepository() {
		const newIndex = ++this.state.newIndex;
		const order = [...this.state.order, newIndex];
		const repositories = { ...this.state.repositories, [newIndex]: {} };
		this.setState({ repositories, order, newIndex });
	}

	deleteRepository(i) {
		const repositories = { ...this.state.repositories };
		const order = [...this.state.order];
		delete repositories[i];
		const orderIndex = order.indexOf(i);
		if(orderIndex >= 0) {
			order.splice(orderIndex, 1);
		}
		this.setState({ repositories, order });
	}

	setRepository(i, field) {
		return e => {
			this.setState({
				repositories: {
					...this.state.repositories,
					[i]: {
						...this.state.repositories[i],
						[field]: e.target.value
					}
				}
			});
		};
	}

	validateName(i) {
		return e => {
			this.setState({
				nameErrors: {
					...this.state.nameErrors,
					[i]: !/^[a-zA-Z0-9_-]+$/.test(e.target.value)
				}
			});
		};
	}

	validateLocation(i) {
		return e => {
			this.setState({
				locationErrors: {
					...this.state.locationErrors,
					[i]: !/^\/.+$/.test(e.target.value)
				}
			});
		};
	}

	validateRef(i) {
		return e => {
			this.setState({
				refErrors: {
					...this.state.refErrors,
					[i]: !/^[a-zA-Z0-9_/-]*$/.test(e.target.value)
				}
			});
		};
	}

	render() {
		const repositories = this.state.order.map(i => <Table.Row key={i}>
			<Table.Cell>
				<Input fluid list="repositories"
				       defaultValue={this.state.repositories[i].name}
				       onBlur={this.setRepository(i, 'name')}
				       onChange={this.validateName(i)}
				       autoFocus={i === this.state.newIndex}
				       onFocus={loadRepositories}
				       error={this.state.nameErrors[i]}/>
			</Table.Cell>
			<Table.Cell>
				<Input fluid defaultValue={this.state.repositories[i].location}
				       onBlur={this.setRepository(i, 'location')}
				       onChange={this.validateLocation(i)}
				       error={this.state.locationErrors[i]}/>
			</Table.Cell>
			<Table.Cell>
				<datalist id={'refs-' + i}>
					{(this.state.allRepositories[this.state.repositories[i].name] || [])
						.map(r => <option key={r}>{r}</option>)}
				</datalist>
				<Input fluid list={'refs-' + i}
				       defaultValue={this.state.repositories[i].ref}
				       onBlur={this.setRepository(i, 'ref')}
				       onChange={this.validateRef(i)}
				       onFocus={loadRepositories}
				       error={this.state.refErrors[i]}/>
			</Table.Cell>
			<Table.Cell collapsing>
				<Button icon negative onClick={() => this.deleteRepository(i)}><Icon name="delete"/></Button>
			</Table.Cell>
		</Table.Row>);

		return <div>
			<Table>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Repository name</Table.HeaderCell>
						<Table.HeaderCell>Repository location in machine</Table.HeaderCell>
						<Table.HeaderCell>Ref</Table.HeaderCell>
						<Table.HeaderCell/>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{repositories}
				</Table.Body>
			</Table>
			<Button positive onClick={() => this.addRepository()} autoFocus>New</Button>
		</div>;
	}
}


class Machine extends React.Component {
	constructor(props) {
		super();
		this.state = {
			errors: {},
			machine: { type: 'virtualbox', ...props.machine }
		};

		if('enable_token' in props.machine) {
			this.state.machine.enable_private = props.machine.enable_token;
			delete this.state.machine.enable_token;
		}
	}

	getValue() {
		return {
			...this.state.machine,
			networks: this.refs.networks.getValue(),
		};
	}

	setId(e) {
		const newId = e.target.value;
		const updated = this.props.onIdChange(newId);
		if(updated === false) {
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
		const id = <Input fluid
		                  defaultValue={this.props.id}
		                  autoFocus={this.props.autoFocus}
		                  onChange={this.validateRegex('id', /^[a-zA-Z0-9-_]+$/)}
		                  error={this.state.errors.id}
		                  onFocus={e => e.target.select()}
		                  onBlur={e => this.setId(e)}
		                  icon={machine.type === 'lxd' ? 'box' : 'desktop'}/>;
		const description = <Input fluid
		                           defaultValue={machine.description}
		                           onChange={this.validateRegex('description', /./)}
		                           error={this.state.errors.description}
		                           onBlur={e => this.setMachineField('description', e.target.value)}/>;
		const base = <Input fluid
		                    list={machine.type === 'virtualbox' ? 'virtualbox-templates' : undefined}
		                    defaultValue={machine.base}
		                    error={this.state.errors.base}
		                    onChange={this.validateRegex('base', /[a-zA-Z0-9-_]+-template$/)}
		                    onBlur={e => this.setMachineField('base', e.target.value)} onFocus={loadTemplates}/>;

		let containerConfigiration;
		if(machine.type === 'lxd') {
			containerConfigiration =
				<Modal trigger={<Button color="teal">Configure</Button>} closeIcon closeOnDimmerClick={false}
				       onClose={() => this.setState({
					       machine: {
						       ...this.state.machine,
						       limits: this.refs.limits.getValue(),
						       repositories: this.refs.repositories.getValue()
					       }
				       })}>
					<Header>Container configuration</Header>
					<Modal.Content>
						<Segment>
							<Header>Limits</Header>
							<MachineLimits ref="limits" limits={machine.limits}/>
						</Segment>
						<Segment>
							<Header>Repositories</Header>
							<MachineRepositories ref="repositories" repositories={machine.repositories}/>
						</Segment>
					</Modal.Content>
				</Modal>;
		}

		const createButton = (field, disabled = false) => {
			if(machine[field]) {
				return <Button onClick={() => this.setMachineField(field, false)} primary icon disabled={disabled}><Icon
					name="check"/></Button>;
			} else {
				return <Button onClick={() => this.setMachineField(field, true)} icon disabled={disabled}><Icon
					name="circle"/></Button>;
			}
		};

		let primary;
		if(this.props.primary) {
			primary = <Icon name="star" size="big"/>;
		}

		return <Table.Row>
			<Table.Cell className="table-dragger-handle" collapsing><Icon name="sort" size="big"/></Table.Cell>
			<Table.Cell onClick={this.props.onPrimary} collapsing>{primary}</Table.Cell>
			<Table.Cell>{id}</Table.Cell>
			<Table.Cell>{description}</Table.Cell>
			<Table.Cell>{base}</Table.Cell>
			<Table.Cell>{createButton('enable_autostart')}</Table.Cell>
			<Table.Cell>{createButton('enable_private')}</Table.Cell>
			<Table.Cell>{createButton('enable_remote', machine.type === 'lxd')}</Table.Cell>
			<Table.Cell>{createButton('enable_restart')}</Table.Cell>
			<Table.Cell collapsing>
				<Networks ref="networks" networks={machine.networks} machineType={machine.type}/>
			</Table.Cell>
			<Table.Cell collapsing>
				{containerConfigiration}
			</Table.Cell>
			<Table.Cell collapsing>
				<Button negative onClick={this.props.onDelete}>Delete</Button>
			</Table.Cell>
		</Table.Row>;
	}

}


class Machines extends React.Component {

	constructor(props) {
		super();
		this.state = {
			primary: props.primary,
			machines: { ...props.machines },
			machineOrder: [...props.machineOrder],
			keys: {}
		};

		for(let i = 0; i < props.machineOrder.length; i++) {
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

		for(const id of this.state.machineOrder) {
			ret.machines[id] = this.refs['machine-' + id].getValue();
		}

		return ret;
	}

	createTableDragger() {
		if(this.tableDragger) {
			this.tableDragger.destroy();
		}
		try {
			const el = ReactDOM.findDOMNode(this).querySelector('table');
			this.tableDragger = tableDragger(el, {
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
		} catch(e) {
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
			if(oldId === newId || newId === '' || this.state.machineOrder.includes(newId)) {
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
			if(orderIndex !== -1) {
				machineOrder.splice(orderIndex, 1, newId);
			}
			let primary = this.state.primary;
			if(primary === oldId) {
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
			if(orderIndex >= 0) {
				machineOrder.splice(orderIndex, 1);
			}
			let primary = this.state.primary;
			if(primary === id) {
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
		if(nextProps !== this.props) {
			return true;
		}

		if(nextState.machineOrder !== this.state.machineOrder) {
			return true;
		}

		if(nextState.templates !== this.state.templates) {
			return true;
		}

		return nextState.primary !== this.state.primary;
	}

	render() {
		if(this.state.machineOrder.length === 0) {
			return <div>
				<Button positive onClick={() => this.newMachine('virtualbox')}>New machine</Button>
				<Button positive onClick={() => this.newMachine('lxd')}>New container</Button>
			</div>;
		}

		const machines = this.state.machineOrder.map(id => <Machine ref={'machine-' + id} key={this.state.keys[id]}
		                                                            id={id}
		                                                            machine={this.state.machines[id]}
		                                                            onIdChange={this.changeId(id)}
		                                                            onDelete={this.deleteMachine(id)}
		                                                            onPrimary={this.setPrimary(id)}
		                                                            primary={this.state.primary === id}
		                                                            autoFocus={this.state.newMachine === id}/>);

		return <div>
			<datalist id="virtualbox-templates">
				{'templates' in this.state && this.state.templates.map(t => <option key={t}>{t}</option>)}
			</datalist>
			<Table>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell collapsing/>
						<Table.HeaderCell collapsing>Primary</Table.HeaderCell>
						<Table.HeaderCell>ID</Table.HeaderCell>
						<Table.HeaderCell>Description</Table.HeaderCell>
						<Table.HeaderCell>Base template</Table.HeaderCell>
						<Table.HeaderCell width={1}>Autostart</Table.HeaderCell>
						<Table.HeaderCell width={1}>Private details</Table.HeaderCell>
						<Table.HeaderCell width={1}>Remote console</Table.HeaderCell>
						<Table.HeaderCell width={1}>Power control</Table.HeaderCell>
						<Table.HeaderCell collapsing>Networks</Table.HeaderCell>
						<Table.HeaderCell/>
						<Table.HeaderCell/>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{machines}
				</Table.Body>
			</Table>
			<Button positive onClick={() => this.newMachine('virtualbox')}>New machine</Button>
			<Button positive onClick={() => this.newMachine('lxd')}>New container</Button>
		</div>;
	}
}


/**
 * Repositories
 */
class Repositories extends React.Component {

	constructor(props) {
		super();
		this.state = {
			allRepositories: {},
			idErrors: {},
			nameErrors: {},
			headErrors: {},
			repositories: {},
			order: [],
			newIndex: props.repositories.length
		};

		let counter = 0;
		for(const i in props.repositories) {
			this.state.repositories[counter] = {
				id: i,
				name: props.repositories[i].name,
				head: props.repositories[i].head
			};
			this.state.order.push(counter++);
		}
		this.state.newIndex = counter;

		repositoriesLoadPromise.then(repositories => {
			this.setState({
				allRepositories: repositories
			});
		});
	}

	getValue() {
		const repositories = {};
		let hasRepositories = false;
		for(const i of this.state.order) {
			const repository = this.state.repositories[i];
			if(repository.id && repository.name && !(repository.id in repositories)) {
				repositories[repository.id] = { name: repository.name };
				if(repository.head) {
					repositories[repository.id].head = repository.head;
				}
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

	deleteRepository(id) {
		const repositories = { ...this.state.repositories };
		const order = [...this.state.order];
		delete repositories[id];
		const orderIndex = order.indexOf(id);
		if(orderIndex >= 0) {
			order.splice(orderIndex, 1);
		}
		this.setState({ repositories, order });
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
			if(!/^[a-zA-Z0-9_-]+$/.test(e.target.value)) {
				invalid = true;
			} else {
				for(const i of this.state.order) {
					if(i !== id) {
						if(this.state.repositories[i].id === e.target.value) {
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

	validateHead(id) {
		return e => {
			this.setState({
				headErrors: {
					...this.state.headErrors,
					[id]: !/^[a-zA-Z0-9_/-]*$/.test(e.target.value)
				}
			});
		};
	}

	render() {
		const repositories = this.state.order.map(i => <Table.Row key={i}>
			<Table.Cell>
				<Input list="repositories"
				       defaultValue={this.state.repositories[i].id}
				       onBlur={this.setRepository(i, 'id')}
				       onChange={this.validateId(i)}
				       autoFocus={i === this.state.newIndex}
				       onFocus={loadRepositories}
				       error={this.state.idErrors[i]}/>
			</Table.Cell>
			<Table.Cell>
				<Input list="repositories"
				       defaultValue={this.state.repositories[i].name}
				       onBlur={this.setRepository(i, 'name')}
				       onChange={this.validateName(i)}
				       onFocus={loadRepositories}
				       error={this.state.nameErrors[i]}/>
			</Table.Cell>
			<Table.Cell>
				<datalist id={'refs-' + i}>
					{(this.state.allRepositories[this.state.repositories[i].name] || [])
						.map(r => <option key={r}>{r}</option>)}
				</datalist>
				<Input list={'refs-' + i}
				       defaultValue={this.state.repositories[i].head}
				       onBlur={this.setRepository(i, 'head')}
				       onChange={this.validateHead(i)}
				       onFocus={loadRepositories}
				       error={this.state.headErrors[i]}/>
			</Table.Cell>
			<Table.Cell>
				<Button icon negative onClick={() => this.deleteRepository(i)}><Icon name="delete"/></Button>
			</Table.Cell>
		</Table.Row>);

		return <div>
			<datalist id="repositories">
				{Object.keys(this.state.allRepositories).map(r => <option key={r}>{r}</option>)}
			</datalist>
			{this.state.order.length ? <Table collapsing>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>ID</Table.HeaderCell>
						<Table.HeaderCell>Name</Table.HeaderCell>
						<Table.HeaderCell>Head</Table.HeaderCell>
						<Table.HeaderCell/>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{repositories}
				</Table.Body>
			</Table> : undefined}
			<Button positive onClick={() => this.addRepository()}>New</Button>
		</div>;
	}
}


/**
 * Endpoints
 * TODO: disable duplicates
 */
class Endpoints extends React.Component {
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
			if(e.target.value === '') {
				const order = [...this.state.order];
				const orderIndex = order.indexOf(id);
				if(orderIndex > -1) {
					order.splice(orderIndex, 1);
					this.setState({ order });
				}
			} else if(this.state.endpoints[id] !== e.target.value && this.state.order.find(id => this.state.endpoints[id] === e.target.value) === undefined) {
				const endpoints = { ...this.state.endpoints };
				endpoints[id] = e.target.value;
				this.setState({ endpoints });
			} else {
				e.target.value = this.state.endpoints[id];
			}
		};
	}

	render() {
		const endpoints = this.state.order.map(i => <div key={i}><Input ref={'endpoint-' + i}
		                                                                defaultValue={this.state.endpoints[i]}
		                                                                onBlur={this.setEndpoint(i)}
		                                                                autoFocus={i === this.state.newIndex}/></div>);

		return <div>
			{endpoints}
			<Button positive onClick={() => this.addEndpoint()}>New</Button>
		</div>;
	}
}


/**
 * Gitlab
 */
class Gitlab extends React.Component {

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
		if(typeof this.state.gitlab !== 'object' || !this.state.gitlab) {
			return <Button color="yellow" onClick={() => this.createGitlab()}>Add</Button>;
		} else {
			return <div>
				<div>
					<Input label="URL" defaultValue={this.state.gitlab.url} onBlur={this.setField('url')}
					       style={{ width: '28.5em' }}/>
				</div>
				<div>
					<Input label="Key" defaultValue={this.state.gitlab.key} onBlur={this.setField('key')}/>
				</div>
				<Button negative onClick={() => this.deleteGitlab()}>Remove</Button>
			</div>;
		}
	}
}


export default class extends React.Component {

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
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'save' });
		fetch('lab/' + encodeURIComponent(this.props.lab._id), {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': this.props.lab._rev },
			body: JSON.stringify(this.getValue())
		})
			.then(response => {
				if(response.ok) {
					window.location.href = 'lab';
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const lab = this.props.lab;

		const assistant = <Assistant ref="assistant" assistant={lab.assistant}/>;
		const machines = <Machines ref="machines" machines={'machines' in lab ? lab.machines : {}}
		                           machineOrder={'machineOrder' in lab ? lab.machineOrder : []}
		                           primary={lab.primaryMachine}/>;
		const repositories = <Repositories ref="repositories"
		                                   repositories={'repositories' in lab ? lab.repositories : {}}/>;
		const endpoints = <Endpoints ref="endpoints" endpoints={'endpoints' in lab ? lab.endpoints : []}/>;
		const gitlab = <Gitlab ref="gitlab" gitlab={lab.gitlab}/>;

		return <Grid>
			<Grid.Column>
				<Header color="teal" size="huge">Lab: {lab._id}</Header>
				<Segment>
					<Header>
						Assistant <Popup trigger={<Icon color="blue" name="info circle" size="tiny"/>}>
						<p>
							Virtual Teaching Assistant is proprietary software used to directly interact with end user.
						</p>
						<p>
							Lab manager can create VirtualTA lab instance and provide access to that instance to
							integrated applications.
						</p>
					</Popup>
					</Header>
					{assistant}
				</Segment>
				<Segment>
					<Header>Machines</Header>
					{machines}
				</Segment>
				<Segment>
					<Header>
						Repositories <Popup trigger={<Icon color="blue" name="info circle" size="tiny"/>}>
						<p>
							Repositories which this lab has access to. ID is alias to repo (often equal to name),
							different labs can access to different repositories with same ID. Name is on-disk repository
							name.
						</p>
					</Popup>
					</Header>
					{repositories}
				</Segment>
				<Segment>
					<Header>
						Endpoints <Popup trigger={<Icon color="blue" name="info circle" size="tiny"/>}>
						<p>
							This section configures endpoints exposed to user via lab proxy
						</p>
					</Popup>
					</Header>
					{endpoints}
				</Segment>
				<Segment>
					<Header>Gitlab</Header>
					{gitlab}
				</Segment>
				<Button primary onClick={() => this.save()} disabled={!!this.state.loading}>Save</Button>
			</Grid.Column>
		</Grid>;
	}
}
