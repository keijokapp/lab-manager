import React, { useState } from 'react';
import { Button, Grid, Header, Icon, Label, Table } from 'semantic-ui-react';
import copy from 'copy-to-clipboard';


function Repository({ name, link, refs: initialRefs }) {
	const [refs, setRefs] = useState(initialRefs);
	const [loading, setLoading] = useState(null);
	const [showMore, setShowMore] = useState(false);

	function fetchRepositoriy() {
		if (loading) {
			return;
		}

		setLoading('fetch');
		fetch(`repository/${encodeURIComponent(name)}/fetch`, {
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

	function reload(force) {
		if (!force && loading) {
			return;
		}

		setLoading('reload');
		fetch(`repository/${encodeURIComponent(name)}`)
			.then(response => {
				if (response.ok) {
					return response.json().then(body => {
						setRefs(body.refs);
						setLoading(null);
					});
				}
				setLoading(null);
			})
			.catch(e => {
				setLoading(null);
			});
	}

	const commits = {};

	for (const ref in refs) {
		const commit = refs[ref];
		if (commit in commits) {
			commits[commit].push(ref);
		} else {
			commits[commit] = [ref];
		}
	}

	const refNodes = [];
	let hasMaster = false;
	for (const commit in commits) {
		const names = commits[commit].map(name => (
			<Label
				key={name}
				color={name === 'master'
					? 'green'
					: (name === 'dev' ? 'yellow' : (name.endsWith('-dev') ? 'orange' : undefined))}
				tag
			>
				{name}
			</Label>
		));
		const el = (
			<div key={commit}>
				<Label basic>{commit.slice(0, 8)}</Label>
				{names}
			</div>
		);
		if (commits[commit].includes('master')) {
			refNodes.splice(0, 0, el);
			hasMaster = true;
		} else if (commits[commit].includes('dev')) {
			refNodes.splice(hasMaster ? 1 : 0, 0, el);
		} else {
			refNodes.push(el);
		}
	}

	return (
		<Table.Row verticalAlign="top">
			<Table.Cell>{name}</Table.Cell>
			<Table.Cell>
				{showMore ? refNodes : refNodes.slice(0, 3)}
				{refNodes.length > 3 && (
					<div>
						<Button
							style={{
								boxShadow: 'none',
								background: 'none',
								color: '#4183c4'
							}}
							onClick={() => { setShowMore(!showMore); }}
						>
							{showMore ? 'Show less' : `${refNodes.length - 3} more`}
						</Button>
					</div>
				)}
			</Table.Cell>
			<Table.Cell>
				<Label size="big">
					{link}
					<Icon
						name="clipboard outline"
						style={{ cursor: 'pointer', margin: '0 0 0 1em' }}
						onClick={() => copy(link)}
					/>
				</Label>
			</Table.Cell>
			<Table.Cell collapsing>
				<Button
					icon color="violet"
					loading={loading === 'fetch'}
					disabled={!!loading} onClick={() => fetchRepositoriy()}
				>
					<Icon name="download" />
					{' Fetch'}
				</Button>
			</Table.Cell>
			<Table.Cell collapsing>
				<Button
					icon
					loading={loading === 'reload'}
					disabled={!!loading} onClick={() => reload()}
				>
					<Icon name="sync alternate" />
				</Button>
			</Table.Cell>
		</Table.Row>
	);
}


export default function ({ repositories }) {
	return (
		<Grid>
			<Grid.Column>
				<Header size="large" color="teal">Repositories</Header>
				<Table selectable>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>Name</Table.HeaderCell>
							<Table.HeaderCell>Refs</Table.HeaderCell>
							<Table.HeaderCell>Clone URL</Table.HeaderCell>
							<Table.HeaderCell />
							<Table.HeaderCell />
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{repositories.map(repository => (
							<Repository
								key={repository._id}
								name={repository._id}
								refs={repository.refs}
								link={repository.link}
							/>
						))}
					</Table.Body>
				</Table>
			</Grid.Column>
		</Grid>
	);
}
