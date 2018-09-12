import React from 'react';
import { Button, Grid, Header, Icon, Label, Popup, Segment, Table } from 'semantic-ui-react';
import { SecretKey, TimeSince } from './util';


function Assistant(props) {
	if(typeof props.template !== 'object' || props.template === null) {
		return <i>None</i>;
	}

	let userKey, link;
	if(typeof props.assistant === 'object' && props.assistant) {
		userKey = <div>
			<Label size="big">User key: <Label.Detail>{props.assistant.userKey}</Label.Detail></Label>
		</div>;
		link = <div>
			<Label size="big">
				Link: <Label.Detail><a href={props.assistant.link}
				                       target="_blank">{props.assistant.link}</a></Label.Detail>
			</Label>
		</div>;
	}

	if('key' in props.template) {
		return <div>
			<div>
				<Label size="big">URL: <Label.Detail>{props.template.url}</Label.Detail></Label>
			</div>
			<div>
				<Label size="big">Key: <Label.Detail><SecretKey>{props.template.key}</SecretKey></Label.Detail></Label>
			</div>
			<div>
				<Label size="big">Lab ID: <Label.Detail>{props.template.lab}</Label.Detail></Label>
			</div>
			{userKey}
			{link}
		</div>;
	} else if(typeof props.assistant === 'object' && props.assistant && 'userKey' in props.assistant) {
		return <div>
			{userKey}
			{link}
		</div>;
	} else {
		return <i>None</i>;
	}
}


class Machine extends React.Component {

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
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: state });
		fetch('instance/' + encodeURIComponent(window.INIT_STATE.instanceToken) + '/machine/' + encodeURIComponent(this.props.id) + '?ip', {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'if-match': this.props.rev },
			body: JSON.stringify({ state })
		})
			.then(response => {
				if(response.ok) {
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
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'reload' });
		fetch('instance/' + encodeURIComponent(window.INIT_STATE.instanceToken) + '/machine/' + encodeURIComponent(this.props.id) + '?ip', {
			headers: { 'if-match': this.props.rev }
		})
			.then(response => {
				if(response.ok) {
					return response.json().then(body => {
						this.setState({
							machine: body,
							loading: null
						});
					});
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const machine = this.state.machine;
		const template = this.props.template;

		let primary;
		if(this.props.primary) {
			primary = <Icon name="star"/>;
		}

		let rdp;
		if('rdp-port' in machine) {
			rdp = <Button icon color="blue" basic onClick={() => this.openRdp()}>
				RDP: {machine['rdp-port']} <Icon name="external alternate"/>
			</Button>;
		}

		let networks;
		if('networks' in machine) {
			networks = machine.networks.map((network, i) => <div key={i}>{network.name}</div>);
		}

		let stateButton;
		if(machine.state === 'poweroff' || machine.state === 'stopped') {
			stateButton =
				<Button icon primary disabled={!!this.state.loading} loading={this.state.loading === 'running'}
				        onClick={() => this.setMachineState('running')}>
					<Icon name="bolt"/> Power on
				</Button>;
		} else if(machine.state === 'running') {
			if(machine.type === 'virtualbox') {
				stateButton = <Button.Group>
					<Button icon color="yellow" disabled={!!this.state.loading}
					        loading={this.state.loading === 'acpipowerbutton'}
					        onClick={() => this.setMachineState('acpipowerbutton')}>
						<Icon name="power off"/> Shutdown
					</Button>
					<Button.Or/>
					<Button icon negative disabled={!!this.state.loading} loading={this.state.loading === 'poweroff'}
					        onClick={() => this.setMachineState('poweroff')}>
						<Icon name="plug"/> Power off
					</Button>
				</Button.Group>;
			} else {
				stateButton = <Button.Group>
					<Button icon negative disabled={!!this.state.loading} loading={this.state.loading === 'poweroff'}
					        onClick={() => this.setMachineState('poweroff')}>
						<Icon name="plug"/> Power off
					</Button>
				</Button.Group>;
			}
		} else {
			stateButton = <Button disabled>Unknown</Button>;
		}

		const ip = [];
		if('ip' in machine) {
			for(const iface in machine.ip) {
				if(ip.length >= 4) {
					ip.push(<p key={iface}>...</p>);
					break;
				} else {
					ip.push(<p key={iface}>{machine.ip[iface]}</p>);
				}
			}
		}

		const reload = <Button icon loading={this.state.loading === 'reload'} disabled={!!this.state.loading}
		                       onClick={() => this.reload()}>
			<Icon name="sync alternate"/>
		</Button>;

		return <Table.Row>
			<Table.Cell collapsing>{primary}</Table.Cell>
			<Table.Cell>{template.description}</Table.Cell>
			<Table.Cell>{machine.name}</Table.Cell>
			<Table.Cell>{template.base}</Table.Cell>
			<Table.Cell>{networks}</Table.Cell>
			<Table.Cell>{ip}</Table.Cell>
			<Table.Cell collapsing>{rdp}</Table.Cell>
			<Table.Cell collapsing style={{ textAlign: 'right' }}>{stateButton}</Table.Cell>
			<Table.Cell collapsing>{reload}</Table.Cell>
		</Table.Row>;
	}
}


function Machines(props) {
	if(!props.machineOrder || props.machineOrder.length === 0) {
		return <i>None</i>;
	}

	const machines = props.machineOrder.map(id => <Machine key={id} id={id} rev={props.rev}
	                                                       machine={props.machines[id]}
	                                                       template={props.templates[id]}
	                                                       primary={props.primary === id}/>);

	return <div>
		<Table selectable>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell collapsing/>
					<Table.HeaderCell>Description</Table.HeaderCell>
					<Table.HeaderCell>Name</Table.HeaderCell>
					<Table.HeaderCell>Base template</Table.HeaderCell>
					<Table.HeaderCell width={3}>Networks</Table.HeaderCell>
					<Table.HeaderCell>IP-s</Table.HeaderCell>
					<Table.HeaderCell/>
					<Table.HeaderCell/>
					<Table.HeaderCell/>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{machines}
			</Table.Body>
		</Table>
	</div>;
}


function Endpoints(props) {
	if(!Array.isArray(props.names)) {
		return <i>None</i>;
	}

	function link(name) {
		const link = props.endpoints[name].link;
		if(link.startsWith('http:') || link.startsWith('https:')) {
			return <a href={link} target="_blank">{link}</a>;
		} else if(link.startsWith('ssh:')) {
			try {
				const [auth, port] = link.slice(6).split(':');
				return 'ssh ' + auth + ' -p' + port;
			} catch(e) {
				return link;
			}
		} else {
			return link;
		}
	}

	const endpoints = props.names.map(name => <Table.Row key={name}>
		<Table.Cell>{name}</Table.Cell>
		<Table.Cell>{props.endpoints[name].key}</Table.Cell>
		<Table.Cell>{link(name)}</Table.Cell>
	</Table.Row>);

	return <div>
		<Table>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell>Name</Table.HeaderCell>
					<Table.HeaderCell>Key</Table.HeaderCell>
					<Table.HeaderCell>Link</Table.HeaderCell>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{endpoints}
			</Table.Body>
		</Table>
	</div>;
}


function Gitlab(props) {
	if(typeof props.template !== 'object' || props.template === null) {
		return <i>None</i>;
	}

	let groupLink, userLink;
	if(typeof props.gitlab === 'object' && props.gitlab !== null) {
		groupLink = <div>
			<Label size="big">
				Group link: <Label.Detail>
				<a target="_blank" href={props.gitlab.group.link}>{props.gitlab.group.link}</a>
			</Label.Detail>
			</Label>
		</div>;

		userLink = <div>
			<Label size="big">
				User link: <Label.Detail>
				<a target="_blank" href={props.gitlab.user.link}>{props.gitlab.user.link}</a>
			</Label.Detail>
			</Label>
		</div>;
	}

	let key;
	if('key' in props.template) {
		key = <div>
			<Label size="big">Key: <Label.Detail><SecretKey>{props.template.key}</SecretKey></Label.Detail></Label>
		</div>;
	}

	return <div>
		<div>
			<Label size="big">
				URL: <Label.Detail><a href={props.template.url} target="_blank">{props.template.url}</a></Label.Detail>
			</Label>
		</div>
		{key}
		{groupLink}
		{userLink}
	</div>;
}


function Timing(props) {
	function forEach(timing, cb, keys = []) {
		if(Array.isArray(timing)) {
			cb(keys, timing);
		} else {
			for(const i in timing) {
				forEach(timing[i], cb, [...keys, i]);
			}
		}
	}

	const startTime = new Date(props.startTime).getTime();

	let max = startTime;
	forEach(props.timing, (keys, timing) => {
		if(timing[1] > max) {
			max = timing[1];
		}
	});

	max -= startTime;
	let timing = [];

	forEach(props.timing, (keys, t) => {
		timing.push(<Table.Row key={keys.join(': ')}>
			<Table.Cell style={{ fontWeight: 'body' }}>{keys.join(': ')}</Table.Cell>
			<Table.Cell>
				<span style={{
					display: 'inline-block',
					width: ((t[0] - startTime) / max * 80) + '%'
				}}>{t[0] - startTime}</span>
				<span style={{
					display: 'inline-block',
					width: ((t[1] - t[0]) / max * 80) + '%',
					backgroundColor: 'lightgreen'
				}}>{t[1] - t[0]}</span>
			</Table.Cell>
		</Table.Row>);
	});

	return <Table compact>
		{timing}
	</Table>;
}


export default class extends React.Component {
	constructor() {
		super();
		this.state = {
			loading: null
		};
	}

	deleteInstance() {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'delete' });
		fetch('lab/' + encodeURIComponent(this.props.instance.lab._id) + '/instance/' + encodeURIComponent(this.props.instance.username), {
			method: 'DELETE',
			headers: { 'if-match': this.props.instance._rev }
		})
			.then(response => {
				if(response.ok) {
					window.location.href = 'instance';
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const instance = this.props.instance;
		const lab = instance.lab;
		const startTime = new Date(instance.startTime);

		const assistant = <Assistant assistant={instance.assistant} template={lab.assistant}/>;
		const machines = <Machines machines={instance.machines} templates={lab.machines} machineOrder={lab.machineOrder}
		                           primary={lab.primaryMachine} rev={instance._rev}/>;
		const endpoints = <Endpoints endpoints={instance.endpoints} names={lab.endpoints}/>;
		const gitlab = <Gitlab gitlab={instance.gitlab} template={lab.gitlab} publicToken={instance.publicToken}/>;
		let deleteButton;
		if('_id' in instance) {
			deleteButton = <Popup on="click" position="top center" wide hideOnScroll
			                      trigger={<Button negative disabled={!!this.state.loading}
			                                       loading={this.state.loading === 'delete'} icon><Icon
				                      name="trash"/> Delete</Button>}>
				<Button negative onClick={() => this.deleteInstance()}>Confirm deletion</Button>
			</Popup>;
		}


		return <Grid>
			<Grid.Column>
				<Header color="teal" size="huge">Instance</Header>
				<Segment>
					{lab._id && <div>
						<Label size="big">
							Lab: <Label.Detail><a
							href={'lab/' + encodeURIComponent(lab._id)}>{lab._id}</a></Label.Detail>
						</Label>
					</div>}
					{instance.username && <div>
						<Label size="big">
							Username: <Label.Detail>{instance.username}</Label.Detail>
						</Label>
					</div>}
					<div>
						<Label size="big">
							Start time: <Label.Detail>
							{startTime.toDateString() + ' ' + startTime.toTimeString().split(' ')[0]} (<TimeSince date={startTime}/>)
						</Label.Detail>
						</Label>
					</div>
					<div>
						<Label size="big">
							Public token: <Label.Detail>
							<a href={'instance/' + encodeURIComponent(instance.publicToken)}>{instance.publicToken}</a>
						</Label.Detail>
						</Label>
					</div>
					{instance.privateToken && <div>
						<Label size="big">
							Private token: <Label.Detail>
							<SecretKey as="a"
							           href={'instance/' + encodeURIComponent(instance.privateToken)}>{instance.privateToken}</SecretKey>
						</Label.Detail>
						</Label>
					</div>}
				</Segment>
				<Segment>
					<Header>Assistant</Header>
					{assistant}
				</Segment>
				<Segment>
					<Header>Machines</Header>
					{machines}
				</Segment>
				<Segment>
					<Header>Endpoints</Header>
					{endpoints}
				</Segment>
				<Segment>
					<Header>Gitlab</Header>
					{gitlab}
				</Segment>
				<Segment>
					<Header>Timing</Header>
					<Timing startTime={instance.startTime} timing={instance.timing}/>
				</Segment>
				{deleteButton}
			</Grid.Column>
		</Grid>;
	}
}
