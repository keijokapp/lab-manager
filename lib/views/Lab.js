import React from 'react';
import ReactDOM from 'react-dom';
import tableDragger from 'table-dragger';
import { Button, Checkbox, Dropdown, Grid, Header, Icon, Input, Modal, Popup, Segment, Table } from 'semantic-ui-react';


let templatesLoadPromiseResolve;
let needTemplates = true;
const templatesLoadPromise = new Promise(resolve => {
	templatesLoadPromiseResolve = resolve;
});

async function loadTemplates() {
	if (needTemplates) {
		needTemplates = false;
		const response = await fetch('machine?templates', {
			headers: { accept: 'application/json' }
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
			headers: { accept: 'application/json' }
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
class Assistant extends React.Component {
	constructor(props) {
		super();
		this.state = {
			errors: {},
			assistant: props.assistant
		};
	}

	getValue() {
		const { assistant } = this.state;
		return assistant ? { ...assistant } : undefined;
	}

	setField(field) {
		const { assistant } = this.state;
		return e => {
			this.setState({
				assistant: {
					...assistant,
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
			assistant: { url: '', lab: '', key: '' }
		});
	}

	validateNotEmpty(field, message) {
		return e => {
			const { errors } = this.state;
			this.setState({
				errors: {
					...errors,
					[field]: e.target.value.length < 1 ? message : undefined
				}
			});
		};
	}

	render() {
		const { assistant, errors } = this.state;

		if (typeof assistant !== 'object' || !assistant) {
			return <Button color="yellow" onClick={() => this.createAssistant()}>Add</Button>;
		}

		return (
			<div>
				<div>
					<Input label="URL" defaultValue={assistant.url} error={!!errors.url} onChange={this.validateNotEmpty('url', 'URL must not be empty')} onBlur={this.setField('url')} style={{ width: '28.5em' }} />
				</div>
				<div>
					<Input label="Lab ID" defaultValue={assistant.lab} error={!!errors.lab} onChange={this.validateNotEmpty('lab', 'Lab ID must not be empty')} onBlur={this.setField('lab')} />
				</div>
				<div>
					<Input label="Key" defaultValue={assistant.key} error={!!errors.key} onChange={this.validateNotEmpty('key', 'Key must not be empty')} onBlur={this.setField('key')} style={{ width: '23.5em' }} />
				</div>
				<Button negative onClick={() => this.deleteAssistant()}>Remove</Button>
			</div>
		);
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
		const { machineType } = this.props;
		const { type, name, promiscuous, resetMac, ip } = this.state;

		if (!name) {
			return null;
		}

		const ret = { name };

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
			const { errors } = this.state;
			this.setState({
				errors: {
					...errors,
					[field]: e.target.value.length < 1 ? message : undefined
				}
			});
		};
	}

	render() {
		const { machineType, autoFocus, onDelete } = this.props;
		const { type, name, ip, promiscuous, resetMac, errors } = this.state;

		const settings = machineType === 'virtualbox' ? (
			<div>
				<Dropdown
					selection fluid
					defaultValue={type}
					options={[
						{ text: 'VirtualBox internal network', value: 'virtualbox' },
						{ text: 'Bridged', value: 'bridged' }
					]}
					onChange={(e, data) => { this.setState({ type: data.value }); }}
				/>
				<Input
					label="IP:"
					defaultValue={ip}
					onBlur={e => this.setState({ ip: e.target.value })}
				/>
				<Checkbox
					toggle label="Promiscuous"
					defaultChecked={promiscuous}
					onChange={(e, data) => { this.setState({ promiscuous: data.checked }); }}
				/>
				<Checkbox
					toggle label="Reset MAC"
					defaultChecked={resetMac}
					onChange={(e, data) => this.setState({ resetMac: data.checked })}
				/>
			</div>
		) : (
			<Dropdown
				selection fluid
				value="bridged"
				disabled
				options={[{ text: 'Bridged', value: 'bridged' }]}
			/>
		);

		return (
			<div>
				<Popup
					position="right center" hideOnScroll
					on="click"
					trigger={(
						<Input
							icon="setting"
							error={!!errors.name}
							defaultValue={name}
							onChange={this.validateNotEmpty('name', 'Network name must not be empty')}
							onBlur={e => this.setState({ name: e.target.value })}
							autoFocus={autoFocus}
						/>
					)}
					content={settings}
				/>
				<Button negative icon onClick={onDelete}>
					<Icon name="delete" style={{ verticalAlign: 'middle' } /* some bug in semantic? */} />
				</Button>
			</div>
		);
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
		const { order } = this.state;
		return order.map(i => this.refs[`network-${i}`].getValue());
	}

	addNetwork() {
		const { newIndex, order, networks } = this.state;
		const index = newIndex + 1;
		this.setState({
			newIndex: index,
			order: [...order, index],
			networks: {
				...networks,
				[index]: {}
			}
		});
	}

	deleteNetwork(index) {
		const { order, networks } = this.state;
		const newOrder = [...order];
		const newNetworks = { ...networks };
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
		const { machineType } = this.props;
		const { order, networks, newIndex } = this.state;
		return (
			<div>
				{order.map(i => (
					<Network
						ref={`network-${i}`}
						key={i}
						network={networks[i]}
						onDelete={() => this.deleteNetwork(i)}
						autoFocus={i === newIndex}
						machineType={machineType}
					/>
				))}
				<Button positive icon onClick={() => this.addNetwork()}>
					<Icon name="plus" size="large" />
				</Button>
			</div>
		);
	}
}


class MachineLimits extends React.Component {
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
		const { cpu, cpuAllowance, memory } = this.state;
		if (cpu || cpuAllowance !== 100 || memory) {
			return {
				cpu: cpu || undefined,
				cpuAllowance: !cpuAllowance || cpuAllowance === 100 ? undefined : cpuAllowance,
				memory: memory || undefined
			};
		}
	}

	render() {
		const { cpu, cpuAllowance, memory } = this.state;
		return (
			<Table collapsing>
				<Table.Body>
					<Table.Row>
						<Table.Cell collapsing>CPU:</Table.Cell>
						<Table.Cell>
							<Input
								type="number"
								style={{ width: '10em' }}
								defaultValue={cpu}
								onChange={e => this.setState({ cpu: Number(e.target.value) })}
							/>
						</Table.Cell>
					</Table.Row>
					<Table.Row>
						<Table.Cell collapsing>CPU Allowance:</Table.Cell>
						<Table.Cell>
							<input
								type="range" min="1" max="100"
								defaultValue={cpuAllowance || '100'}
								onChange={e => this.setState({ cpuAllowance: Number(e.target.value) })}
							/>
							{`${cpuAllowance}%`}
						</Table.Cell>
					</Table.Row>
					<Table.Row>
						<Table.Cell collapsing>Memory:</Table.Cell>
						<Table.Cell>
							<Input
								type="number"
								style={{ width: '10em' }}
								defaultValue={memory}
								onChange={e => this.setState({ memory: Number(e.target.value) })}
							/>
							MiB
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table>
		);
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
		const { repositories } = this.state;
		if (!repositories.length) {
			return;
		}
		return repositories.map(i => repositories[i]);
	}

	setRepository(i, field) {
		return e => {
			const { repositories } = this.state;
			this.setState({
				repositories: {
					...repositories,
					[i]: {
						...repositories[i],
						[field]: e.target.value
					}
				}
			});
		};
	}

	deleteRepository(i) {
		const { repositories, order } = this.state;
		const newRepositories = { ...repositories };
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
		const { newIndex, order, repositories } = this.state;
		this.setState({
			repositories: { ...repositories, [newIndex + 1]: {} },
			order: [...order, newIndex],
			newIndex: newIndex + 1
		});
	}

	validateName(i) {
		return e => {
			const { nameErrors } = this.state;
			this.setState({
				nameErrors: {
					...nameErrors,
					[i]: !/^[a-zA-Z0-9_-]+$/.test(e.target.value)
				}
			});
		};
	}

	validateLocation(i) {
		return e => {
			const { locationErrors } = this.state;
			this.setState({
				locationErrors: {
					...locationErrors,
					[i]: !/^\/.+$/.test(e.target.value)
				}
			});
		};
	}

	validateRef(i) {
		return e => {
			const { refErrors } = this.state;
			this.setState({
				refErrors: {
					...refErrors,
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

		return (
			<div>
				<Table>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>Repository name</Table.HeaderCell>
							<Table.HeaderCell>Repository location in machine</Table.HeaderCell>
							<Table.HeaderCell>Ref</Table.HeaderCell>
							<Table.HeaderCell />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{order.map(i => (
							<Table.Row key={i}>
								<Table.Cell>
									<Input
										fluid
										list="repositories"
										defaultValue={repositories[i].name}
										onBlur={this.setRepository(i, 'name')}
										onChange={this.validateName(i)}
										autoFocus={i === newIndex}
										onFocus={loadRepositories} error={nameErrors[i]}
									/>
								</Table.Cell>
								<Table.Cell>
									<Input
										fluid
										defaultValue={repositories[i].location}
										onBlur={this.setRepository(i, 'location')}
										onChange={this.validateLocation(i)} error={locationErrors[i]}
									/>
								</Table.Cell>
								<Table.Cell>
									<datalist id={`refs-${i}`}>
										{repositories[i].name in allRepositories
										&& allRepositories[repositories[i].name].map(r => <option key={r}>{r}</option>)}
									</datalist>
									<Input fluid list={`refs-${i}`} WdefaultValue={repositories[i].ref} onBlur={this.setRepository(i, 'ref')} onChange={this.validateRef(i)} onFocus={loadRepositories} error={refErrors[i]} />
								</Table.Cell>
								<Table.Cell collapsing>
									<Button icon negative onClick={() => this.deleteRepository(i)}><Icon name="delete" /></Button>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
				<Button positive onClick={() => this.addRepository()} autoFocus>New</Button>
			</div>
		);
	}
}


class Machine extends React.Component {
	constructor(props) {
		super();
		const machine = { type: 'virtualbox', ...props.machine };
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
		const { machine } = this.state;
		return {
			...machine,
			networks: this.refs.networks.getValue()
		};
	}

	setId(e) {
		const { onIdChange, id } = this.props;
		const { errors } = this.state;
		const newId = e.target.value;
		const updated = onIdChange(newId);
		if (updated === false) {
			e.target.value = id;
			this.setState({
				errors: {
					...errors,
					id: undefined
				}
			});
		}
	}

	setMachineField(field, value) {
		const { machine } = this.state;
		this.setState({
			machine: {
				...machine,
				[field]: value
			}
		});
	}

	validateRegex(field, regex) {
		return e => {
			const { errors } = this.state;
			this.setState({
				errors: {
					...errors,
					[field]: !regex.test(e.target.value)
				}
			});
		};
	}

	render() {
		const { id, primary, autoFocus, onPrimary, onDelete } = this.props;
		const { machine, errors } = this.state;
		const idNode = <Input fluid defaultValue={id} autoFocus={autoFocus} onChange={this.validateRegex('id', /^[a-zA-Z0-9-_]+$/)} error={errors.id} onFocus={e => e.target.select()} onBlur={e => this.setId(e)} icon={machine.type === 'lxd' ? 'box' : 'desktop'} />;
		const description = <Input fluid defaultValue={machine.description} onChange={this.validateRegex('description', /./)} error={errors.description} onBlur={e => this.setMachineField('description', e.target.value)} />;
		const base = <Input fluid list={machine.type === 'virtualbox' ? 'virtualbox-templates' : undefined} defaultValue={machine.base} error={errors.base} onChange={this.validateRegex('base', /[a-zA-Z0-9-_]+-template$/)} onBlur={e => this.setMachineField('base', e.target.value)} onFocus={loadTemplates} />;

		let containerConfigiration;
		if (machine.type === 'lxd') {
			containerConfigiration = (
				<Modal
					closeIcon closeOnDimmerClick={false} trigger={<Button color="teal">Configure</Button>}
					onClose={() => {
						const { machine } = this.state;
						this.setState({
							machine: {
								...machine,
								limits: this.refs.limits.getValue(),
								repositories: this.refs.repositories.getValue()
							}
						});
					}}
				>
					<Header>Container configuration</Header>
					<Modal.Content>
						<Segment>
							<Header>Limits</Header>
							<MachineLimits ref="limits" limits={machine.limits} />
						</Segment>
						<Segment>
							<Header>Repositories</Header>
							<MachineRepositories ref="repositories" repositories={machine.repositories} />
						</Segment>
					</Modal.Content>
				</Modal>
			);
		}

		const createButton = (field, disabled = false) => {
			return (
				<Button
					primary={!!machine[field]} icon disabled={disabled}
					onClick={() => this.setMachineField(field, !machine[field])}
				>
					<Icon name={machine[field] ? 'check' : 'circle'} />
				</Button>
			);
		};

		return (
			<Table.Row>
				<Table.Cell className="table-dragger-handle" collapsing><Icon name="sort" size="big" /></Table.Cell>
				<Table.Cell onClick={onPrimary} collapsing>{!!primary && <Icon name="star" size="big" />}</Table.Cell>
				<Table.Cell>{idNode}</Table.Cell>
				<Table.Cell>{description}</Table.Cell>
				<Table.Cell>{base}</Table.Cell>
				<Table.Cell>{createButton('enable_autostart')}</Table.Cell>
				<Table.Cell>{createButton('enable_private')}</Table.Cell>
				<Table.Cell>{createButton('enable_remote', machine.type === 'lxd')}</Table.Cell>
				<Table.Cell>{createButton('enable_restart')}</Table.Cell>
				<Table.Cell collapsing>
					<Networks ref="networks" networks={machine.networks} machineType={machine.type} />
				</Table.Cell>
				<Table.Cell collapsing>
					{containerConfigiration}
				</Table.Cell>
				<Table.Cell collapsing>
					<Button negative onClick={onDelete}>Delete</Button>
				</Table.Cell>
			</Table.Row>
		);
	}
}


class Machines extends React.Component {
	constructor(props) {
		super();

		const keys = {};
		for (let i = 0; i < props.machineOrder.length; i++) {
			keys[props.machineOrder[i]] = i;
		}

		this.state = {
			primary: props.primary,
			machines: { ...props.machines },
			machineOrder: [...props.machineOrder],
			keys
		};

		templatesLoadPromise.then(templates => {
			this.setState({ templates });
		});
	}

	componentDidMount() {
		this.createTableDragger();
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (nextProps !== this.props) {
			return true;
		}

		const { machineOrder, templates, primary } = this.state;

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
		const { machineOrder, primary } = this.state;

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
			const { primary } = this.state;
			this.setState({
				primary: id !== primary ? id : undefined
			});
		};
	}

	deleteMachine(id) {
		return () => {
			const { machines, machineOrder, keys, primary } = this.state;
			const newMachines = { ...machines };
			const newMachineOrder = [...machineOrder];
			const newKeys = { ...keys };
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
		const { machines, machineOrder, keys } = this.state;
		const newMachines = { ...machines };
		const newMachineOrder = [...machineOrder];
		const newKeys = { ...keys };
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
			const { machines, machineOrder, keys, primary } = this.state;
			if (oldId === newId || newId === '' || machineOrder.includes(newId)) {
				return false;
			}
			const newMachines = { ...machines };
			const newMachineOrder = [...machineOrder];
			const newKeys = { ...keys };
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
			const el = ReactDOM.findDOMNode(this).querySelector('table');
			this.tableDragger = tableDragger(el, {
				mode: 'row',
				dragHandler: '.table-dragger-handle',
				onlyBody: true,
				animation: 300
			}).on('drop', (from, to) => {
				const { machineOrder } = this.state;
				from--;
				to--;
				const newOrder = [...machineOrder];
				const index = newOrder.splice(from, 1);
				newOrder.splice(to, 0, index[0]);
				this.setState({ machineOrder: newOrder });
			});
		} catch (e) {
			// ignored intentionally
		}
	}

	render() {
		const { machines, machineOrder, primary, keys, newMachine, templates } = this.state;

		if (machineOrder.length === 0) {
			return (
				<div>
					<Button positive onClick={() => this.newMachine('virtualbox')}>New machine</Button>
					<Button positive onClick={() => this.newMachine('lxd')}>New container</Button>
				</div>
			);
		}

		return (
			<div>
				<datalist id="virtualbox-templates">
					{templates ? templates.map(t => <option key={t}>{t}</option>) : undefined}
				</datalist>
				<Table>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell collapsing />
							<Table.HeaderCell collapsing>Primary</Table.HeaderCell>
							<Table.HeaderCell>ID</Table.HeaderCell>
							<Table.HeaderCell>Description</Table.HeaderCell>
							<Table.HeaderCell>Base template</Table.HeaderCell>
							<Table.HeaderCell width={1}>Autostart</Table.HeaderCell>
							<Table.HeaderCell width={1}>Private details</Table.HeaderCell>
							<Table.HeaderCell width={1}>Remote console</Table.HeaderCell>
							<Table.HeaderCell width={1}>Power control</Table.HeaderCell>
							<Table.HeaderCell collapsing>Networks</Table.HeaderCell>
							<Table.HeaderCell />
							<Table.HeaderCell />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{machineOrder.map(id => <Machine ref={`machine-${id}`} key={keys[id]} id={id} machine={machines[id]} onIdChange={this.changeId(id)} onDelete={this.deleteMachine(id)} onPrimary={this.setPrimary(id)} primary={primary === id} autoFocus={newMachine === id} />)}
					</Table.Body>
				</Table>
				<Button positive onClick={() => this.newMachine('virtualbox')}>New machine</Button>
				<Button positive onClick={() => this.newMachine('lxd')}>New container</Button>
			</div>
		);
	}
}


/**
 * Repositories
 */
class Repositories extends React.Component {
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
		const { order, repositories } = this.state;
		const value = {};
		let hasRepositories = false;
		for (const i of order) {
			const repository = repositories[i];
			if (repository.id && repository.name && !(repository.id in value)) {
				value[repository.id] = { name: repository.name };
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
			const { repositories } = this.state;
			this.setState({
				repositories: {
					...repositories,
					[id]: {
						...repositories[id],
						[field]: e.target.value
					}
				}
			});
		};
	}

	deleteRepository(id) {
		const { repositories, order } = this.state;
		const newRepositories = { ...repositories };
		const newOrder = [...order];
		delete newRepositories[id];
		const orderIndex = newOrder.indexOf(id);
		if (orderIndex >= 0) {
			newOrder.splice(orderIndex, 1);
		}
		this.setState({ repositories: newRepositories, order: newOrder });
	}

	addRepository() {
		const { order, repositories, newIndex } = this.state;
		const index = newIndex + 1;
		this.setState({
			repositories: { ...repositories, [index]: { id: '', name: '' } },
			order: [...order, index],
			newIndex: index
		});
	}

	validateId(id) {
		return e => {
			const { order, repositories, idErrors } = this.state;
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
				idErrors: {
					...idErrors,
					[id]: invalid
				}
			});
		};
	}

	validateName(id) {
		return e => {
			const { nameErrors } = this.state;
			this.setState({
				nameErrors: {
					...nameErrors,
					[id]: !/^[a-zA-Z0-9_-]+$/.test(e.target.value)
				}
			});
		};
	}

	validateHead(id) {
		return e => {
			const { headErrors } = this.state;
			this.setState({
				headErrors: {
					...headErrors,
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

		return (
			<div>
				<datalist id="repositories">
					{Object.keys(allRepositories).map(r => <option key={r}>{r}</option>)}
				</datalist>
				{order.length !== 0 && (
					<Table collapsing>
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell>ID</Table.HeaderCell>
								<Table.HeaderCell>Name</Table.HeaderCell>
								<Table.HeaderCell>Head</Table.HeaderCell>
								<Table.HeaderCell />
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{order.map(i => (
								<Table.Row key={i}>
									<Table.Cell>
										<Input
											list="repositories"
											defaultValue={repositories[i].id}
											onBlur={this.setRepository(i, 'id')}
											onChange={this.validateId(i)}
											autoFocus={i === newIndex}
											onFocus={loadRepositories}
											error={idErrors[i]}
										/>
									</Table.Cell>
									<Table.Cell>
										<Input
											list="repositories"
											defaultValue={repositories[i].name}
											onBlur={this.setRepository(i, 'name')}
											onChange={this.validateName(i)}
											onFocus={loadRepositories}
											error={nameErrors[i]}
										/>
									</Table.Cell>
									<Table.Cell>
										<datalist id={`refs-${i}`}>
											{repositories[i].name in allRepositories
											&& allRepositories[repositories[i].name].map(r => (
												<option key={r}>{r}</option>
											))}
										</datalist>
										<Input
											list={`refs-${i}`}
											defaultValue={repositories[i].head}
											onBlur={this.setRepository(i, 'head')}
											onChange={this.validateHead(i)}
											onFocus={loadRepositories}
											error={headErrors[i]}
										/>
									</Table.Cell>
									<Table.Cell>
										<Button icon negative onClick={() => this.deleteRepository(i)}>
											<Icon name="delete" />
										</Button>
									</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table>
				)}
				<Button positive onClick={() => this.addRepository()}>New</Button>
			</div>
		);
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

	getValue() {
		const { order, endpoints } = this.state;
		this.normalize();
		return order.length ? order.map(i => endpoints[i]) : undefined;
	}

	setEndpoint(id) {
		return e => {
			const { order, endpoints } = this.state;
			if (e.target.value === '') {
				const orderIndex = order.indexOf(id);
				if (orderIndex > -1) {
					const newOrder = [...order];
					newOrder.splice(orderIndex, 1);
					this.setState({ order: newOrder });
				}
			} else if (endpoints[id] !== e.target.value
				&& !order.some(id => endpoints[id] === e.target.value)) {
				const newEndpoints = { ...endpoints };
				newEndpoints[id] = e.target.value;
				this.setState({ endpoints: newEndpoints });
			} else {
				e.target.value = endpoints[id];
			}
		};
	}

	addEndpoint() {
		const { newIndex, order, endpoints } = this.state;
		const index = newIndex + 1;
		this.setState({
			endpoints: { ...endpoints, [index]: '' },
			order: [...order, index],
			newIndex: index
		});
	}

	normalize() {
		const { order, endpoints } = this.state;
		this.setState({
			order: order.filter(i => endpoints[i].length)
		});
	}

	render() {
		const { order, endpoints, newIndex } = this.state;
		return (
			<div>
				{order.map(i => (
					<div key={i}>
						<Input
							ref={`endpoint-${i}`}
							defaultValue={endpoints[i]}
							onBlur={this.setEndpoint(i)}
							autoFocus={i === newIndex}
						/>
					</div>
				))}
				<Button positive onClick={() => this.addEndpoint()}>New</Button>
			</div>
		);
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
		const { gitlab } = this.state;
		return typeof gitlab === 'object' && gitlab ? { ...gitlab } : undefined;
	}

	setField(field) {
		return e => {
			const { gitlab } = this.state;
			this.setState({
				gitlab: {
					...gitlab,
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
			gitlab: { url: '', key: '' }
		});
	}

	render() {
		const { gitlab } = this.state;
		if (typeof gitlab !== 'object' || !gitlab) {
			return <Button color="yellow" onClick={() => this.createGitlab()}>Add</Button>;
		}
		return (
			<div>
				<div>
					<Input label="URL" defaultValue={gitlab.url} onBlur={this.setField('url')} style={{ width: '28.5em' }} />
				</div>
				<div>
					<Input label="Key" defaultValue={gitlab.key} onBlur={this.setField('key')} />
				</div>
				<Button negative onClick={() => this.deleteGitlab()}>Remove</Button>
			</div>
		);
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
		const { lab } = this.props;
		const { loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: 'save' });
		fetch(`lab/${encodeURIComponent(lab._id)}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': lab._rev },
			body: JSON.stringify(this.getValue())
		})
			.then(response => {
				if (response.ok) {
					window.location.href = 'lab';
				} else {
					this.setState({ loading: null });
				}
			}, e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const { lab } = this.props;
		const { loading } = this.state;
		return (
			<Grid>
				<Grid.Column>
					<Header color="teal" size="huge">{`Lab: ${lab._id}`}</Header>
					<Segment>
						<Header>
							Assistant
							<Popup trigger={<Icon color="blue" name="info circle" size="tiny" />}>
								<p>
									Virtual Teaching Assistant is proprietary software used to directly interact with
									end user.
								</p>
								<p>
									Lab manager can create VirtualTA lab instance and provide access to that instance
									to integrated applications.
								</p>
							</Popup>
						</Header>
						<Assistant ref="assistant" assistant={lab.assistant} />
					</Segment>
					<Segment>
						<Header>Machines</Header>
						<Machines
							ref="machines"
							machines={'machines' in lab ? lab.machines : {}}
							machineOrder={'machineOrder' in lab ? lab.machineOrder : []}
							primary={lab.primaryMachine}
						/>
					</Segment>
					<Segment>
						<Header>
							Repositories
							<Popup trigger={<Icon color="blue" name="info circle" size="tiny" />}>
								<p>
									Repositories which this lab has access to. ID is alias to repo (often equal to
									name), different labs can access to different repositories with same ID. Name is
									on-disk repository
									name.
								</p>
							</Popup>
						</Header>
						<Repositories ref="repositories" repositories={'repositories' in lab ? lab.repositories : {}} />
					</Segment>
					<Segment>
						<Header>
							Endpoints
							<Popup trigger={<Icon color="blue" name="info circle" size="tiny" />}>
								<p>
									This section configures endpoints exposed to user via lab proxy
								</p>
							</Popup>
						</Header>
						<Endpoints ref="endpoints" endpoints={'endpoints' in lab ? lab.endpoints : []} />
					</Segment>
					<Segment>
						<Header>Gitlab</Header>
						<Gitlab ref="gitlab" gitlab={lab.gitlab} />
					</Segment>
					<Button primary onClick={() => this.save()} disabled={!!loading}>Save</Button>
				</Grid.Column>
			</Grid>
		);
	}
}
