import React from 'react';
import { Button, Form, Grid, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';


class Machine extends React.Component {
	constructor(props) {
		super();
		this.state = {
			machine: props.machine
		};
	}

	getNextSnapshot() {
		const { machine } = this.state;
		if (!machine.id.endsWith('-template')) {
			return '';
		}
		const basename = machine.id.replace(/-template$/, '');
		if (!machine.snapshot) {
			return `${basename}-1-template`;
		}
		const snapshotIndex = Number(machine.snapshot.replace(`${basename}-`, '').replace('-template', ''));
		if (Number.isInteger(snapshotIndex)) {
			return `${basename}-${snapshotIndex + 1}-template`;
		}
		return '';
	}

	setMachineState(state) {
		const { machine, loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: state });

		fetch(`machine/${encodeURIComponent(machine.id)}?ip`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ state })
		})
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						this.setState({
							machine: {
								...machine,
								...body
							},
							loading: null
						});
					});
				}
				this.setState({ loading: null });
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	createSnapshot(snapshotName) {
		const { machine, loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: 'snapshot' });
		fetch(`machine/${encodeURIComponent(machine.id)}/snapshot/${encodeURIComponent(snapshotName)}`, {
			method: 'POST'
		})
			.then(response => {
				if (response.ok) {
					this.reload(true);
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	openRdp() {
		const { machine } = this.state;
		window.open(`${config.remote}/${encodeURIComponent(machine.id)}`);
	}

	reload(force) {
		const { machine, loading } = this.state;

		if (!force && loading) {
			return;
		}

		this.setState({ loading: 'reload' });

		fetch(`machine/${encodeURIComponent(machine.id)}?ip`)
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						this.setState({
							machine: body,
							loading: null
						});
					});
				}
				this.setState({ loading: null });
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const { machine, loading } = this.state;

		let rdpOrSnapshotButton;
		if (machine.state === 'running') {
			if ('rdp-port' in machine) {
				rdpOrSnapshotButton = (
					<Button icon color="blue" basic onClick={() => this.openRdp()}>
						{`RDP: ${machine['rdp-port']}`}
						<Icon name="external alternate" />
					</Button>
				);
			}
		} else if (machine.state === 'poweroff' && machine.id.endsWith('-template')) {
			rdpOrSnapshotButton = (
				<Popup
					on="click" hideOnScroll
					trigger={(
						<Button icon color="violet" loading={loading === 'snapshot'} disabled={!!loading}>
							<Icon name="save" />
							{' Snapshot'}
						</Button>
					)}
					onOpen={() => setTimeout(() => this.refs.snapshotName.focus(), 1)}
				>
					<Form style={{ marginBottom: '0px' }}>
						<Input
							ref="snapshotName"
							placeholder="Snapshot name"
							defaultValue={this.getNextSnapshot()}
						/>
						<Button
							positive
							onClick={() => this.createSnapshot(this.refs.snapshotName.inputRef.current.value)}
						>
							Create
						</Button>
					</Form>
				</Popup>
			);
		}

		let stateButton;
		if (machine.state === 'poweroff') {
			stateButton = (
				<Button
					icon primary
					disabled={!!loading}
					loading={loading === 'running'}
					onClick={() => this.setMachineState('running')}
				>
					<Icon name="bolt" />
					{' Power on'}
				</Button>
			);
		} else if (machine.state === 'running') {
			stateButton = (
				<Button.Group>
					<Button
						icon color="yellow"
						disabled={!!loading}
						loading={loading === 'acpipowerbutton'}
						onClick={() => this.setMachineState('acpipowerbutton')}
					>
						<Icon name="power off" />
						{' Shutdown'}
					</Button>
					<Button.Or />
					<Button
						icon negative
						disabled={!!loading}
						loading={loading === 'poweroff'}
						onClick={() => this.setMachineState('poweroff')}
					>
						<Icon name="plug" />
						{' Power off'}
					</Button>
				</Button.Group>
			);
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
				<Table.Cell>{machine.id}</Table.Cell>
				<Table.Cell>{machine.state}</Table.Cell>
				<Table.Cell />
				<Table.Cell>{machine.snapshot}</Table.Cell>
				<Table.Cell />
				<Table.Cell>{ip}</Table.Cell>
				<Table.Cell collapsing>{rdpOrSnapshotButton}</Table.Cell>
				<Table.Cell collapsing style={{ textAlign: 'right' }}>{stateButton}</Table.Cell>
				<Table.Cell collapsing>
					<Button icon loading={loading === 'reload'} disabled={!!loading} onClick={() => this.reload()}>
						<Icon name="sync alternate" />
					</Button>
				</Table.Cell>
			</Table.Row>
		);
	}
}


export default function ({ machines, activeTab }) {
	const tabs = [
		['machine', 'All machines'],
		['machine?templates', 'Templates'],
		['machine?running', 'Running machines']
	].map((link, i) => (
		<a key={i} className={activeTab === i ? 'active item' : 'item'} href={link[0]}>{link[1]}</a>
	));

	return (
		<Grid>
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
								<Table.HeaderCell />
								<Table.HeaderCell />
								<Table.HeaderCell />
							</Table.Row>
						</Table.Header>
						<tbody>
							{machines.map(machine => <Machine key={machine.id} machine={machine} />)}
						</tbody>
					</Table>
				</div>
			</Grid.Column>
		</Grid>
	);
}
