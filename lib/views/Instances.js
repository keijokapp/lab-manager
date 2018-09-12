import React from 'react';
import { Button, Grid, Header, Icon, Popup, Table } from 'semantic-ui-react';
import { TimeSince } from './util';


class LabRow extends React.Component {
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
		fetch('lab/' + encodeURIComponent(this.props.instance.lab._id) + '/instance/' + this.props.instance.username, {
			method: 'DELETE',
			headers: { 'if-match': this.props.instance._rev }
		})
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

	render() {
		const instance = this.props.instance;
		const startTime = new Date(instance.startTime);

		const repositories = [];
		for(const id in instance.lab.repositories) {
			repositories.push(<p key={id}>{id} ({instance.lab.repositories[id]})</p>)
		}

		return <Table.Row>
			<Table.Cell>{instance.lab._id}</Table.Cell>
			<Table.Cell>{instance.username}</Table.Cell>
			<Table.Cell>{'assistant' in instance.lab ? instance.lab.assistant.url : <i>None</i>}</Table.Cell>
			<Table.Cell>
				{'machines' in instance ? instance.lab.machineOrder.map(id => <p
					key={id}>{instance.machines[id].name} ({instance.lab.machines[id].description})</p>) : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>{repositories.length ? repositories : <i>None</i>}</Table.Cell>
			<Table.Cell>
				{'endpoints' in instance ? instance.lab.endpoints.map(id => <p key={id}><a
					href={instance.endpoints[id].link}
					target="_blank">{id}</a></p>) : <i>None</i>}
			</Table.Cell>
			<Table.Cell singleLine>
				<p>{startTime.toDateString() + ' ' + startTime.toTimeString().split(' ')[0]}</p>
				<p><TimeSince date={startTime}/> ago</p>
			</Table.Cell>
			<Table.Cell><a
				href={'lab/' + encodeURIComponent(instance.lab._id) + '/instance/' + encodeURIComponent(instance.username)}>Details</a></Table.Cell>
			<Table.Cell collapsing>
				<Popup on="click" position="top center" wide hideOnScroll
				       trigger={<Button negative disabled={!!this.state.loading}
				                        loading={this.state.loading === 'delete'} icon><Icon
					       name="trash"/> Delete</Button>}>
					<Button negative onClick={() => this.deleteInstance()}>Confirm deletion</Button>
				</Popup>
			</Table.Cell>
		</Table.Row>;
	}
}

export default class Instances extends React.Component {
	constructor(props) {
		super();

		const derivedDataCache = {};
		for(const instance of props.instances) {
			derivedDataCache[instance._id] = {
				lab: instance.lab._id,
				username: instance.username,
				assistant: 'assistant' in instance.lab ? instance.lab.assistant.url : '',
				machines: 'machineOrder' in instance.lab ? instance.lab.machineOrder.length : 0,
				repositories: 'endpoints' in instance.lab ? instance.lab.endpoints.length : 0,
				endpoints: 'endpoints' in instance.lab ? instance.lab.endpoints.length : 0,
				startTime: instance.startTime
			};
		}

		this.state = {
			instances: props.instances,
			derivedDataCache,
			loading: null,
			column: null,
			direction: null
		};
	}

	handleSort(clickedColumn) {
		return () => {
			if(this.state.column !== clickedColumn) {
				this.setState({
					column: clickedColumn,
					instances: this.state.instances.slice().sort((one, another) => this.state.derivedDataCache[one._id][clickedColumn] - this.state.derivedDataCache[another._id][clickedColumn]),
					direction: 'ascending'
				});
			} else {
				this.setState({
					instances: this.state.instances.reverse(),
					direction: this.state.direction === 'ascending' ? 'descending' : 'ascending'
				});
			}
		};
	}

	render() {
		const instances = [];

		for(const instance of this.state.instances) {
			instances.push(<LabRow key={instance._id} instance={instance}/>);
		}

		const { direction, column } = this.state;

		return <Grid>
			<Grid.Column>
				<Header size="large" color="teal">Running Labs</Header>
				<Table sortable>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell
								sorted={column === 'lab' ? direction : null}
								onClick={this.handleSort('lab')}>Lab</Table.HeaderCell>
							<Table.HeaderCell
								sorted={column === 'username' ? direction : null}
								onClick={this.handleSort('username')}>Username</Table.HeaderCell>
							<Table.HeaderCell
								sorted={column === 'assistant' ? direction : null}
								onClick={this.handleSort('assistant')}>Assistant</Table.HeaderCell>
							<Table.HeaderCell
								sorted={column === 'machines' ? direction : null}
								onClick={this.handleSort('machines')}>Machines</Table.HeaderCell>
							<Table.HeaderCell
								sorted={column === 'repositories' ? direction : null}
								onClick={this.handleSort('repositories')}>Repositories</Table.HeaderCell>
							<Table.HeaderCell
								sorted={column === 'endpoints' ? direction : null}
								onClick={this.handleSort('endpoints')}>Endpoints</Table.HeaderCell>
							<Table.HeaderCell
								sorted={column === 'startTime' ? direction : null}
								onClick={this.handleSort('startTime')}>Start time</Table.HeaderCell>
							<Table.HeaderCell colSpan="2"/>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{instances}
					</Table.Body>
				</Table>
			</Grid.Column>
		</Grid>;
	}
}
