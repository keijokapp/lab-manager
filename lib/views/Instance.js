import React, { useState } from 'react';
import {
	Button, Grid, Header, Icon, Label, Popup, Segment, Table
} from 'semantic-ui-react';
import { SecretKey, TimeSince } from './util.js';

function Assistant({ template, assistant }) {
	if (typeof template !== 'object' || template === null) {
		return <i>None</i>;
	}

	let userKey;
	let link;

	if (typeof assistant === 'object' && assistant) {
		userKey = (
			<div>
				<Label size="big">
					User key:
					<Label.Detail>{assistant.userKey}</Label.Detail>
				</Label>
			</div>
		);
		link = (
			<div>
				<Label size="big">
					Link:
					<Label.Detail><a href={assistant.link} rel="noopener noreferrer" target="_blank">{assistant.link}</a></Label.Detail>
				</Label>
			</div>
		);
	}

	if ('key' in template) {
		return (
			<div>
				<div>
					<Label size="big">
						URL:
						<Label.Detail>{template.url}</Label.Detail>
					</Label>
				</div>
				<div>
					<Label size="big">
						Key:
						<Label.Detail><SecretKey>{template.key}</SecretKey></Label.Detail>
					</Label>
				</div>
				<div>
					<Label size="big">
						Lab ID:
						<Label.Detail>{template.lab}</Label.Detail>
					</Label>
				</div>
				{userKey}
				{link}
			</div>
		);
	}

	if (typeof assistant === 'object' && assistant && 'userKey' in assistant) {
		return (
			<div>
				{userKey}
				{link}
			</div>
		);
	}

	return <i>None</i>;
}

function Machine({
	id, rev, primary, template, machine: initialMachine
}) {
	const [machine, setMachine] = useState(initialMachine);
	const [loading, setLoading] = useState(null);

	function setMachineState(state) {
		if (loading) {
			return;
		}

		setLoading(state);
		fetch(`instance/${encodeURIComponent(window.INIT_STATE.instanceToken)}/machine/${encodeURIComponent(id)}?ip`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': rev },
			body: JSON.stringify({ state })
		})
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						setMachine(body);
						setLoading(null);
					});
				}
				setLoading(null);
			})
			.catch(() => {
				setLoading(null);
			});
	}

	function openRdp() {
		window.open(`${config.remote}/${encodeURIComponent(window.INIT_STATE.instanceToken)}:${encodeURIComponent(id)}`);
	}

	function reload() {
		if (loading) {
			return;
		}

		setLoading('reload');
		fetch(`instance/${encodeURIComponent(window.INIT_STATE.instanceToken)}/machine/${encodeURIComponent(id)}?ip`, {
			headers: { 'if-match': rev }
		})
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						setMachine(body);
						setLoading(null);
					});
				}
				setLoading(null);
			})
			.catch(() => {
				setLoading(null);
			});
	}

	let stateButton;
	if (machine.state === 'poweroff' || machine.state === 'stopped') {
		stateButton = (
			<Button
				icon primary
				disabled={!!loading}
				loading={loading === 'running'}
				onClick={() => setMachineState('running')}
			>
				<Icon name="bolt" />
				Power on
			</Button>
		);
	} else if (machine.state === 'running') {
		if (template.type === 'virtualbox') {
			stateButton = (
				<Button.Group>
					<Button
						icon color="yellow"
						disabled={!!loading}
						loading={loading === 'acpipowerbutton'}
						onClick={() => setMachineState('acpipowerbutton')}
					>
						<Icon name="power off" />
						Shutdown
					</Button>
					<Button.Or />
					<Button
						icon negative
						disabled={!!loading}
						loading={loading === 'poweroff'}
						onClick={() => setMachineState('poweroff')}
					>
						<Icon name="plug" />
						Power off
					</Button>
				</Button.Group>
			);
		} else {
			stateButton = (
				<Button.Group>
					<Button
						icon negative
						disabled={!!loading}
						loading={loading === 'poweroff'}
						onClick={() => setMachineState('poweroff')}
					>
						<Icon name="plug" />
						Power off
					</Button>
				</Button.Group>
			);
		}
	} else {
		stateButton = <Button disabled>Unknown</Button>;
	}

	const ip = [];
	if ('ip' in machine) {
		for (const iface in machine.ip) {
			if (ip.length >= 4) {
				ip.push(<p key={iface}>...</p>);
				break;
			} else {
				ip.push(<p key={iface}>{machine.ip[iface]}</p>);
			}
		}
	}

	return (
		<Table.Row>
			<Table.Cell collapsing>{!!primary && <Icon name="star" />}</Table.Cell>
			<Table.Cell>{template.description}</Table.Cell>
			<Table.Cell>{machine.name}</Table.Cell>
			<Table.Cell>{template.base}</Table.Cell>
			<Table.Cell>
				{'networks' in machine && machine.networks.map((network, i) => (
					<div key={i}>{network.name}</div>
				))}
			</Table.Cell>
			<Table.Cell>{ip}</Table.Cell>
			<Table.Cell collapsing>
				{'rdp-port' in machine && (
					<Button icon color="blue" basic onClick={() => openRdp()}>
						{`RDP: ${machine['rdp-port']}`}
						<Icon name="external alternate" />
					</Button>
				)}
			</Table.Cell>
			<Table.Cell collapsing style={{ textAlign: 'right' }}>{stateButton}</Table.Cell>
			<Table.Cell collapsing>
				<Button icon loading={loading === 'reload'} disabled={!!loading} onClick={() => reload()}>
					<Icon name="sync alternate" />
				</Button>
			</Table.Cell>
		</Table.Row>
	);
}

function Machines({
	machineOrder, machines, rev, primary, templates
}) {
	if (!machineOrder || machineOrder.length === 0) {
		return <i>None</i>;
	}

	return (
		<div>
			<Table selectable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell collapsing />
						<Table.HeaderCell>Description</Table.HeaderCell>
						<Table.HeaderCell>Name</Table.HeaderCell>
						<Table.HeaderCell>Base template</Table.HeaderCell>
						<Table.HeaderCell width={3}>Networks</Table.HeaderCell>
						<Table.HeaderCell>IP-s</Table.HeaderCell>
						<Table.HeaderCell />
						<Table.HeaderCell />
						<Table.HeaderCell />
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{machineOrder.map(id => (
						<Machine
							key={id}
							id={id}
							rev={rev}
							machine={machines[id]}
							template={templates[id]}
							primary={primary === id}
						/>
					))}
				</Table.Body>
			</Table>
		</div>
	);
}

function Repositories({ template, repositories }) {
	if (!template) {
		return <i>None</i>;
	}

	return (
		<div>
			<Table>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>ID</Table.HeaderCell>
						<Table.HeaderCell>Repository</Table.HeaderCell>
						<Table.HeaderCell>Head</Table.HeaderCell>
						<Table.HeaderCell>Link</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{Object.keys(template).map(id => (
						<Table.Row key={id}>
							<Table.Cell>{id}</Table.Cell>
							<Table.Cell>{template[id].name}</Table.Cell>
							<Table.Cell>{template[id].head}</Table.Cell>
							<Table.Cell>{repositories[id].link}</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</div>
	);
}

function Endpoints({ names, endpoints }) {
	if (!Array.isArray(names)) {
		return <i>None</i>;
	}

	function link(name) {
		const { link } = endpoints[name];
		if (link.startsWith('http:') || link.startsWith('https:')) {
			return <a href={link} rel="noopener noreferrer" target="_blank">{link}</a>;
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

	return (
		<div>
			<Table>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Name</Table.HeaderCell>
						<Table.HeaderCell>Key</Table.HeaderCell>
						<Table.HeaderCell>Link</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{names.map(name => (
						<Table.Row key={name}>
							<Table.Cell>{name}</Table.Cell>
							<Table.Cell>{endpoints[name].key}</Table.Cell>
							<Table.Cell>{link(name)}</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</div>
	);
}

function Gitlab({ template, gitlab }) {
	if (typeof template !== 'object' || template === null) {
		return <i>None</i>;
	}

	return (
		<div>
			<div>
				<Label size="big">
					URL:
					{' '}
					<Label.Detail><a href={template.url} rel="noopener noreferrer" target="_blank">{template.url}</a></Label.Detail>
				</Label>
			</div>
			{'key' in template && (
				<div>
					<Label size="big">
						Key:
						<Label.Detail><SecretKey>{template.key}</SecretKey></Label.Detail>
					</Label>
				</div>
			)}
			{typeof gitlab === 'object' && gitlab !== null && (
				<>
					<div>
						<Label size="big">
							Group link:
							<Label.Detail>
								<a rel="noopener noreferrer" target="_blank" href={gitlab.group.link}>{gitlab.group.link}</a>
							</Label.Detail>
						</Label>
					</div>
					<div>
						<Label size="big">
							User link:
							<Label.Detail>
								<a rel="noopener noreferrer" target="_blank" href={gitlab.user.link}>{gitlab.user.link}</a>
							</Label.Detail>
						</Label>
					</div>
				</>
			)}
		</div>
	);
}

function Timing(props) {
	const { timing, startTime } = props;

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
		timingNodes.push((
			<Table.Row key={keys.join(': ')}>
				<Table.Cell style={{ fontWeight: 'body' }}>{keys.join(': ')}</Table.Cell>
				<Table.Cell>
					<span style={{
						display: 'inline-block',
						width: `${(t[0] - startTime) / max * 80}%`
					}}
					>
						{t[0] - startTime}
					</span>
					<span style={{
						display: 'inline-block',
						width: `${(t[1] - t[0]) / max * 80}%`,
						backgroundColor: 'lightgreen'
					}}
					>
						{t[1] - t[0]}
					</span>
				</Table.Cell>
			</Table.Row>
		));
	});

	return (
		<Table compact>
			<Table.Body>
				{timingNodes}
			</Table.Body>
		</Table>
	);
}

export default function ({ instance }) {
	const [loading, setLoading] = useState(null);

	function deleteInstance() {
		if (loading) {
			return;
		}

		setLoading('delete');
		fetch(`lab/${encodeURIComponent(instance.lab._id)}/instance/${encodeURIComponent(instance.username)}`, {
			method: 'DELETE',
			headers: { 'if-match': instance._rev }
		})
			.then(response => {
				if (response.ok) {
					window.location.href = 'instance';
				} else {
					setLoading(null);
				}
			})
			.catch(() => {
				setLoading(null);
			});
	}

	const { lab } = instance;
	const startTime = new Date(instance.startTime);

	return (
		<Grid>
			<Grid.Column>
				<Header color="teal" size="huge">Instance</Header>
				<Segment>
					{lab._id && (
						<div>
							<Label size="big">
								Lab:
								<Label.Detail>
									<a href={`lab/${encodeURIComponent(lab._id)}`}>{lab._id}</a>
								</Label.Detail>
							</Label>
						</div>
					)}
					{instance.username && (
						<div>
							<Label size="big">
								Username:
								<Label.Detail>{instance.username}</Label.Detail>
							</Label>
						</div>
					)}
					<div>
						<Label size="big">
							Start time:
							<Label.Detail>
								{`${startTime.toDateString()} ${startTime.toTimeString().split(' ')[0]} `}
								(
								<TimeSince date={startTime} />
								)
							</Label.Detail>
						</Label>
					</div>
					<div>
						<Label size="big">
							Public token:
							<Label.Detail>
								<a href={`instance/${encodeURIComponent(instance.publicToken)}`}>{instance.publicToken}</a>
							</Label.Detail>
						</Label>
					</div>
					{instance.privateToken && (
						<div>
							<Label size="big">
								Private token:
								<Label.Detail>
									<SecretKey as="a" href={`instance/${encodeURIComponent(instance.privateToken)}`}>
										{instance.privateToken}
									</SecretKey>
								</Label.Detail>
							</Label>
						</div>
					)}
				</Segment>
				<Segment>
					<Header>Assistant</Header>
					<Assistant assistant={instance.assistant} template={lab.assistant} />
				</Segment>
				<Segment>
					<Header>Machines</Header>
					<Machines
						machines={instance.machines}
						templates={lab.machines}
						machineOrder={lab.machineOrder}
						primary={lab.primaryMachine}
						rev={instance._rev}
					/>
				</Segment>
				<Segment>
					<Header>Repositories</Header>
					<Repositories repositories={instance.repositories} template={lab.repositories} />
				</Segment>
				<Segment>
					<Header>Endpoints</Header>
					<Endpoints endpoints={instance.endpoints} names={lab.endpoints} />
				</Segment>
				<Segment>
					<Header>Gitlab</Header>
					<Gitlab
						gitlab={instance.gitlab}
						template={lab.gitlab}
						publicToken={instance.publicToken}
					/>
				</Segment>
				<Segment>
					<Header>Timing</Header>
					<Timing startTime={startTime.getTime()} timing={instance.timing} />
				</Segment>
				{instance._id && (
					<Popup
						on="click" position="top center" wide hideOnScroll
						trigger={(
							<Button negative disabled={!!loading} loading={loading === 'delete'} icon>
								<Icon name="trash" />
								{' Delete'}
							</Button>
						)}
					>
						<Button negative onClick={() => deleteInstance()}>Confirm deletion</Button>
					</Popup>
				)}
			</Grid.Column>
		</Grid>
	);
}
