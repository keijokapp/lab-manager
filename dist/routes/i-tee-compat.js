'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.routes = undefined;

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _v = require('uuid/v4');

var _v2 = _interopRequireDefault(_v);

var _express = require('express');

var _expressOpenapiMiddleware = require('express-openapi-middleware');

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _util = require('../util');

var _common = require('../common');

var _createInstance = require('../create-instance');

var _createInstance2 = _interopRequireDefault(_createInstance);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const MACHINE_ID_MULTIPLIER = Math.pow(2, 48);

function instanceToLabUser(instance) {
	return {
		id: instance.iTeeCompat.instanceId,
		lab_id: instance.iTeeCompat.labId,
		user_id: instance.iTeeCompat.userId,
		// result: null,
		start: 'startTime' in instance ? instance.startTime : null,
		end: null,
		// pause: null,
		// created_at: "2018-08-13T09:39:29.000Z",
		// updated_at: "2018-08-13T10:27:07.000Z",
		// last_activity: "2018-08-13T09:39:41.000Z",
		// activity: "Start vm - 'wase-learning-xxe-server-5752b0676442ad6ff5481cee'",
		uuid: instance.privateToken,
		token: instance.publicToken
	};
}

function instanceToLabinfo(instance) {
	return {
		success: true,
		lab: {
			name: instance.lab._id,
			lab_hash: 'assistant' in instance.lab ? instance.lab.assistant.lab : '',
			lab_token: 'assistant' in instance.lab ? instance.lab.assistant.key : ''
		},
		assistant: 'assistant' in instance.lab ? {
			uri: instance.lab.assistant.url,
			enabled: true,
			version: 'v2'
		} : null,
		labuser: {
			start: instance.startTime,
			end: null,
			uuid: instance.privateToken,
			token: instance.publicToken
		},
		user: {
			username: instance.username,
			user_key: 'assistant' in instance ? instance.assistant.userKey : ''
		},
		vms: 'machineOrder' in instance.lab ? instance.lab.machineOrder.map((id, i) => ({
			name: instance.machines[id].name,
			lab_vmt: {
				name: instance.lab.machines[id].base,
				nickname: instance.lab.machines[id].description,
				position: i,
				primary: instance.lab.primaryMachine === id,
				allow_remote: !!instance.lab.machines[id].enable_remote,
				enable_rdp: !!instance.lab.machines[id].enable_remote,
				allow_restart: !!instance.lab.machines[id].enable_restart,
				expose_uuid: !instance.lab.machines[id].enable_private,
				lab_vmt_networks: instance.lab.machines[id].networks.map((n, i) => ({
					slot: i + 1,
					promiscuous: !!n.promiscuous,
					reinit_mac: !!n.resetMac,
					ip: 'ip' in n ? n.ip : '',
					network: {
						name: n.name,
						net_type: n.type === 'virtualbox' ? 'intnet' : 'bridged'
					}
				})),
				vmt: {
					image: instance.lab.machines[id].base,
					username: instance.lab.machines.instance.lab.machines[id].base
				}
			}
		})) : []
	};
}

/**
 * Fetches user from I-Tee
 * @param userId {integer} User ID
 * @returns {string} user
 */
async function fetchITeeUser(userId) {
	const response = await (0, _nodeFetch2.default)(_config2.default.iTee.url + '/users.json' + '?conditions[id]=' + encodeURIComponent(userId) + '&auth_token=' + encodeURIComponent(_config2.default.iTee.key), {
		headers: { 'x-request-id': (0, _common.reqid)() }
	});

	const body = await response.json();

	if (!response.ok || !Array.isArray(body)) {
		_common.logger.error('Failed to fetch user name from I-Tee', { user: userId, status: response.status, response: body });
		return;
	}

	if (body.length !== 1) {
		return null;
	}

	return body[0];
}

/**
 * Fetches lab from I-Tee
 * @param labId {integer} Lab ID
 * @returns {string} lab
 */
async function fetchITeeLab(labId) {
	const response = await (0, _nodeFetch2.default)(_config2.default.iTee.url + '/labs.json' + '?conditions[id]=' + encodeURIComponent(labId) + '&auth_token=' + encodeURIComponent(_config2.default.iTee.key), {
		headers: { 'x-request-id': (0, _common.reqid)() }
	});

	const body = await response.json();

	if (!response.ok || !Array.isArray(body)) {
		_common.logger.error('Failed to fetch lab from I-Tee', { lab: labId, status: response.status, response: body });
		return;
	}

	if (body.length !== 1) {
		return null;
	}

	return body[0];
}

const routes = exports.routes = new _express.Router();

exports.default = (req, res, next) => {
	let authorized = false;
	if ('auth_token' in req.query) {
		authorized = (0, _common.authorize)(req.query.auth_token);
	} else if (req.body instanceof Object && 'auth_token' in req.body) {
		authorized = (0, _common.authorize)(req.body.auth_token);
		delete req.body.auth_token;
	} else if (/^\/labinfo.json(\?|$)/.test(req.url)) {
		authorized = true;
	} else {
		next();
		return;
	}

	if (authorized) {
		routes(req, res, next);
	} else {
		res.status(403).send({
			success: false,
			message: 'Client is not authorized'
		});
	}
};

routes.get('/', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	responses: {
		200: {
			content: {
				'text/plain': {
					example: 'OK'
				}
			}
		}
	}
}), (req, res) => {
	res.send('OK');
});

routes.get('/lab_users.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Fetch matching instances converted to I-Tee `labuser` objects',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					oneOf: [{
						type: 'object',
						properties: {
							conditions: {
								type: 'object',
								properties: {
									user_id: { type: 'integer', minValue: 1 },
									lab_id: { type: 'integer', minValue: 1 }
								},
								additionalProperties: false,
								required: ['user_id', 'lab_id']
							}
						},
						additionalProperties: false,
						required: ['conditions']
					}, {
						type: 'object',
						properties: {
							conditions: {
								type: 'object',
								properties: {
									id: { type: 'integer', minValue: 1 }
								},
								additionalProperties: false,
								required: ['id']
							}
						},
						additionalProperties: false,
						required: ['conditions']
					}]
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Array of matching I-Tee `labuser` objects',
			content: {
				'application/json': {
					schema: {
						type: 'array',
						items: { type: 'object' }
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab or user was not found'
					}
				}
			}
		},
		409: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Requested instance is not created via I-Tee compatibility API'
					}
				}
			}
		},
		503: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'I-Tee integration is not fully configured'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {
	if ('id' in req.body.conditions) {
		const docs = await _common.db.query(function (doc) {
			if ('iTeeCompat' in doc) {
				emit(doc.iTeeCompat.instanceId);
			}
		}, {
			key: req.body.conditions.id,
			include_docs: true
		});

		let ambiguous = false;
		let instance;
		let iTeeCompat;

		for (const row of docs.rows) {
			if (row.doc._id.startsWith('instance/')) {
				if (instance) {
					ambiguous = true;
				}
				instance = row.doc;
			} else if (row.doc._id.startsWith('i-tee-compat/')) {
				if (iTeeCompat) {
					ambiguous = true;
				}
				iTeeCompat = row.doc;
			}
		}

		if (ambiguous) {
			_common.logger.error('Ambiguous state of I-Tee compatibility', { docs: docs.rows });
			res.status(500).send({
				success: false,
				message: 'Internal Server Error'
			});
		} else if (instance) {
			res.send([instanceToLabUser(instance)]);
		} else if (iTeeCompat) {
			res.send([instanceToLabUser(iTeeCompat)]);
		} else {
			res.send([]);
		}
	} else if ('iTee' in _config2.default && 'key' in _config2.default.iTee) {
		const [lab, user] = await Promise.all([fetchITeeLab(req.body.conditions.lab_id), fetchITeeUser(req.body.conditions.user_id)]);

		if (lab === undefined || user === undefined) {
			// error happened and it is already logged
			res.status(500).send({
				success: false,
				message: 'Internal Server Error'
			});
			return;
		}

		if (!lab || !user || !/^[a-zA-Z0-9-]+$/.test(lab.name)) {
			res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
			return;
		}

		const docs = await _common.db.allDocs({
			keys: ['instance/' + lab.name + ':' + user.username, 'i-tee-compat/' + lab.name + ':' + user.username],
			include_docs: true
		});

		let instance;

		if (docs.rows[0].error === 'not_found' || docs.rows[0].value.deleted) {
			if (docs.rows[1].error === 'not_found' || docs.rows[1].value.deleted) {
				res.send([]);
				return;
			} else {
				instance = docs.rows[1].doc;
			}
		} else {
			instance = docs.rows[0].doc;
		}

		if (!('iTeeCompat' in instance)) {
			res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
		} else {
			res.send([instanceToLabUser(instance)]);
		}
	} else {
		res.status(503).send(req.apiOperation.responses[503].content['application/json'].example);
	}
}));

routes.post('/lab_users.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Create I-Tee `labuser` object',
	requestBody: {
		content: {
			'application/json': {
				type: 'object',
				properties: {
					lab_user: {
						type: 'object',
						properties: {
							user_id: { type: 'integer', minValue: 1 },
							lab_id: { type: 'integer', minValue: 1 }
						},
						additionalProperties: false,
						required: ['user_id', 'lab_id']
					}
				},
				additionalProperties: false,
				required: ['lab_user']
			}
		}
	},
	responses: {
		200: {
			description: 'I-Tee `labuser` has been created',
			content: {
				'application/json': {
					example: {
						success: true,
						lab_user: {}
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab or user was not found'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab user exists'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {

	if (!('iTee' in _config2.default && 'key' in _config2.default.iTee)) {
		res.status(503).send({
			success: false,
			message: 'I-Tee integration is not fully configured'
		});
		return;
	}

	const [lab, user] = await Promise.all([fetchITeeLab(req.body.lab_user.lab_id), fetchITeeUser(req.body.lab_user.user_id)]);

	if (lab === undefined || user === undefined) {
		// error happened and it is already logged
		res.status(500).send({
			success: false,
			message: 'Internal Server Error'
		});
		return;
	}

	if (!lab || !user || !/^[a-zA-Z0-9-]+$/.test(lab.name)) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const iTeeCompat = {
		_id: 'i-tee-compat/' + lab.name + ':' + user.username,
		username: user.username,
		iTeeCompat: {
			instanceId: Date.now(),
			labId: lab.id,
			userId: user.id
		},
		privateToken: (0, _v2.default)(),
		publicToken: (0, _v2.default)()
	};

	try {
		iTeeCompat.lab = await _common.db.get('lab/' + lab.name);
	} catch (e) {
		if (e.name === 'not_found') {
			res.status(404).send({
				success: false,
				message: 'Lab does not exist'
			});
			return;
		}
		throw e;
	}

	iTeeCompat.lab._id = iTeeCompat.lab._id.slice(4);

	try {
		await _common.db.post(iTeeCompat);
	} catch (e) {
		if (e.name !== 'conflict') {
			res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		} else {
			_common.logger.error('Error creating I-Tee compatibility object', {
				id: iTeeCompat._id,
				labId: lab.id,
				userId: user.id,
				e: e.message
			});
			res.status(500).send({
				success: false,
				message: 'Internal Server Error'
			});
		}
		return;
	}

	res.send({
		success: true,
		lab_user: instanceToLabUser(iTeeCompat)
	});
}));

routes.post('/set_vta_info.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Set VirtualTA info on I-Tee `labuser`',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					body: {
						type: 'object',
						properties: {
							id: { type: 'integer', min: 1 },
							host: { type: 'string', minLength: 1 },
							name: { type: 'string', minLength: 1 },
							version: { type: 'string', enum: ['v1', 'v2'] },
							token: { type: 'string', minLength: 1 },
							lab_hash: { type: 'string', minLength: 1 },
							user_key: { type: 'string', minLength: 1 }
						},
						additionalProperties: false,
						required: ['id', 'host', 'name', 'version', 'token', 'lab_hash', 'user_key']
					}
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Teaching assistant info has been set',
			content: {
				'application/json': {
					example: {
						success: true,
						message: 'Teaching assistant has been initialized'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Unable to set VirtualTA info on running lab'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {

	const docs = await _common.db.query(function (doc) {
		if ('iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, {
		key: req.body.id,
		include_docs: true
	});

	let iTeeCompat;

	for (const row of docs.rows) {
		if (row.doc._id.startsWith('instance/')) {
			_common.logger.warn('Unable to set VirtualTA info on running lab', { id: req.body.id, instance: row.doc._id });
			res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
			return;
		} else if (row.doc._id.startsWith('i-tee-compat/')) {
			if (iTeeCompat) {
				_common.logger.error('Ambiguous I-Tee compatibility state', { rows: docs.rows });
				res.status(500).send({
					success: false,
					message: 'Internal Server Error'
				});
				return;
			}
			iTeeCompat = row.doc;
		}
	}

	if (!iTeeCompat) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	iTeeCompat.lab.assistant = {
		url: req.body.host,
		lab: req.body.lab_hash,
		key: req.body.token
	};

	iTeeCompat.assistant = {
		userKey: req.body.user_key,
		link: iTeeCompat.lab.assistant.url + '/' + encodeURIComponent(iTeeCompat.lab.assistant.lab) + '/' + encodeURIComponent(req.body.user_key)
	};

	try {
		await _common.db.put(iTeeCompat);
	} catch (e) {
		if (e.name === 'conflict') {
			// TODO: replay request
			_common.logger.warn('Conflict updating VirtualTA info', { id: iTeeCompat._id, rev: iTeeCompat._rev });
			res.status(400).send({
				success: false,
				message: 'Concurrency problems, eh?'
			});
			return;
		} else {
			throw e;
		}
	}

	res.send(req.apiOperation.responses[200].content['application/json'].example);
}));

routes.post('/start_lab_by_id.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Start lab referenced by given I-Tee `labuser`',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						labuser_id: { type: 'integer', min: 1 }
					},
					additionalProperties: false,
					required: ['labuser_id']
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Lab has been started',
			content: {
				'application/json': {
					example: {
						success: true,
						message: 'Lab has been started',
						lab_user: 123,
						start_time: '2018-09-04T12:56:40.069Z'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Unable to start already running lab'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {
	const docs = await _common.db.query(function (doc) {
		if ('iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, {
		key: req.body.labuser_id,
		include_docs: true
	});

	let iTeeCompat;

	for (const row of docs.rows) {
		if (row.doc._id.startsWith('instance/')) {
			_common.logger.warn('Unable to start already running lab', { id: req.body.id, instance: row.doc._id });
			res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
			return;
		} else if (row.doc._id.startsWith('i-tee-compat/')) {
			if (iTeeCompat) {
				_common.logger.error('Ambiguous I-Tee compatibility state', { rows: docs.rows });
				res.status(500).send({
					success: false,
					message: 'Internal Server Error'
				});
				return;
			}
			iTeeCompat = row.doc;
		}
	}

	if (!iTeeCompat) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const instance = await (0, _createInstance2.default)(iTeeCompat);
	if (typeof instance === 'string') {
		res.status(instance === 'Instance already exists' ? 400 : 500).send({
			success: false,
			message: instance
		});
	} else {
		res.send({
			success: true,
			message: 'Lab has been started',
			lab_user: instance.iTeeCompat.instanceId,
			start_time: new Date()
		});
	}
}));

routes.post('/end_lab_by_id.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'End lab referenced by given I-Tee `labuser`',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						labuser_id: { type: 'integer', min: 1 }
					},
					additionalProperties: false,
					required: ['labuser_id']
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Lab has been ended',
			content: {
				'application/json': {
					example: {
						success: true,
						message: 'Lab has been ended',
						lab_user: 123,
						end_time: '2018-09-04T12:56:40.069Z'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Unable to start already running lab'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab instance does not exist'
					}
				}
			}
		},
		409: {
			description: 'Instance\'s state was changed while processing the request.',
			content: {
				'application/json': {
					example: {
						error: 'Conflict',
						message: 'Revision mismatch'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {
	const docs = await _common.db.query(function (doc) {
		if ('iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, {
		key: req.body.labuser_id,
		include_docs: true
	});

	let iTeeCompat = [];
	let instance;

	for (const row of docs.rows) {
		if (row.doc._id.startsWith('instance/')) {
			if (instance) {
				_common.logger.warn('I-Tee compatibility is in inconsistent state', {
					id: req.body.conditions.labuser_id,
					instance: row.doc._id
				});
				res.status(500).send({
					success: false,
					message: 'Internal Server Error'
				});
				return;
			}
			instance = row.doc;
		} else if (row.doc._id.startsWith('i-tee-compat/')) {
			iTeeCompat.push(row.doc);
		}
	}

	if (!instance) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	let failed = false;
	await Promise.all(iTeeCompat.map(doc => _common.db.remove(doc._id, doc._rev).catch(e => {
		_common.logger.error('Failed to delete I-Tee compatibility object', { id: doc._id, rev: doc._rev, e: e.message });
		failed = true;
	})));

	if (failed) {
		res.status(500).send({
			success: false,
			message: 'Internal Server Error'
		});
		return;
	}

	try {
		await _common.db.remove(instance._id, instance._rev);
	} catch (e) {
		if (e.name === 'conflict') {
			// TODO: replay request
			res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
			return;
		}
		throw e;
	}

	(0, _common.cleanupInstance)(instance);
	res.send({
		success: true,
		message: 'Lab has been ended',
		lab_user: instance.iTeeCompat.instanceId,
		end_time: new Date()
	});
}));

routes.get('/labuser_vms.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Fetch machines attached to I-Tee `labuser`',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						id: { type: 'integer', min: 1 }
					},
					additionalProperties: false,
					required: ['id']
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Lab has been started',
			content: {
				'application/json': {
					example: {
						success: true,
						vms: [{}],
						lab_user: 123
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Lab instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {
	const result = await _common.db.query(function (doc) {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, { key: req.body.id, include_docs: true });

	if (result.rows.length !== 1) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const instance = result.rows[0].doc;

	const vms = [];

	if ('machines' in instance) {
		const promises = [];

		for (const i in instance.lab.machineOrder) {
			const machineId = instance.lab.machineOrder[i];
			const machine = instance.lab.machines[machineId];
			const instanceMachine = instance.machines[machineId];

			const vm = {
				vm_id: (i + 1) * MACHINE_ID_MULTIPLIER + instance.iTeeCompat.instanceId,
				nickname: machine.description,
				expose_uuid: !!machine.enable_private,
				allow_remote: !!machine.enable_remote,
				allow_restart: !!machine.enable_restart,
				guacamole_type: machine.enable_remote ? 'rdp' : 'none',
				position: +i,
				primary: machineId === instance.lab.primaryMachine,
				vm_rdp: []
			};

			switch (machine.type) {
				case 'lxd':
					promises.push((0, _common.lxdMachineInfo)(instanceMachine.name));
					break;
				case 'virtualbox':
					promises.push((0, _common.virtualboxMachineInfo)(instanceMachine.name, false));
					break;
				default:
					_common.logger.error('Failed to get machine info', {
						type: type,
						machine: instanceMachine.name,
						e: 'Unknown machine type'
					});
					promises.push(null);
			}

			vms.push(vm);
		}

		const result = await Promise.all(promises);
		result.forEach((state, i) => {
			if (state) {
				vms[i].state = state.state;
			}
		});
	}

	res.send({
		success: true,
		vms,
		lab_user: instance.iTeeCompat.instanceId
	});
}));

routes.get('/open_guacamole.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Get remote console connection string',
	requestBody: {
		content: {
			'application/json': {
				schema: {

					type: 'object',
					properties: {
						id: { type: 'integer', min: 1 }
					},
					additionalProperties: false,
					required: ['id']
				}
			}
		}
	},
	responses: {
		200: {
			content: {
				'application/json': {
					example: {
						success: true,
						url: 'https://labhost.example.com/remote/privateToken:machineId'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Bad machine index'
					}
				}
			}
		},
		403: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Remote console is not enabled'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Instance does not exist'
					}
				}
			}
		},
		501: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Remote console is not available'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {

	if (!('remote' in _config2.default)) {
		res.status(501).send({
			success: false,
			message: 'Remote console is not available'
		});
		return;
	}

	const instanceId = req.body.id % MACHINE_ID_MULTIPLIER;
	const machineIndex = Math.floor(req.body.id / MACHINE_ID_MULTIPLIER) - 1;

	const result = await _common.db.query(function (doc) {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, { key: instanceId, include_docs: true });

	if (result.rows.length !== 1) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const instance = result.rows[0].doc;

	if (!(machineIndex in instance.lab.machineOrder)) {
		res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		return;
	}

	const machine = instance.lab.machines[instance.lab.machineOrder[machineIndex]];

	if (!machine || !machine.enable_remote) {
		res.status(403).send(req.apiOperation.responses[403].content['application/json'].example);
	} else {
		res.send({
			success: true,
			url: _config2.default.remote + '/' + encodeURIComponent(instance.publicToken) + ':' + encodeURIComponent(instance.lab.machineOrder[machineIndex])
		});
	}
}));

routes.get('/start_vm.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Start virtual machine',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						id: { type: 'integer', min: 1 }
					},
					additionalProperties: false,
					required: ['id']
				}
			}
		}
	},
	responses: {
		200: {
			content: {
				'application/json': {
					example: {
						success: true,
						message: 'Machine has been started'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Bad machine index'
					}
				}
			}
		},
		403: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Power control is not enabled'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {

	const instanceId = req.body.id % MACHINE_ID_MULTIPLIER;
	const machineIndex = Math.floor(req.body.id / MACHINE_ID_MULTIPLIER) - 1;

	const result = await _common.db.query(function (doc) {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, { key: instanceId, include_docs: true });

	if (result.rows.length !== 1) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const instance = result.rows[0].doc;

	if (!(machineIndex in instance.lab.machineOrder)) {
		res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		return;
	}

	const machine = instance.lab.machines[instance.lab.machineOrder[machineIndex]];
	const instanceMachine = instance.machines[instance.lab.machineOrder[machineIndex]];

	if (!machine || !instanceMachine || !machine.enable_restart) {
		res.status(403).send(req.apiOperation.responses[403].content['application/json'].example);
	} else {
		let result;
		switch (machine.type) {
			case 'lxd':
				result = await (0, _common.lxdUpdateMachine)(instanceMachine.name, { state: 'running' });
				break;
			case 'virtualbox':
				result = await (0, _common.virtualboxUpdateMachine)(instanceMachine.name, { state: 'running' });
				break;
		}

		if (!result) {
			// error is already logged
			res.status(500).send({
				success: false,
				message: 'Failed to power machine off'
			});
		} else {
			res.send(req.apiOperation.responses[200].content['application/json'].example);
		}
	}
}));

routes.get('/stop_vm.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Stop virtual machine',
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						id: { type: 'integer', min: 1 }
					},
					additionalProperties: false,
					required: ['id']
				}
			}
		}
	},
	responses: {
		200: {
			content: {
				'application/json': {
					example: {
						success: true,
						message: 'Machine has been started'
					}
				}
			}
		},
		400: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Bad machine index'
					}
				}
			}
		},
		403: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Power control is not enabled'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {

	const instanceId = req.body.id % MACHINE_ID_MULTIPLIER;
	const machineIndex = Math.floor(req.body.id / MACHINE_ID_MULTIPLIER) - 1;

	const result = await _common.db.query(function (doc) {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			emit(doc.iTeeCompat.instanceId);
		}
	}, { key: instanceId, include_docs: true });

	if (result.rows.length !== 1) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const instance = result.rows[0].doc;

	if (!(machineIndex in instance.lab.machineOrder)) {
		res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		return;
	}

	const machine = instance.lab.machines[instance.lab.machineOrder[machineIndex]];
	const instanceMachine = instance.machines[instance.lab.machineOrder[machineIndex]];

	if (!machine || !instanceMachine || !machine.enable_restart) {
		res.status(403).send(req.apiOperation.responses[403].content['application/json'].example);
	} else {
		let result;
		switch (machine.type) {
			case 'lxd':
				result = await (0, _common.lxdUpdateMachine)(instanceMachine.name, { state: 'poweroff' });
				break;
			case 'virtualbox':
				result = await (0, _common.virtualboxUpdateMachine)(instanceMachine.name, { state: 'poweroff' });
				break;
		}

		if (!result) {
			// error is already logged
			res.status(500).send({
				success: false,
				message: 'Failed to power machine off'
			});
		} else {
			res.send(req.apiOperation.responses[200].content['application/json'].example);
		}
	}
}));

routes.all('/labinfo.json', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['I-Tee compatibility'],
	summary: 'Stop virtual machine',
	parameters: [{
		in: 'query',
		name: 'uuid',
		description: 'private token of lab instance',
		required: true,
		schema: {
			type: 'object',
			properties: {
				uuid: { type: 'string', minLength: 1 }
			},
			required: ['uuid']
		}
	}],
	responses: {
		200: {
			content: {
				'application/json': {
					example: {
						success: true,
						message: 'Machine has been started'
					}
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						success: false,
						message: 'Instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {
	const result = await _common.db.query('instance/uuid', { key: req.query.uuid, include_docs: true });
	if (result.rows.length !== 1 || req.query.uuid !== result.rows[0].doc.privateToken) {
		res.status(404).send({
			success: false,
			message: 'Instance does not exists'
		});
	} else {
		res.send(instanceToLabinfo(result.rows[0].doc));
	}
}));