'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _express = require('express');

var _request = require('../request');

var _request2 = _interopRequireDefault(_request);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _common = require('../common');

var _renderLayout = require('../render-layout');

var _renderLayout2 = _interopRequireDefault(_renderLayout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
exports.default = routes;


routes.use((req, res, next) => {
	if ((0, _common.authorize)(req.token)) {
		next();
	} else {
		res.status(403).send({
			error: 'Permission Denied',
			message: 'Client is not authorized'
		});
	}
});

routes.get('/', (req, res, next) => {

	const activeTab = 'templates' in req.query ? 1 : 'running' in req.query ? 2 : 0;

	function getMachines(html) {

		const params = [];

		if ('running' in req.query) {
			params.push('running');
		}

		if ('templates' in req.query) {
			params.push('filter=' + encodeURIComponent('-template$'));
		}

		if ('detailed' in req.query || html) {
			params.push('detailed');
		}

		if ('ip' in req.query || html) {
			params.push('ip');
		}

		return _request2.default.get(_config2.default.virtualbox + '/machine?' + params.join('&')).then(response => {
			if (!response.ok) {
				return response.text().then(body => {
					_common.logger.error('Failed to request machines', { body });
					res.status(response.status).send(body);
					return Promise.reject(new Error('Failed to request machines'));
				});
			} else {
				return response.json();
			}
		});
	}

	let title;
	if ('running' in req.query && 'templates' in req.query) {
		title = 'Running templates';
	} else if ('templates' in req.query) {
		title = 'Templates';
	} else if ('running' in req.query) {
		title = 'Running machines';
	} else {
		title = 'Virtual machines';
	}

	res.format({
		html: function () {
			getMachines(true).then(body => {
				res.send((0, _renderLayout2.default)(title, { machines: body, activeTab }, '<script src="bundle/machine.js"></script>'));
			}).catch(next);
		},

		json: function () {
			getMachines().then(body => {
				res.send(body);
			}).catch(next);
		}
	});
});

routes.get('/:machine', (req, res, next) => {
	_request2.default.get(_config2.default.virtualbox + '/machine/' + encodeURIComponent(req.params.machine) + ('ip' in req.query ? '?ip' : '')).then(response => {
		if (response.ok) {
			return response.json().then(body => {
				res.status(response.status).send(body);
			});
		} else {
			return response.text().then(body => {
				res.status(response.status).send(body);
			});
		}
	}).catch(next);
});

routes.put('/:machine', (req, res, next) => {
	_request2.default.put(_config2.default.virtualbox + '/machine/' + encodeURIComponent(req.params.machine) + ('ip' in req.query ? '?ip' : ''), req.body).then(response => {
		if (response.ok) {
			return response.json().then(body => {
				res.status(response.status).send(body);
			});
		} else {
			return response.text().then(body => {
				res.status(response.status).send(body);
			});
		}
	}).catch(next);
});

routes.post('/:machine/snapshot/:snapshot', (req, res, next) => {
	_request2.default.post(_config2.default.virtualbox + '/machine/' + encodeURIComponent(req.params.machine) + '/snapshot/' + encodeURIComponent(req.params.snapshot)).then(response => {
		if (response.ok) {
			return response.json().then(body => {
				res.status(response.status).send(body);
			});
		} else {
			return response.text().then(body => {
				res.status(response.status).send(body);
			});
		}
	}).catch(next);
});