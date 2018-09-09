'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _express = require('express');

var _expressOpenapiMiddleware = require('express-openapi-middleware');

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _common = require('../common');

var _renderLayout = require('../render-layout');

var _renderLayout2 = _interopRequireDefault(_renderLayout);

var _util = require('../util');

var _createInstance = require('../create-instance');

var _createInstance2 = _interopRequireDefault(_createInstance);

var _instanceSubroutes = require('./instance-subroutes');

var _instanceSubroutes2 = _interopRequireDefault(_instanceSubroutes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
exports.default = routes;


routes.get('/', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['Instance'],
	summary: 'List instances',
	responses: {
		200: {
			description: 'List of instances'
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {
	if (!(0, _common.authorize)(req.token)) {
		res.status(403).send({
			error: 'Permission Denied',
			message: 'Client is not authorized'
		});
		return;
	}

	const result = await _common.db.allDocs({ startkey: 'instance/', endkey: 'instance/\uffff', include_docs: true });

	const instances = result.rows.map(d => {
		d.doc._id = d.doc._id.slice(9);
		return d.doc;
	});

	res.format({
		html: function () {
			res.send((0, _renderLayout2.default)('Lab instances', { instances }, '<script src="bundle/instance.js"></script>'));
		},

		json: function () {
			res.send(instances);
		}
	});
}));

async function importInstanceFromITee(privateToken) {

	const response = await (0, _nodeFetch2.default)(_config2.default.iTee.url + '/labinfo.json' + '?uuid=' + encodeURIComponent(privateToken), {
		method: 'POST'
	});

	if (!response.ok) {
		_common.logger.error('Failed to fetch lab instance', { response: await response.text() });
		throw new Error('Failed to fetch lab instance');
	}

	const body = await response.json();

	if (body && body.message === 'Unable to find labuser with given uid') {
		return null;
	}

	if (typeof body !== 'object' || body === null || !body.success) {
		_common.logger.error('Bad response from I-Tee', { response: body });
		throw new Error('Bad response from I-Tee');
	}

	let lab;
	try {
		lab = await _common.db.get('lab/' + body.lab.name);
	} catch (e) {
		if (e.name === 'not_found') {
			return ['Lab does not exist'];
		}
		throw e;
	}

	lab._id = lab._id.slice(4);

	// Build instance object

	const consistencyErrors = [];
	const instance = {
		_id: 'instance/' + body.lab.name + ':' + body.user.username,
		username: body.user.username,
		imported: true,
		startTime: body.labuser.start,
		iTeeCompat: {
			instanceId: body.id,
			labId: body.lab.id,
			userId: body.user.id
		},
		lab,
		publicToken: body.labuser.token,
		privateToken: body.labuser.uuid
	};

	if ('labProxy' in _config2.default) {
		instance.labProxy = _config2.default.labProxy;
	}

	if ('assistant' in lab) {
		if (body.assistant.uri !== lab.assistant.url) {
			consistencyErrors.push('Assistant URL-s do not match');
		}
		if (body.lab.lab_hash !== lab.assistant.lab) {
			consistencyErrors.push('Assistant lab ID-s do not match');
		}
		if (body.lab.lab_token !== lab.assistant.key) {
			consistencyErrors.push('Assistant access keys do match');
		}

		if (typeof body.user.user_key !== 'string' || body.user.user_key.length < 1) {
			consistencyErrors.push('Invalid user key');
		} else {
			instance.assistant = {
				userKey: body.user.user_key,
				link: body.assistant.uri + '/lab/' + encodeURIComponent(body.lab.lab_hash) + '/' + encodeURIComponent(body.user.user_key)
			};
		}
	}

	if ('machines' in lab) {
		body.vms.sort((vm0, vm1) => vm0.lab_vmt.position - vm1.lab_vmt.position);
		if (body.vms.length !== lab.machineOrder.length) {
			consistencyErrors.push('Machine counts do not match');
		} else {
			instance.machines = {};
			for (let i = 0; i < body.vms.length; i++) {
				const iTeeMachine = body.vms[i];
				const machine = lab.machines[lab.machineOrder[i]];
				if (machine.type !== 'virtualbox') {
					consistencyErrors.push('Machine is not VirtualBox machine');
				}
				if (machine.base !== iTeeMachine.lab_vmt.vmt.image) {
					consistencyErrors.push('Machine base images do not match');
				}
				if (machine.description !== iTeeMachine.lab_vmt.nickname) {
					consistencyErrors.push('Machine descriptions do not match');
				}
				// TODO: validate and set networks
				instance.machines[lab.machineOrder[i]] = {
					name: iTeeMachine.name,
					networks: []
				};
			}
		}
	}

	if (consistencyErrors.length) {
		return consistencyErrors;
	}

	return (0, _createInstance2.default)(instance);
}

routes.use('/:token', (0, _expressOpenapiMiddleware.apiOperation)({
	parameters: [{
		in: 'path',
		name: 'token',
		description: 'Public or private token of instance',
		required: true,
		schema: {
			'type': 'string',
			'minLength': 1
		}
	}]
}), (0, _util.asyncMiddleware)(async (req, res) => {

	// No authorization

	const result = await _common.db.query('instance/uuid', { key: req.params.token, include_docs: true });
	if (result.rows.length === 0 && 'iTee' in _config2.default) {
		_common.logger.debug('Trying to import lab instance from I-Tee', { privateToken: req.params.token });
		const instance = await importInstanceFromITee(req.params.token);
		if (instance !== null) {
			if (typeof instance === 'string' && instance !== 'Instance already exists') {
				res.status(500).send({
					error: 'Internal Server Error',
					message: 'Failed to import lab instance from I-Tee',
					errors: instance
				});
			} else if (instance === 'instance already exists' || !('_id' in instance)) {
				res.status(409).send({
					error: 'Conflict',
					message: 'Failed to import lab instance from I-Tee',
					errors: instance
				});
			} else {
				req.instance = instance;
				req.instanceToken = req.params.token;
			}
		}
	} else if (result.rows.length === 1) {
		req.instance = result.rows[0].doc;
		req.instanceToken = req.params.token;
	}
}));

routes.use('/:token', _instanceSubroutes2.default);