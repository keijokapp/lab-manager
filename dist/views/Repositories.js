'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semanticUiReact = require('semantic-ui-react');

var _copyToClipboard = require('copy-to-clipboard');

var _copyToClipboard2 = _interopRequireDefault(_copyToClipboard);

var _request = require('../request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Repository extends _react2.default.Component {
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
		if (this.state.loading) {
			return;
		}

		this.setState({ loading: 'fetch' });
		_request2.default.post('repository/' + encodeURIComponent(this.state.name) + '/fetch').then(response => {
			if (response.ok) {
				this.reload(true);
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	reload(force) {
		if (!force && this.state.loading) {
			return;
		}

		this.setState({ loading: 'reload' });
		_request2.default.get('repository/' + encodeURIComponent(this.state.name)).then(response => {
			if (response.ok) {
				return response.json().then(body => {
					this.setState({
						refs: body.refs,
						loading: null
					});
				});
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	render() {

		const commits = {};

		for (const [commit, name] of this.state.refs) {
			if (commit in commits) {
				commits[commit].push(name);
			} else {
				commits[commit] = [name];
			}
		}

		const refs = [];
		let hasMaster = false;
		for (const commit in commits) {
			const names = commits[commit].map(name => _react2.default.createElement(
				_semanticUiReact.Label,
				{ key: name,
					color: name === 'master' ? 'green' : name === 'dev' ? 'yellow' : name.endsWith('-dev') ? 'orange' : undefined,
					tag: true },
				name
			));
			const el = _react2.default.createElement(
				'div',
				{ key: commit },
				_react2.default.createElement(
					_semanticUiReact.Label,
					{ basic: true },
					commit.slice(0, 8)
				),
				' ',
				names
			);
			if (commits[commit].includes('master')) {
				refs.splice(0, 0, el);
				hasMaster = true;
			} else if (commits[commit].includes('dev')) {
				refs.splice(hasMaster ? 1 : 0, 0, el);
			} else {
				refs.push(el);
			}
		}

		const showMore = refs.length > 3 ? _react2.default.createElement(
			'div',
			null,
			_react2.default.createElement(
				'a',
				{ href: 'javascript:void(0)', onClick: () => {
						this.setState({ showMore: !this.state.showMore });
					} },
				this.state.showMore ? 'Show less' : refs.length - 3 + ' more'
			)
		) : undefined;

		return _react2.default.createElement(
			_semanticUiReact.Table.Row,
			{ verticalAlign: 'top' },
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				this.state.name
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				this.state.showMore ? refs : refs.slice(0, 3),
				showMore
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(
					_semanticUiReact.Label,
					{ size: 'big' },
					this.state.link,
					' ',
					_react2.default.createElement(_semanticUiReact.Icon, { name: 'clipboard outline',
						style: { cursor: 'pointer', padding: '0 0 0 01em' },
						onClick: () => (0, _copyToClipboard2.default)(this.state.link) })
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ icon: true, color: 'violet', loading: this.state.loading === 'fetch', disabled: !!this.state.loading,
						onClick: () => this.fetch() },
					_react2.default.createElement(_semanticUiReact.Icon, { name: 'download' }),
					' Fetch'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				_react2.default.createElement(
					_semanticUiReact.Button,
					{ icon: true, loading: this.state.loading === 'reload', disabled: !!this.state.loading,
						onClick: () => this.reload() },
					_react2.default.createElement(_semanticUiReact.Icon, { name: 'sync alternate' })
				)
			)
		);
	}
}

exports.default = props => {
	const repositories = props.repositories.map(repository => _react2.default.createElement(Repository, { key: repository._id, name: repository._id,
		refs: repository.refs,
		link: repository.link }));

	return _react2.default.createElement(
		_semanticUiReact.Grid,
		null,
		_react2.default.createElement(
			_semanticUiReact.Grid.Column,
			null,
			_react2.default.createElement(
				_semanticUiReact.Header,
				{ size: 'large', color: 'teal' },
				'Repositories'
			),
			_react2.default.createElement(
				_semanticUiReact.Table,
				{ selectable: true },
				_react2.default.createElement(
					_semanticUiReact.Table.Header,
					null,
					_react2.default.createElement(
						_semanticUiReact.Table.Row,
						null,
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'Name'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'Refs'
						),
						_react2.default.createElement(
							_semanticUiReact.Table.HeaderCell,
							null,
							'Clone URL'
						),
						_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null),
						_react2.default.createElement(_semanticUiReact.Table.HeaderCell, null)
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Table.Body,
					null,
					repositories
				)
			)
		)
	);
};