'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _semanticUiReact = require('semantic-ui-react');

var _request = require('../request');

var _request2 = _interopRequireDefault(_request);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class LabRow extends _react2.default.Component {
	constructor() {
		super();
		this.state = {
			loading: null
		};
	}

	deleteInstance() {
		if (this.state.loading) {
			return;
		}

		this.setState({ loading: 'delete' });
		_request2.default.delete('lab/' + encodeURIComponent(this.props.instance.lab._id) + '/instance/' + this.props.instance.username + '?rev=' + encodeURIComponent(this.props.instance._rev)).then(response => {
			if (response.ok) {
				window.location.reload();
			} else {
				this.setState({ loading: null });
			}
		}).catch(e => {
			this.setState({ loading: null });
		});
	}

	render() {
		const instance = this.props.instance;
		const startTime = new Date(instance.startTime);

		const repositories = [];
		for (const id in instance.lab.repositories) {
			repositories.push(_react2.default.createElement(
				'p',
				{ key: id },
				id,
				' (',
				instance.lab.repositories[id],
				')'
			));
		}

		return _react2.default.createElement(
			_semanticUiReact.Table.Row,
			null,
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				instance.lab._id
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				instance.username
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				'assistant' in instance.lab ? instance.lab.assistant.url : _react2.default.createElement(
					'i',
					null,
					'None'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				'machines' in instance ? instance.lab.machineOrder.map(id => _react2.default.createElement(
					'p',
					{
						key: id },
					instance.machines[id].name,
					' (',
					instance.lab.machines[id].description,
					')'
				)) : _react2.default.createElement(
					'i',
					null,
					'None'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ singleLine: true },
				repositories.length ? repositories : _react2.default.createElement(
					'i',
					null,
					'None'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				'endpoints' in instance ? instance.lab.endpoints.map(id => _react2.default.createElement(
					'p',
					{ key: id },
					_react2.default.createElement(
						'a',
						{
							href: instance.endpoints[id].link,
							target: '_blank' },
						id
					)
				)) : _react2.default.createElement(
					'i',
					null,
					'None'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ singleLine: true },
				_react2.default.createElement(
					'p',
					null,
					startTime.toDateString()
				),
				_react2.default.createElement(
					'p',
					null,
					_react2.default.createElement(_util.TimeSince, { date: startTime }),
					' ago'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				null,
				_react2.default.createElement(
					'a',
					{
						href: 'lab/' + encodeURIComponent(instance.lab._id) + '/instance/' + encodeURIComponent(instance.username) },
					'Details'
				)
			),
			_react2.default.createElement(
				_semanticUiReact.Table.Cell,
				{ collapsing: true },
				_react2.default.createElement(
					_semanticUiReact.Popup,
					{ on: 'click', position: 'top center', wide: true, hideOnScroll: true,
						trigger: _react2.default.createElement(
							_semanticUiReact.Button,
							{ negative: true, disabled: !!this.state.loading,
								loading: this.state.loading === 'delete', icon: true },
							_react2.default.createElement(_semanticUiReact.Icon, {
								name: 'trash' }),
							' Delete'
						) },
					_react2.default.createElement(
						_semanticUiReact.Button,
						{ negative: true, onClick: () => this.deleteInstance() },
						'Confirm deletion'
					)
				)
			)
		);
	}
}

class Instances extends _react2.default.Component {
	constructor(props) {
		super();

		const derivedDataCache = {};
		for (const instance of props.instances) {
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
			if (this.state.column !== clickedColumn) {
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

		for (const instance of this.state.instances) {
			instances.push(_react2.default.createElement(LabRow, { key: instance._id, instance: instance }));
		}

		const { direction, column } = this.state;

		return _react2.default.createElement(
			_semanticUiReact.Grid,
			null,
			_react2.default.createElement(
				_semanticUiReact.Grid.Column,
				null,
				_react2.default.createElement(
					_semanticUiReact.Header,
					{ size: 'large', color: 'teal' },
					'Running Labs'
				),
				_react2.default.createElement(
					_semanticUiReact.Table,
					{ sortable: true },
					_react2.default.createElement(
						_semanticUiReact.Table.Header,
						null,
						_react2.default.createElement(
							_semanticUiReact.Table.Row,
							null,
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'lab' ? direction : null,
									onClick: this.handleSort('lab') },
								'Lab'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'username' ? direction : null,
									onClick: this.handleSort('username') },
								'Username'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'assistant' ? direction : null,
									onClick: this.handleSort('assistant') },
								'Assistant'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'machines' ? direction : null,
									onClick: this.handleSort('machines') },
								'Machines'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'repositories' ? direction : null,
									onClick: this.handleSort('repositories') },
								'Repositories'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'endpoints' ? direction : null,
									onClick: this.handleSort('endpoints') },
								'Endpoints'
							),
							_react2.default.createElement(
								_semanticUiReact.Table.HeaderCell,
								{
									sorted: column === 'startTime' ? direction : null,
									onClick: this.handleSort('startTime') },
								'Start time'
							),
							_react2.default.createElement(_semanticUiReact.Table.HeaderCell, { colSpan: '2' })
						)
					),
					_react2.default.createElement(
						_semanticUiReact.Table.Body,
						null,
						instances
					)
				)
			)
		);
	}
}
exports.default = Instances;