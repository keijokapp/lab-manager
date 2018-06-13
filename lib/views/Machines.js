import React from 'react';
import { Button, Form, Grid, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';
import request from '../request';


class Machine extends React.Component {
	constructor(props) {
		super();
		this.state = {
			machine: props.machine
		};
	}

	getNextSnapshot() {
		if(!this.state.machine.id.endsWith('-template')) {
			return '';
		}

		if(!this.state.machine.snapshot) {
			return this.state.machine.id + '-' + 1 + '-template';
		}

		const basename = this.state.machine.id.replace(/-template$/, '');
		const snapshotIndex = Number(this.state.machine.snapshot.replace(basename + '-', '').replace('-template', ''));

		if(Number.isInteger(snapshotIndex)) {
			return basename + '-' + (snapshotIndex + 1) + '-template';
		} else {
			return '';
		}
	}

	openRdp() {
		window.open(config.remote + '/' + encodeURIComponent(this.state.machine.id));
	}

	createSnapshot(snapshotName) {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'snapshot' });
		request.post('machine/' + encodeURIComponent(this.state.machine.id) + '/snapshot/' + encodeURIComponent(snapshotName))
			.then(response => {
				if(response.ok) {
					this.reload(true);
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});

	}

	setMachineState(state) {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: state });
		request.put('machine/' + encodeURIComponent(this.state.machine.id) + '?ip', { state })
			.then(response => {
				if(response.ok) {
					return response.json().then(body => {
						this.setState({
							machine: {
								...this.state.machine,
								...body
							},
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

	reload(force) {
		if(!force && this.state.loading) {
			return;
		}

		this.setState({ loading: 'reload' });
		request.get('machine/' + encodeURIComponent(this.state.machine.id) + '?ip')
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

		let rdpOrSnapshotButton;
		if(machine.state === 'running') {
			if('rdp-port' in machine) {
				rdpOrSnapshotButton = <Button icon color="blue" basic onClick={() => this.openRdp()}>
					RDP: {machine['rdp-port']} <Icon name="external alternate"/>
				</Button>;
			}
		} else if(this.state.machine.state === 'poweroff' && this.state.machine.id.endsWith('-template')) {
			rdpOrSnapshotButton = <Popup on="click" hideOnScroll
			                             trigger={<Button icon color="violet"
			                                              loading={this.state.loading === 'snapshot'}
			                                              disabled={!!this.state.loading}>
				                             <Icon name="save"/> Snapshot
			                             </Button>}
			                             onOpen={() => setTimeout(() => this.refs['snapshotName'].focus(), 1)}>
				<Form style={{ marginBottom: '0px' }}>
					<Input ref="snapshotName" placeholder="Snapshot name" defaultValue={this.getNextSnapshot()}/>
					<Button positive onClick={() => this.createSnapshot(this.refs.snapshotName.inputRef.value)}>
						Create
					</Button>
				</Form>
			</Popup>;
		}

		let stateButton;
		if(machine.state === 'poweroff') {
			stateButton =
				<Button icon primary disabled={!!this.state.loading} loading={this.state.loading === 'running'}
				        onClick={() => this.setMachineState('running')}>
					<Icon name="bolt"/> Power on
				</Button>;
		} else if(machine.state === 'running') {
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

		return <Table.Row>
			<Table.Cell>{machine.id}</Table.Cell>
			<Table.Cell>{machine.state}</Table.Cell>
			<Table.Cell/>
			<Table.Cell>{machine.snapshot}</Table.Cell>
			<Table.Cell/>
			<Table.Cell>{ip}</Table.Cell>
			<Table.Cell collapsing>{rdpOrSnapshotButton}</Table.Cell>
			<Table.Cell collapsing style={{ textAlign: 'right' }}>{stateButton}</Table.Cell>
			<Table.Cell collapsing>
				<Button icon loading={this.state.loading === 'reload'} disabled={!!this.state.loading}
				        onClick={() => this.reload()}>
					<Icon name="sync alternate"/>
				</Button>
			</Table.Cell>
		</Table.Row>;
	}
}


export default props => {

	const tabs = [['machine', 'All machines'], ['machine?templates', 'Templates'], ['machine?running', 'Running machines']]
		.map((link, i) => <a key={i} className={props.activeTab === i ? 'active item' : 'item'}
		                     href={link[0]}>{link[1]}</a>);

	const machines = props.machines.map(machine => <Machine key={machine.id} machine={machine}/>);

	return <Grid>
		<Grid.Column>
			<Header size="large" color="teal">Virtual machines</Header>
			<div className="ui top attached tabular menu">
				{tabs}
			</div>
			<div className="ui bottom attached segment active tab">
				<Table selectable>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>Name</Table.HeaderCell>
							<Table.HeaderCell colSpan={2}>State</Table.HeaderCell>
							<Table.HeaderCell colSpan={2}>Snapshot</Table.HeaderCell>
							<Table.HeaderCell>IP-s</Table.HeaderCell>
							<Table.HeaderCell/>
							<Table.HeaderCell/>
							<Table.HeaderCell/>
						</Table.Row>
					</Table.Header>
					<tbody>
					{machines}
					</tbody>
				</Table>
			</div>
		</Grid.Column>
	</Grid>;
};
