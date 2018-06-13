import React from 'react';
import { Button, Grid, Header, Icon, Label, Table } from 'semantic-ui-react';
import CopyToClipboard from 'react-copy-to-clipboard';
import request from '../request';


class Repository extends React.Component {
	constructor(props) {
		super();
		this.state = {
			name: props.name,
			refs: props.refs,
			link: props.link,
			showMore: false
		};
	}

	fetch() {
		if(this.state.loading) {
			return;
		}

		this.setState({ loading: 'fetch' });
		request.post('repository/' + encodeURIComponent(this.state.name) + '/fetch')
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

	reload(force) {
		if(!force && this.state.loading) {
			return;
		}

		this.setState({ loading: 'reload' });
		request.get('repository/' + encodeURIComponent(this.state.name))
			.then(response => {
				if(response.ok) {
					return response.json().then(body => {
						this.setState({
							refs: body.refs,
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

		const commits = {};

		for(const [commit, name] of this.state.refs) {
			if(commit in commits) {
				commits[commit].push(name);
			} else {
				commits[commit] = [name];
			}
		}

		const refs = [];
		let hasMaster = false;
		for(const commit in commits) {
			const names = commits[commit].map(name => <Label key={name}
			                                                 color={name === 'master' ? 'green' : (name === 'dev' ? 'yellow' : (name.endsWith('-dev') ? 'orange' : undefined))}
			                                                 tag>{name}</Label>);
			const el = <div key={commit}><Label basic>{commit.slice(0, 8)}</Label> {names}</div>;
			if(commits[commit].includes('master')) {
				refs.splice(0, 0, el);
				hasMaster = true;
			} else if(commits[commit].includes('dev')) {
				refs.splice(hasMaster ? 1 : 0, 0, el);
			} else {
				refs.push(el);
			}
		}

		const showMore = refs.length > 3 ? <div><a href="javascript:void(0)" onClick={() => {
			this.setState({ showMore: !this.state.showMore })
		}}>{this.state.showMore ? 'Show less' : refs.length - 3 + ' more'}</a></div> : undefined;

		return <Table.Row verticalAlign="top">
			<Table.Cell>{this.state.name}</Table.Cell>
			<Table.Cell>{this.state.showMore ? refs : refs.slice(0, 3)}{showMore}</Table.Cell>
			<Table.Cell>
				<Label size="big">
					{this.state.link} <CopyToClipboard text={this.state.link}><Icon name="clipboard outline"
					                                                                style={{ cursor: 'pointer' }}/></CopyToClipboard>
				</Label>
			</Table.Cell>
			<Table.Cell collapsing>
				<Button icon color="violet" loading={this.state.loading === 'fetch'} disabled={!!this.state.loading}
				        onClick={() => this.fetch()}>
					<Icon name="download"/> Fetch
				</Button>
			</Table.Cell>
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
	const repositories = props.repositories.map(repository => <Repository key={repository._id} name={repository._id}
	                                                                      refs={repository.refs}
	                                                                      link={repository.link}/>);

	return <Grid>
		<Grid.Column>
			<Header size="large" color="teal">Repositories</Header>
			<Table selectable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Name</Table.HeaderCell>
						<Table.HeaderCell>Refs</Table.HeaderCell>
						<Table.HeaderCell>Clone URL</Table.HeaderCell>
						<Table.HeaderCell/>
						<Table.HeaderCell/>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{repositories}
				</Table.Body>
			</Table>
		</Grid.Column>
	</Grid>;
};
