import React, { useState, useRef } from 'react';
import { Button, Form, Grid, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';

function LabRow({ lab }) {
	const [loading, setLoading] = useState(null);
	const usernameRef = useRef(null);
	const cloneNameRef = useRef(null);

	function deleteLab() {
		if (loading) {
			return;
		}

		setLoading('delete');
		fetch(`lab/${encodeURIComponent(lab._id)}`, {
			method: 'DELETE',
			headers: { 'if-match': lab._rev }
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

	function cloneLab(cloneName) {
		if (loading) {
			return;
		}

		setLoading('clone');
		fetch(`lab/${encodeURIComponent(cloneName)}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(lab)
		})
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						window.location.href = `lab/${encodeURIComponent(body._id)}`;
					});
				}
				setLoading(null);
			})
			.catch(e => {
				setLoading(null);
			});
	}

	function startLab(username) {
		if (loading) {
			return;
		}

		setLoading('start');
		const resourceUrl = `lab/${encodeURIComponent(lab._id)}/instance/${encodeURIComponent(username)}`;
		fetch(resourceUrl, {
			method: 'POST',
			headers: { 'if-match': lab._rev }
		})
			.then(response => {
				if (response.ok) {
					window.location.href = resourceUrl;
				} else {
					setLoading(null);
				}
			})
			.catch(e => {
				setLoading(null);
			});
	}

	const repositories = 'repositories' in lab && Object.keys(lab.repositories).map(id => (
		<p key={id}>
			{`${id} (${lab.repositories[id].name}${lab.repositories[id].head
				? `/${lab.repositories[id].head}` : ''})`}
		</p>
	));

	return (
		<Table.Row>
			<Table.Cell>{lab._id}</Table.Cell>
			<Table.Cell>{'assistant' in lab ? lab.assistant.url : <i>None</i>}</Table.Cell>
			<Table.Cell>
				{'machineOrder' in lab ? lab.machineOrder.map(id => (
					<p key={id}>{`${lab.machines[id].base} (${lab.machines[id].description})`}</p>
				)) : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>
				{repositories.length ? repositories : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>
				{'endpoints' in lab ? lab.endpoints.map(name => <p key={name}>{name}</p>) : <i>None</i>}
			</Table.Cell>
			<Table.Cell><a href={`lab/${encodeURIComponent(lab._id)}`}>Details</a></Table.Cell>
			<Table.Cell collapsing>
				<Popup
					on="click" position="top center" wide hideOnScroll
					trigger={(
						<Button
							color="green"
							disabled={!!loading}
							loading={loading === 'start'}
							icon
						>
							<Icon name="caret square right" />
							{' Start'}
						</Button>
					)}
					onOpen={() => setTimeout(() => usernameRef.current.focus(), 1)}
				>
					<Form style={{ marginBottom: '0px' }}>
						<Input ref={usernameRef} placeholder="Username" />
						<br />
						<Button
							positive
							onClick={() => startLab(usernameRef.current.inputRef.current.value)}
						>
							Go
						</Button>
					</Form>
				</Popup>
			</Table.Cell>
			<Table.Cell collapsing>
				<Popup
					on="click" position="top center" wide hideOnScroll
					trigger={(
						<Button
							color="violet"
							disabled={!!loading}
							loading={loading === 'clone'}
							icon
						>
							<Icon name="clone" />
							{' Clone'}
						</Button>
					)}
					onOpen={() => setTimeout(() => cloneNameRef.current.focus(), 1)}
				>
					<Form style={{ marginBottom: '0px' }}>
						<Input ref={cloneNameRef} placeholder="Lab name" defaultValue={lab._id} />
						<Button
							positive
							onClick={() => cloneLab(cloneNameRef.current.inputRef.current.value)}
						>
							Create
						</Button>
					</Form>
				</Popup>
			</Table.Cell>
			<Table.Cell collapsing>
				<Popup
					on="click" position="top center" wide hideOnScroll
					trigger={(
						<Button
							negative
							disabled={!!loading}
							loading={loading === 'delete'} icon
						>
							<Icon name="trash" />
							{' Delete'}
						</Button>
					)}
				>
					<Button negative onClick={() => deleteLab()}>Confirm deletion</Button>
				</Popup>
			</Table.Cell>
		</Table.Row>
	);
}

export default function ({ labs }) {
	const [loading, setLoading] = useState(null);
	const newLabNameRef = useRef(null);

	function newLab(newName) {
		if (loading) {
			return;
		}

		setLoading('new');
		fetch(`lab/${encodeURIComponent(newName)}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({})
		})
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						window.location.href = `lab/${encodeURIComponent(body._id)}`;
					});
				}
				setLoading(null);
			})
			.catch(e => {
				setLoading(null);
			});
	}

	return (
		<Grid>
			<Grid.Column>
				<Header size="large" color="teal">Labs</Header>
				<Table>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>Lab</Table.HeaderCell>
							<Table.HeaderCell>Assistant</Table.HeaderCell>
							<Table.HeaderCell>Machines</Table.HeaderCell>
							<Table.HeaderCell>Repositories</Table.HeaderCell>
							<Table.HeaderCell>Endpoints</Table.HeaderCell>
							<Table.HeaderCell colSpan={4} />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{labs.map(lab => <LabRow key={lab._id} lab={lab} />)}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.Cell colSpan={7}>
								<Popup
									on="click" position="top center" wide
									trigger={(
										<Button
											positive
											disabled={!!loading}
											loading={loading === 'new'}
										>
											New
										</Button>
									)}
									onOpen={() => setTimeout(() => newLabNameRef.current.focus(), 1)}
								>
									<Form style={{ marginBottom: '0px' }}>
										<Input ref={newLabNameRef} placeholder="Lab name" />
										<Button
											positive
											onClick={() => newLab(newLabNameRef.current.inputRef.current.value)}
										>
											Create
										</Button>
									</Form>
								</Popup>
							</Table.Cell>
						</Table.Row>
					</Table.Footer>
				</Table>
			</Grid.Column>
		</Grid>
	);
}
