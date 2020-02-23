import React, { useState, useRef } from 'react';
import { Button, Form, Grid, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';


function Machine({ machine: initialMachine }) {
	const [machine, setMachine] = useState(initialMachine);
	const [loading, setLoading] = useState(null);
	const [snapshotPopupOpen, setSnapshotPopupOpen] = useState(false);
	const snapshotNameRef = useRef(null);

	function getNextSnapshot() {
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

	function setMachineState(state) {
		if (loading) {
			return;
		}

		setLoading(state);
		fetch(`machine/${encodeURIComponent(machine.id)}?ip`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ state })
		})
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						setMachine({ ...machine, ...body });
						setLoading(null);
					});
				}
				setLoading(null);
			})
			.catch(e => {
				setLoading(null);
			});
	}

	function createSnapshot(snapshotName) {
		if (loading) {
			return;
		}

		setLoading('snapshot');
		fetch(`machine/${encodeURIComponent(machine.id)}/snapshot/${encodeURIComponent(snapshotName)}`, {
			method: 'POST'
		})
			.then(response => {
				if (response.ok) {
					reload(true);
				} else {
					setLoading(null);
				}
			})
			.catch(e => {
				setLoading(null);
			});
	}

	function openRdp() {
		window.open(`${config.remote}/${encodeURIComponent(machine.id)}`);
	}

	function reload(force) {
		if (!force && loading) {
			return;
		}

		setLoading('reload');
		fetch(`machine/${encodeURIComponent(machine.id)}?ip`)
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						setMachine(body);
						setLoading(null);
						setSnapshotPopupOpen(false);
					});
				}
				setLoading(null);
			})
			.catch(e => {
				setLoading(null);
			});
	}

	let rdpOrSnapshotButton;
	if (machine.state === 'running') {
		if ('rdp-port' in machine) {
			rdpOrSnapshotButton = (
				<Button icon color="blue" basic onClick={() => openRdp()}>
					{`RDP: ${machine['rdp-port']}`}
					<Icon name="external alternate" />
				</Button>
			);
		}
	} else if (machine.state === 'poweroff' && machine.id.endsWith('-template')) {
		rdpOrSnapshotButton = (
			<Popup
				on="click" hideOnScroll
				open={snapshotPopupOpen}
				trigger={(
					<Button icon color="violet" loading={loading === 'snapshot'} disabled={!!loading}>
						<Icon name="save" />
						{' Snapshot'}
					</Button>
				)}
				onOpen={() => {
					setSnapshotPopupOpen(true);
					setTimeout(() => snapshotNameRef.current.focus(), 1);
				}}
				onClose={() => { setSnapshotPopupOpen(false); }}
			>
				<Form style={{ marginBottom: '0px' }}>
					<Input
						ref={snapshotNameRef}
						placeholder="Snapshot name"
						defaultValue={getNextSnapshot()}
					/>
					<Button
						positive
						onClick={() => createSnapshot(snapshotNameRef.current.inputRef.current.value)}
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
				onClick={() => setMachineState('running')}
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
					onClick={() => setMachineState('acpipowerbutton')}
				>
					<Icon name="power off" />
					{' Shutdown'}
				</Button>
				<Button.Or />
				<Button
					icon negative
					disabled={!!loading}
					loading={loading === 'poweroff'}
					onClick={() => setMachineState('poweroff')}
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
				<Button icon loading={loading === 'reload'} disabled={!!loading} onClick={() => reload()}>
					<Icon name="sync alternate" />
				</Button>
			</Table.Cell>
		</Table.Row>
	);
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
