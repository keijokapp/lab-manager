import React from 'react';
import { Button, Form, Grid, Header, Icon, Input, Popup, Table } from 'semantic-ui-react';
import request from '../request';


class LabRow extends React.Component {
	constructor() {
		super();
		this.state = {
			loading: false
		};
	}

	deleteLab() {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'delete' });
		request.delete('lab/' + encodeURIComponent(this.props.lab._id) + '?rev=' + encodeURIComponent(this.props.lab._rev))
			.then(response => {
				if(response.ok) {
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
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'clone' });
		request.post('lab/' + encodeURIComponent(cloneName), this.props.lab)
			.then(response => {
				if(response.ok) {
					return response.json().then(body => {
						window.location.href = 'lab/' + encodeURIComponent(body._id);
					});
				} else {
					this.setState({ loading: null });
				}
			})
			.catch(e => {
				this.setState({ loading: null });
			});
	}

	startLab(username) {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'start' });
		const resourceUrl = 'lab/' + encodeURIComponent(this.props.lab._id) + '/instance/' + encodeURIComponent(username);
		request.post(resourceUrl + '?rev=' + encodeURIComponent(this.props.lab._rev))
			.then(response => {
				if(response.ok) {
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
		const lab = this.props.lab;

		const repositories = [];
		for(const id in lab.repositories) {
			repositories.push(<p key={id}>{id} ({lab.repositories[id]})</p>)
		}

		return <Table.Row>
			<Table.Cell>{lab._id}</Table.Cell>
			<Table.Cell>{'assistant' in lab ? lab.assistant.url : <i>None</i>}</Table.Cell>
			<Table.Cell>{'machineOrder' in lab ? lab.machineOrder.map(id => <p
					key={id}>{lab.machines[id].base} ({lab.machines[id].description})</p>) :
				<i>None</i>}</Table.Cell>
			<Table.Cell singleLine>
				{repositories.length ? repositories : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>
				{'endpoints' in lab ? lab.endpoints.map(name => <p key={name}>{name}</p>) : <i>None</i>}
			</Table.Cell>
			<Table.Cell><a href={'lab/' + encodeURIComponent(lab._id)}>Details</a></Table.Cell>
			<Table.Cell collapsing>
				<Popup on="click" position="top center" wide hideOnScroll
				       trigger={<Button color="green" disabled={!!this.state.loading}
				                        loading={this.state.loading === 'start'}
				                        icon><Icon name="caret square right"/> Start</Button>}
				       onOpen={() => setTimeout(() => this.refs.username.focus(), 1)}>
					<Form style={{ marginBottom: '0px' }}>
						<Input ref="username" placeholder="Username"/><br/>
						<Button positive onClick={() => this.startLab(this.refs.username.inputRef.value)}>Go</Button>
					</Form>
				</Popup>
			</Table.Cell>
			<Table.Cell collapsing>
				<Popup on="click" position="top center" wide hideOnScroll
				       trigger={<Button color="violet" disabled={!!this.state.loading}
				                        loading={this.state.loading === 'clone'}
				                        icon><Icon name="clone"/> Clone</Button>}
				       onOpen={() => setTimeout(() => this.refs.cloneName.focus(), 1)}>
					<Form style={{ marginBottom: '0px' }}>
						<Input ref="cloneName" placeholder="Lab name" defaultValue={lab._id}/>
						<Button positive
						        onClick={() => this.cloneLab(this.refs.cloneName.inputRef.value)}>Create</Button>
					</Form>
				</Popup>
			</Table.Cell>
			<Table.Cell collapsing>
				<Popup on="click" position="top center" wide hideOnScroll
				       trigger={<Button negative disabled={!!this.state.loading}
				                        loading={this.state.loading === 'delete'} icon><Icon
					       name="trash"/> Delete</Button>}>
					<Button negative onClick={() => this.deleteLab()}>Confirm deletion</Button>
				</Popup>
			</Table.Cell>
		</Table.Row>;
	}
}


export default class Labs extends React.Component {

	constructor(props) {
		super();
		this.state = {
			labs: props.labs,
			loading: false
		};
	}

	newLab(newName) {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'new' });
		request.post('lab/' + encodeURIComponent(newName), {})
			.then(response => {
				if(response.ok) {
					return response.json().then(body => {
						window.location.href = 'lab/' + encodeURIComponent(body._id);
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
		const labs = [];

		for(const lab of this.state.labs) {
			labs.push(<LabRow key={lab._id} lab={lab}/>);
		}

		return <Grid>
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
							<Table.HeaderCell colSpan={4}/>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{labs}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.Cell colSpan={7}>
								<Popup on="click" position="top center" wide
								       trigger={<Button positive disabled={!!this.state.loading}
								                        loading={this.state.loading === 'new'}>New</Button>}
								       onOpen={() => setTimeout(() => this.refs['newName'].focus(), 1)}>
									<Form style={{ marginBottom: '0px' }}>
										<Input ref="newName" placeholder="Lab name"/>
										<Button positive
										        onClick={() => this.newLab(this.refs.newName.inputRef.value)}>Create</Button>
									</Form>
								</Popup>
							</Table.Cell>
						</Table.Row>
					</Table.Footer>
				</Table>
			</Grid.Column>
		</Grid>;
	}
}
