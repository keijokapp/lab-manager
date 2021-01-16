import React, { useState } from 'react';
import { Button, Grid, Header, Icon, Popup, Table } from 'semantic-ui-react';
import { TimeSince } from './util';

function LabRow({ instance }) {
	const [loading, setLoading] = useState(null);

	function deleteInstance() {
		if (loading) {
			return;
		}

		setLoading('delete');
		fetch(`lab/${encodeURIComponent(instance.lab._id)}/instance/${instance.username}`, {
			method: 'DELETE',
			headers: { 'if-match': instance._rev }
		})
			.then(response => {
				if (response.ok) {
					window.location.reload();
				} else {
					setLoading(null);
				}
			})
			.catch(e => {
				setLoading(null);
			});
	}

	const startTime = new Date(instance.startTime);

	const repositories = [];
	for (const id in instance.lab.repositories) {
		repositories.push(
			<p key={id}>
				{`${id} (${instance.lab.repositories[id].name}${instance.lab.repositories[id].head && `/${instance.lab.repositories[id].head}`})`}
			</p>
		);
	}

	return (
		<Table.Row>
			<Table.Cell>{instance.lab._id}</Table.Cell>
			<Table.Cell>{instance.username}</Table.Cell>
			<Table.Cell>{'assistant' in instance.lab ? instance.lab.assistant.url : <i>None</i>}</Table.Cell>
			<Table.Cell>
				{'machines' in instance ? instance.lab.machineOrder.map(id => (
					<p key={id}>
						{`${instance.machines[id].name} (${instance.lab.machines[id].description})`}
					</p>
				)) : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>{repositories.length ? repositories : <i>None</i>}</Table.Cell>
			<Table.Cell>
				{'endpoints' in instance ? instance.lab.endpoints.map(id => (
					<p key={id}>
						<a href={instance.endpoints[id].link} rel="noopener noreferrer" target="_blank">{id}</a>
					</p>
				)) : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>
				<p>{`${startTime.toDateString()} ${startTime.toTimeString().split(' ')[0]}`}</p>
				<p>
					<TimeSince date={startTime} />
					{' ago'}
				</p>
			</Table.Cell>
			<Table.Cell>
				<a href={`lab/${encodeURIComponent(instance.lab._id)}/instance/${encodeURIComponent(instance.username)}`}>Details</a>
			</Table.Cell>
			<Table.Cell collapsing>
				<Popup
					on="click" position="top center" wide hideOnScroll trigger={(
						<Button negative disabled={!!loading} loading={loading === 'delete'} icon>
							<Icon name="trash" />
							{' Delete'}
						</Button>
					)}
				>
					<Button negative onClick={() => deleteInstance()}>Confirm deletion</Button>
				</Popup>
			</Table.Cell>
		</Table.Row>
	);
}

export default function ({ instances: initialInstances }) {
	const [instances, setInstances] = useState(initialInstances);
	const [column, setColumn] = useState(null);
	const [direction, setDirection] = useState(null);

	function handleSort(clickedColumn) {
		return () => {
			const newInstances = instances.slice();
			if (column !== clickedColumn) {
				let comparator;
				switch (clickedColumn) {
				case 'lab':
					comparator = (a, b) => a.lab._id.localeCompare(b.lab._id);
					break;
				case 'username':
					comparator = (a, b) => a.username.localeCompare(b.username);
					break;
				case 'assistant':
					comparator = (a, b) => ('assistant' in a.lab ? a.lab.assistant.url : '')
						.localeCompare('assistant' in b.lab ? b.lab.assistant.url : '');
					break;
				case 'machines':
					comparator = (a, b) => ('machineOrder' in a.lab ? a.lab.machineOrder.length : 0)
						- ('machineOrder' in b.lab ? b.lab.machineOrder.length : 0);
					break;
				case 'repositories':
					comparator = (a, b) => ('repositories' in a.lab ? a.lab.repositories.length : 0)
						- ('repositories' in b.lab ? b.lab.repositories.length : 0);
					break;
				case 'endpoints':
					comparator = (a, b) => ('endpoints' in a.lab ? a.lab.endpoints.length : 0)
						- ('endpoints' in b.lab ? b.lab.endpoints.length : 0);
					break;
				case 'startTime':
					comparator = (a, b) => new Date(b.startTime) - new Date(a.startTime);
					break;
				}
				newInstances.sort(comparator);
				setColumn(clickedColumn);
				setDirection('ascending');
			} else {
				newInstances.reverse();
				setDirection(direction === 'ascending' ? 'descending' : 'ascending');
			}
			setInstances(newInstances);
		};
	}

	return (
		<Grid>
			<Grid.Column>
				<Header size="large" color="teal">Running Labs</Header>
				<Table sortable>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell sorted={column === 'lab' ? direction : null} onClick={handleSort('lab')}>
								Lab
							</Table.HeaderCell>
							<Table.HeaderCell sorted={column === 'username' ? direction : null} onClick={handleSort('username')}>
								Username
							</Table.HeaderCell>
							<Table.HeaderCell sorted={column === 'assistant' ? direction : null} onClick={handleSort('assistant')}>
								Assistant
							</Table.HeaderCell>
							<Table.HeaderCell sorted={column === 'machines' ? direction : null} onClick={handleSort('machines')}>
								Machines
							</Table.HeaderCell>
							<Table.HeaderCell sorted={column === 'repositories' ? direction : null} onClick={handleSort('repositories')}>
								Repositories
							</Table.HeaderCell>
							<Table.HeaderCell sorted={column === 'endpoints' ? direction : null} onClick={handleSort('endpoints')}>
								Endpoints
							</Table.HeaderCell>
							<Table.HeaderCell sorted={column === 'startTime' ? direction : null} onClick={handleSort('startTime')}>
								Start time
							</Table.HeaderCell>
							<Table.HeaderCell colSpan="2" />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{instances.map(instance => <LabRow key={instance._id} instance={instance} />)}
					</Table.Body>
				</Table>
			</Grid.Column>
		</Grid>
	);
}
