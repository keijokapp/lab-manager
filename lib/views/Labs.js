import React from 'react';
import { Button, Form, Grid, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';


class LabRow extends React.Component {
	constructor() {
		super();
		this.state = {
			loading: false
		};
	}

	deleteLab() {
		const { lab } = this.props;
		const { loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: 'delete' });
		fetch(`lab/${encodeURIComponent(lab._id)}`, {
			method: 'DELETE',
			headers: { 'if-match': lab._rev }
		})
			.then(response => {
				if (response.ok) {
					window.location.reload();
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	cloneLab(cloneName) {
		const { lab } = this.props;
		const { loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: 'clone' });
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

				this.setState({ loading: null });
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	startLab(username) {
		const { lab } = this.props;
		const { loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: 'start' });
		const resourceUrl = `lab/${encodeURIComponent(lab._id)}/instance/${encodeURIComponent(username)}`;
		fetch(resourceUrl, {
			method: 'POST',
			headers: { 'if-match': lab._rev }
		})
			.then(response => {
				if (response.ok) {
					window.location.href = resourceUrl;
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const { lab } = this.props;
		const { loading } = this.state;

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
						onOpen={() => setTimeout(() => this.refs.username.focus(), 1)}
					>
						<Form style={{ marginBottom: '0px' }}>
							<Input ref="username" placeholder="Username" />
							<br />
							<Button
								positive
								onClick={() => this.startLab(this.refs.username.inputRef.current.value)}
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
								color="violet" disabled={!!loading}
								loading={loading === 'clone'}
								icon
							>
								<Icon name="clone" />
								{' Clone'}
							</Button>
						)}
						onOpen={() => setTimeout(() => this.refs.cloneName.focus(), 1)}
					>
						<Form style={{ marginBottom: '0px' }}>
							<Input ref="cloneName" placeholder="Lab name" defaultValue={lab._id} />
							<Button
								positive
								onClick={() => this.cloneLab(this.refs.cloneName.inputRef.current.value)}
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
						<Button negative onClick={() => this.deleteLab()}>Confirm deletion</Button>
					</Popup>
				</Table.Cell>
			</Table.Row>
		);
	}
}


export default class Labs extends React.Component {
	constructor(props) {
		super();
		this.state = {
			loading: false
		};
	}

	newLab(newName) {
		const { loading } = this.state;

		if (loading) {
			return;
		}

		this.setState({ loading: 'new' });
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

				this.setState({ loading: null });
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	render() {
		const { labs } = this.props;
		const { loading } = this.state;

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
										onOpen={() => setTimeout(() => this.refs.newName.focus(), 1)}
									>
										<Form style={{ marginBottom: '0px' }}>
											<Input ref="newName" placeholder="Lab name" />
											<Button
												positive
												onClick={() => this.newLab(this.refs.newName.inputRef.current.value)}
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
}
