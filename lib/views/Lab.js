import React, { useState, useEffect, useRef, createRef } from 'react';
import tableDragger from 'table-dragger';
import { Button, Checkbox, Dropdown, Grid, Header, Icon, Input, Popup, Segment, Table } from 'semantic-ui-react';

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
function Assistant({ assistant: initialAssistant, valueRef }) {
	const [errors, setErrors] = useState({});
	const [assistant, setAssistant] = useState(initialAssistant);

	useEffect(() => {
		valueRef.current = () => {
			return assistant ? { ...assistant } : undefined;
		};
	});

	function setField(field) {
		return e => {
			setAssistant({
				...assistant,
				[field]: e.target.value
			});
		};
	}

	function deleteAssistant() {
		setErrors({});
		setAssistant(undefined);
	}

	function createAssistant() {
		setAssistant({ url: '', lab: '', key: '' });
	}

	function validateNotEmpty(field, message) {
		return e => {
			setErrors({
				...errors,
				[field]: e.target.value.length < 1 ? message : undefined
			});
		};
	}

	if (!assistant) {
		return <Button color="yellow" onClick={() => createAssistant()}>Add</Button>;
	}

	return (
		<div>
			<div>
				<Input label="URL" defaultValue={assistant.url} error={!!errors.url} onChange={validateNotEmpty('url', 'URL must not be empty')} onBlur={setField('url')} style={{ width: '28.5em' }} />
			</div>
			<div>
				<Input label="Lab ID" defaultValue={assistant.lab} error={!!errors.lab} onChange={validateNotEmpty('lab', 'Lab ID must not be empty')} onBlur={setField('lab')} />
			</div>
			<div>
				<Input label="Key" defaultValue={assistant.key} error={!!errors.key} onChange={validateNotEmpty('key', 'Key must not be empty')} onBlur={setField('key')} style={{ width: '23.5em' }} />
			</div>
			<Button negative onClick={() => deleteAssistant()}>Remove</Button>
		</div>
	);
}

/**
 * Machines
 */
function Network({ machineType, network, autoFocus, onDelete, valueRef }) {
	const [nameEmpty, setNameEmpty] = useState(false);
	const [type, setType] = useState(network.type || 'virtualbox');
	const [name, setName] = useState(network.name || '');
	const [promiscuous, setPromiscuous] = useState(!!network.promiscuous);
	const [resetMac, setResetMac] = useState(!!network.resetMac);
	const [ip, setIp] = useState(network.ip || '');

	useEffect(() => {
		valueRef.current = () => {
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
		};
	});

	const settings = machineType === 'virtualbox' ? (
		<div>
			<Dropdown
				selection fluid
				defaultValue={type}
				options={[
					{ text: 'VirtualBox internal network', value: 'virtualbox' },
					{ text: 'Bridged', value: 'bridged' }
				]}
				onChange={(e, data) => { setType(data.value); }}
			/>
			<Input
				label="IP:"
				defaultValue={ip}
				onBlur={e => setIp(e.target.value)}
			/>
			<Checkbox
				toggle label="Promiscuous"
				defaultChecked={promiscuous}
				onChange={(e, data) => { setPromiscuous(data.checked); }}
			/>
			<Checkbox
				toggle label="Reset MAC"
				defaultChecked={resetMac}
				onChange={(e, data) => setResetMac(data.checked)}
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
						error={nameEmpty}
						defaultValue={name}
						onChange={e => setNameEmpty(e.target.value.length < 1)}
						onBlur={e => setName(e.target.value)}
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

function Networks({ machineType, networks: initialNetworks, valueRef }) {
	const [networks, setNetworks] = useState(initialNetworks);
	const [order, setOrder] = useState(initialNetworks.map((n, i) => i));
	const [lastIndex, setLastIndex] = useState(initialNetworks.length);
	const networkRefs = useRef(order.reduce((refs, id) => {
		refs[id] = createRef();
		return refs;
	}, {}));

	useEffect(() => {
		valueRef.current = () => {
			return order.map(i => networkRefs.current[i].current());
		};
	});

	function addNetwork() {
		const index = lastIndex + 1;
		setLastIndex(index);
		setOrder([...order, index]);
		setNetworks({ ...networks, [index]: { name: '' } });
		networkRefs.current[index] = createRef();
	}

	function deleteNetwork(index) {
		const newOrder = [...order];
		const newNetworks = { ...networks };
		delete newNetworks[index];
		const orderIndex = order.indexOf(index);
		if (orderIndex !== -1) {
			newOrder.splice(orderIndex, 1);
		}
		setOrder(newOrder);
		setNetworks(newNetworks);
		delete networkRefs.current[index];
	}

	return (
		<div>
			{order.map(i => (
				<Network
					valueRef={networkRefs.current[i]}
					key={i}
					network={networks[i]}
					onDelete={() => deleteNetwork(i)}
					autoFocus={i === lastIndex}
					machineType={machineType}
				/>
			))}
			<Button positive icon onClick={() => addNetwork()}>
				<Icon name="plus" size="large" />
			</Button>
		</div>
	);
}

function Machine({
	id,
	primary,
	machine: initialMachine,
	autoFocus,
	onIdChange,
	onPrimary,
	onDelete,
	valueRef
}) {
	const migratedMachine = { type: 'virtualbox', ...initialMachine };
	if ('enable_token' in initialMachine) {
		migratedMachine.enable_private = initialMachine.enable_token;
		delete migratedMachine.enable_token;
	}

	const [errors, setErrors] = useState({});
	const [machine, setMachine] = useState(initialMachine);
	const networkRef = useRef(null);

	useEffect(() => {
		valueRef.current = () => {
			return {
				...machine,
				networks: networkRef.current()
			};
		};
	});

	function setId(e) {
		const newId = e.target.value;
		const updated = onIdChange(newId);
		if (updated === false) {
			e.target.value = id;
			setErrors({
				...errors,
				id: undefined
			});
		}
	}

	function setMachineField(field, value) {
		setMachine({
			...machine,
			[field]: value
		});
	}

	function validateRegex(field, regex) {
		return e => {
			setErrors({
				...errors,
				[field]: !regex.test(e.target.value)
			});
		};
	}

	const idNode = <Input fluid defaultValue={id} autoFocus={autoFocus} onChange={validateRegex('id', /^[a-zA-Z0-9-_]+$/)} error={errors.id} onFocus={e => e.target.select()} onBlur={e => setId(e)} icon={machine.type === 'lxd' ? 'box' : 'desktop'} />;
	const description = <Input fluid defaultValue={machine.description} onChange={validateRegex('description', /./)} error={errors.description} onBlur={e => setMachineField('description', e.target.value)} />;
	const base = <Input fluid list={machine.type === 'virtualbox' ? 'virtualbox-templates' : undefined} defaultValue={machine.base} error={errors.base} onChange={validateRegex('base', /[a-zA-Z0-9-_]+-template$/)} onBlur={e => setMachineField('base', e.target.value)} onFocus={loadTemplates} />;

	const createButton = (field, disabled = false) => {
		return (
			<Button
				icon
				primary={!!machine[field]}
				disabled={disabled}
				onClick={() => setMachineField(field, !machine[field])}
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
				<Networks valueRef={networkRef} networks={machine.networks} machineType={machine.type} />
			</Table.Cell>
			<Table.Cell collapsing>
				<Button negative onClick={onDelete}>Delete</Button>
			</Table.Cell>
		</Table.Row>
	);
}

function Machines({
	machineOrder: initialMachineOrder,
	primary: initialPrimary,
	machines: initialMachines,
	valueRef
}) {
	const [templates, setTemplates] = useState(null);
	useEffect(() => { templatesLoadPromise.then(setTemplates); }, []);
	const [primary, setPrimary] = useState(initialPrimary);
	const [machines, setMachines] = useState({ ...initialMachines });
	const [order, setOrder] = useState([...initialMachineOrder]);
	const [newMachineId, setNewMachineId] = useState(null);
	const [keys, setKeys] = useState(() => {
		return initialMachineOrder.reduce((keys, machine, i) => {
			keys[machine] = i;
			return keys;
		}, {});
	});
	const machineRefs = useRef(order.reduce((refs, id) => {
		refs[id] = createRef();
		return refs;
	}, {}));
	const tableRef = useRef(null);

	useEffect(() => {
		if (!tableRef.current) {
			return;
		}
		try {
			const dragger = tableDragger(tableRef.current, {
				mode: 'row',
				dragHandler: '.table-dragger-handle',
				onlyBody: true,
				animation: 300
			}).on('drop', (from, to) => {
				from--;
				to--;
				const newOrder = [...order];
				const index = newOrder.splice(from, 1);
				newOrder.splice(to, 0, index[0]);
				setOrder(newOrder);
			});
			return () => {
				dragger.destroy();
			};
		} catch (e) {
			// ignored intentionally
		}
	});

	useEffect(() => {
		valueRef.current = () => {
			if (!order.length) {
				return {};
			}

			return {
				machines: order.reduce((value, id) => {
					value[id] = machineRefs.current[id].current();
					return value;
				}, {}),
				machineOrder: [...order],
				primaryMachine: primary
			};
		};
	});

	function deleteMachine(id) {
		return () => {
			const newMachines = { ...machines };
			const newOrder = [...order];
			const newKeys = { ...keys };
			delete newMachines[id];
			delete newKeys[id];
			const orderIndex = newOrder.indexOf(id);
			if (orderIndex >= 0) {
				newOrder.splice(orderIndex, 1);
			}
			setMachines(newMachines);
			setOrder(newOrder);
			setKeys(newKeys);
			if (primary === id) {
				setPrimary(null);
			}
			delete machineRefs.current[id];
		};
	}

	function newMachine(type) {
		const newMachines = { ...machines };
		const newOrder = [...order];
		const newKeys = { ...keys };
		const newId = Date.now().toString(16);
		newMachines[newId] = {
			type,
			description: '',
			base: '',
			networks: []
		};
		newKeys[newId] = Date.now();
		newOrder.push(newId);
		setMachines(newMachines);
		setOrder(newOrder);
		setKeys(newKeys);
		setNewMachineId(newId);
		machineRefs.current[newId] = createRef();
	}

	function changeId(oldId) {
		return newId => {
			if (oldId === newId || newId === '' || order.includes(newId)) {
				return false;
			}
			const newMachines = { ...machines };
			const newMachineOrder = [...order];
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
			setMachines(newMachines);
			setOrder(newMachineOrder);
			setKeys(newKeys);
			setPrimary(newPrimary);
			machineRefs.current[newId] = machineRefs.current[oldId];
			delete machineRefs.current[oldId];
		};
	}

	if (order.length === 0) {
		return (
			<div>
				<Button positive onClick={() => newMachine('virtualbox')}>New machine</Button>
				<Button positive onClick={() => newMachine('lxd')}>New container</Button>
			</div>
		);
	}

	return (
		<div>
			<datalist id="virtualbox-templates">
				{templates ? templates.map(t => <option key={t}>{t}</option>) : undefined}
			</datalist>
			<table className="ui table" ref={tableRef}>
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
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{order.map(id => (
						<Machine
							valueRef={machineRefs.current[id]}
							key={keys[id]}
							id={id}
							machine={machines[id]}
							onIdChange={changeId(id)}
							onDelete={deleteMachine(id)}
							onPrimary={() => setPrimary(id === primary ? null : id)}
							primary={primary === id}
							autoFocus={newMachineId === id}
						/>
					))}
				</Table.Body>
			</table>
			<Button positive onClick={() => newMachine('virtualbox')}>New machine</Button>
			<Button positive onClick={() => newMachine('lxd')}>New container</Button>
		</div>
	);
}

/**
 * Repositories
 */
function Repositories({ repositories: initialRepositories, valueRef }) {
	const [allRepositories, setAllRepositories] = useState({});
	useEffect(() => { repositoriesLoadPromise.then(setAllRepositories); }, []);
	const [repositories, setRepositories] = useState(() => {
		return Object.keys(initialRepositories).reduce(
			(repositories, i, counter) => {
				repositories[counter] = {
					id: i,
					name: initialRepositories[i].name,
					head: initialRepositories[i].head
				};
				return repositories;
			},
			{}
		);
	});
	const [order, setOrder] = useState(
		() => Object.keys(initialRepositories).map((a, i) => i)
	);
	const [lastIndex, setLastIndex] = useState(order.length);
	const [idErrors, setIdErrors] = useState({});
	const [nameErrors, setNameErrors] = useState({});
	const [headErrors, setHeadErrors] = useState({});

	useEffect(() => {
		valueRef.current = () => {
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
		};
	});

	function setRepository(id, field) {
		return e => {
			setRepositories({
				...repositories,
				[id]: {
					...repositories[id],
					[field]: e.target.value
				}
			});
		};
	}

	function deleteRepository(id) {
		const newRepositories = { ...repositories };
		const newOrder = [...order];
		delete newRepositories[id];
		const orderIndex = newOrder.indexOf(id);
		if (orderIndex >= 0) {
			newOrder.splice(orderIndex, 1);
		}
		setRepositories(newRepositories);
		setOrder(newOrder);
	}

	function addRepository() {
		const index = lastIndex + 1;
		setRepositories({ ...repositories, [index]: { id: '', name: '' } });
		setOrder([...order, index]);
		setLastIndex(index);
	}

	function validateId(id) {
		return e => {
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
			setIdErrors({ ...idErrors, [id]: invalid });
		};
	}

	function validateName(id) {
		return e => {
			const invalid = !/^[a-zA-Z0-9_-]+$/.test(e.target.value);
			setNameErrors({ ...nameErrors, [id]: invalid });
		};
	}

	function validateHead(id) {
		return e => {
			const invalid = !/^[a-zA-Z0-9_/-]*$/.test(e.target.value);
			setHeadErrors({ ...headErrors, [id]: invalid });
		};
	}

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
										onBlur={setRepository(i, 'id')}
										onChange={validateId(i)}
										autoFocus={i === lastIndex}
										onFocus={loadRepositories}
										error={idErrors[i]}
									/>
								</Table.Cell>
								<Table.Cell>
									<Input
										list="repositories"
										defaultValue={repositories[i].name}
										onBlur={setRepository(i, 'name')}
										onChange={validateName(i)}
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
										onBlur={setRepository(i, 'head')}
										onChange={validateHead(i)}
										onFocus={loadRepositories}
										error={headErrors[i]}
									/>
								</Table.Cell>
								<Table.Cell>
									<Button icon negative onClick={() => deleteRepository(i)}>
										<Icon name="delete" />
									</Button>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			)}
			<Button positive onClick={() => addRepository()}>New</Button>
		</div>
	);
}

/**
 * Endpoints
 * TODO: disable duplicates
 */
function Endpoints({ endpoints: initialEndpoints, valueRef }) {
	const [endpoints, setEndpoints]	= useState({ ...initialEndpoints });
	const [order, setOrder] = useState(() => Object.keys(initialEndpoints).map((n, i) => i));
	const [lastIndex, setNewIndex] = useState(order.length);

	useEffect(() => {
		valueRef.current = () => {
			setOrder(order.filter(i => endpoints[i].length));
			return order.length ? order.map(i => endpoints[i]) : undefined;
		};
	});

	function setEndpoint(id) {
		return e => {
			if (e.target.value === '') {
				const orderIndex = order.indexOf(id);
				if (orderIndex > -1) {
					const newOrder = [...order];
					newOrder.splice(orderIndex, 1);
					setOrder(newOrder);
				}
			} else if (endpoints[id] !== e.target.value
				&& !order.some(id => endpoints[id] === e.target.value)) {
				const newEndpoints = { ...endpoints };
				newEndpoints[id] = e.target.value;
				setEndpoints(newEndpoints);
			} else {
				e.target.value = endpoints[id];
			}
		};
	}

	function addEndpoint() {
		const index = lastIndex + 1;
		setEndpoints({ ...endpoints, [index]: '' });
		setOrder([...order, index]);
		setNewIndex(index);
	}

	return (
		<div>
			{order.map(i => (
				<div key={i}>
					<Input
						defaultValue={endpoints[i]}
						onBlur={setEndpoint(i)}
						autoFocus={i === lastIndex}
					/>
				</div>
			))}
			<Button positive onClick={() => addEndpoint()}>New</Button>
		</div>
	);
}

/**
 * Gitlab
 */
function Gitlab({ gitlab: initialGitlab, valueRef }) {
	const [gitlab, setGitlab] = useState(initialGitlab || null);

	useEffect(() => {
		valueRef.current = () => {
			return gitlab ? { ...gitlab } : undefined;
		};
	});

	function setField(field) {
		return e => {
			setGitlab({
				...gitlab,
				[field]: e.target.value
			});
		};
	}

	if (!gitlab) {
		return <Button color="yellow" onClick={() => setGitlab({ url: '', key: '' })}>Add</Button>;
	}
	return (
		<div>
			<div>
				<Input label="URL" defaultValue={gitlab.url} onBlur={setField('url')} style={{ width: '28.5em' }} />
			</div>
			<div>
				<Input label="Key" defaultValue={gitlab.key} onBlur={setField('key')} />
			</div>
			<Button negative onClick={() => setGitlab(null)}>Remove</Button>
		</div>
	);
}

export default function ({ lab }) {
	const [loading, setLoading] = useState(false);
	const assistantRef = useRef(null);
	const machinesRef = useRef(null);
	const repositoriesRef = useRef(null);
	const endpointsRef = useRef(null);
	const gitlabRef = useRef(null);

	function getValue() {
		return {
			assistant: assistantRef.current(),
			...machinesRef.current(),
			repositories: repositoriesRef.current(),
			endpoints: endpointsRef.current(),
			gitlab: gitlabRef.current()
		};
	}

	async function save() {
		if (loading) {
			return;
		}

		setLoading('save');
		fetch(`lab/${encodeURIComponent(lab._id)}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': lab._rev },
			body: JSON.stringify(getValue())
		})
			.then(response => {
				if (response.ok) {
					window.location.href = 'lab';
				} else {
					setLoading(null);
				}
			}, e => {
				setLoading(null);
			});
	}

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
					<Assistant valueRef={assistantRef} assistant={lab.assistant} />
				</Segment>
				<Segment>
					<Header>Machines</Header>
					<Machines
						valueRef={machinesRef}
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
					<Repositories
						valueRef={repositoriesRef}
						repositories={'repositories' in lab ? lab.repositories : {}}
					/>
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
					<Endpoints valueRef={endpointsRef} endpoints={'endpoints' in lab ? lab.endpoints : []} />
				</Segment>
				<Segment>
					<Header>Gitlab</Header>
					<Gitlab valueRef={gitlabRef} gitlab={lab.gitlab} />
				</Segment>
				<Button primary onClick={() => save()} disabled={!!loading}>Save</Button>
			</Grid.Column>
		</Grid>
	);
}
