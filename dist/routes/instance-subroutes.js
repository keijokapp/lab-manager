'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _express = require('express');

var _expressOpenapiMiddleware = require('express-openapi-middleware');

var _common = require('../common');

var _renderLayout = require('../render-layout');

var _renderLayout2 = _interopRequireDefault(_renderLayout);

var _util = require('../util');

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const routes = new _express.Router();
exports.default = routes;

/**
 * Populates machine object with state properties
 * @nothrow
 * @param type {string} machine type ('lxd' or 'virtualbox')
 * @param machine {object} instance machine object
 * @param ip {boolean} whether to ask IP-s from VirtualBox
 * @returns {void}
 */

async function machineInfo(type, machine, ip) {
	switch (type) {
		case 'lxd':
			Object.assign(machine, (await (0, _common.lxdMachineInfo)(machine.name)));
			break;
		case 'virtualbox':
			Object.assign(machine, (await (0, _common.virtualboxMachineInfo)(machine.name, ip)));
			break;
		default:
			_common.logger.error('Failed to get machine info', {
				type: type,
				machine: machine.name,
				e: 'Unknown machine type'
			});
	}
}

routes.use((req, res, next) => {
	if (req.instance && req.instance.imported && !req.instanceImported) {
		const instance = req.instance;
		('iTee' in _config2.default ? (0, _common.iTeeLabinfo)(instance.privateToken) : Promise.resolve(null)).then(labinfo => {
			if (labinfo === null) {
				delete req.instance;
				delete req.instanceToken;
				return (0, _common.deleteInstance)(instance);
			}
		}).then(() => {
			_common.logger.debug('Deleted imported instance', {
				instance: instance._id,
				privateToken: instance.privateToken
			});
		}, e => {
			_common.logger.debug('Failed to delete imported instance', {
				instance: instance._id,
				privateToken: instance.privateToken,
				e: e.message
			});
		}).then(next);
	} else {
		next();
	}
});

routes.get('/', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['Instance'],
	summary: 'Fetch instance',
	parameters: [{
		in: 'query',
		name: 'detailed',
		description: 'Request machine details',
		schema: { type: 'string' }
	}, {
		in: 'query',
		name: 'ip',
		description: 'Request machine IP-s',
		schema: { type: 'string' }
	}],
	responses: {
		200: {
			description: 'Instance'
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not Found',
						message: 'Instance does not exist'
					}
				}
			}
		}
	}
}), (0, _util.asyncMiddleware)(async (req, res) => {

	let instance = req.instance;

	if (!instance) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	const privateAccess = req.instanceToken === instance.privateToken;

	if (req.accepts('html') || 'detailed' in req.query) {
		await Promise.all(instance.lab.machineOrder.map(id => machineInfo(instance.lab.machines[id].type, instance.machines[id], req.accepts('html') || 'ip' in req.query)));
	}

	if (!privateAccess) {
		const publicInstance = {
			_rev: instance._rev,
			username: instance.username,
			startTime: instance.startTime,
			publicToken: instance.publicToken,
			lab: {}
		};
		if ('assistant' in instance.lab) {
			publicInstance.lab.assistant = {
				url: instance.lab.assistant.url,
				lab: instance.lab.assistant.lab
			};
		}
		if ('assistant' in instance) {
			publicInstance.assistant = {
				userKey: instance.assistant.userKey,
				link: instance.assistant.link
			};
		}
		if ('machines' in instance.lab && 'machineOrder' in instance.lab && 'machines' in instance) {
			publicInstance.lab.machineOrder = instance.lab.machineOrder;
			publicInstance.lab.machines = {};
			for (const i in instance.lab.machines) {
				publicInstance.lab.machines[i] = {
					description: instance.lab.machines[i].description
				};
			}
			publicInstance.machines = {};
			for (const id in instance.machines) {
				publicInstance.machines[id] = {
					uuid: instance.lab.machines[id].enable_remote ? instance.machines[id].uuid : undefined,
					state: instance.lab.machines[id].enable_restart ? instance.machines[id].state : undefined,
					'rdp-port': instance.lab.machines[id].enable_remote ? instance.machines[id]['rdp-port'] : undefined
				};
			}
		}
		if ('gitlab' in instance.lab) {
			publicInstance.lab.gitlab = {
				url: instance.lab.gitlab.url
			};
		}
		if ('gitlab' in instance) {
			publicInstance.gitlab = {
				group: {
					name: instance.gitlab.group.name,
					link: instance.gitlab.group.link
				},
				user: {
					username: instance.gitlab.user.username,
					link: instance.gitlab.user.link,
					password: instance.gitlab.user.password
				}
			};
		}
		instance = publicInstance;
	}

	res.format({
		html: function () {
			res.send((0, _renderLayout2.default)('Lab instance', {
				instance,
				instanceToken: req.instanceToken
			}, '<script src="bundle/instance.js"></script>'));
		},

		json: function () {
			res.send(instance);
		}
	});
}));

routes.get('/machine/:machine', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['Instance'],
	summary: 'Fetch instance machine',
	parameters: [{
		in: 'path',
		name: 'machine',
		description: 'Instance machine ID',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Instance E-Tag',
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'query',
		name: 'ip',
		description: 'Request machine IP-s',
		schema: { type: 'string' }
	}],
	responses: {
		200: {
			description: 'Instance machine'
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not Found',
						message: 'Instance machine does not exist'
					}
				}
			}
		},
		409: {
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
	const instance = req.instance;
	const id = req.params.machine;

	if (!instance) {
		res.status(404).send({
			error: 'Not found',
			message: 'Instance does not exist'
		});
	} else if ('if-match' in req.query && instance._rev !== req.headers['if-match']) {
		res.status(409).send({
			error: 'Conflict',
			message: 'Revision mismatch'
		});
	} else if (!(id in instance.machines) || !(id in instance.lab.machines)) {
		res.status(404).send({
			error: 'Not found',
			message: 'Machine does not exist'
		});
	} else {
		const privateAccess = req.instanceToken === instance.privateToken;
		let machine = instance.machines[id];

		await machineInfo(instance.lab.machines[id].type, machine, req.accepts('html') || 'ip' in req.query);

		if (!('state' in machine)) {
			res.status(500).send({
				error: 'Internal Server Error',
				message: 'Failed to get machine info'
			});
			return;
		}

		if (!privateAccess) {
			machine = {
				uuid: instance.lab.machines[id].enable_remote ? machine.uuid : undefined,
				state: instance.lab.machines[id].enable_restart ? machine.state : undefined,
				'rdp-port': instance.lab.machines[id].enable_remote ? machine['rdp-port'] : undefined
			};
		}

		machine._rev = instance._rev;
		res.set('etag', instance._rev);
		res.send(machine);
	}
}));

routes.put('/machine/:machine', (0, _expressOpenapiMiddleware.apiOperation)({
	tags: ['Instance'],
	summary: 'Update state of instance machine',
	parameters: [{
		in: 'path',
		name: 'machine',
		description: 'Instance machine ID',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Instance E-Tag',
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'query',
		name: 'ip',
		description: 'Request machine IP-s',
		schema: { type: 'string' }
	}],
	requestBody: {
		description: 'Machine state',
		required: true,
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						_rev: { type: 'string', minLength: 1 }, // ignored
						state: {
							type: 'string',
							enum: ['starting', 'running', 'stopping', 'poweroff', 'acpipowerbutton']
						}
					},
					additionalProperties: false
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Instance machine'
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not Found',
						message: 'Instance machine does not exist'
					}
				}
			}
		},
		409: {
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
	const instance = req.instance;
	const id = req.params.machine;

	if (!instance) {
		res.status(404).send({
			error: 'Not found',
			message: 'Instance does not exist'
		});
	} else if ('if-match' in req.headers && instance._rev !== req.headers['if-match']) {
		res.status(409).send({
			error: 'Conflict',
			message: 'Revision mismatch'
		});
	} else if (!(id in instance.machines) || !(id in instance.lab.machines)) {
		res.status(404).send({
			error: 'Not found',
			message: 'Machine does not exist'
		});
	} else {
		const privateAccess = req.instanceToken === instance.privateToken;
		let machine = instance.machines[id];

		if (!privateAccess && !instance.lab.machines[id].enable_restart) {
			delete req.body.state;
			//			delete req.body.networks;
		}

		switch (instance.lab.machines[id].type) {
			case 'lxd':
				if (req.body.state === 'acpipowerbutton') {
					res.status(422).send({
						error: 'Unprocessable Entity',
						message: 'Sending ACPI signals is not supported by containers'
					});
					return;
				}
				Object.assign(machine, (await (0, _common.lxdUpdateMachine)(machine.name, req.body)));
				break;
			case 'virtualbox':
				Object.assign(machine, (await (0, _common.virtualboxUpdateMachine)(machine.name, req.body, req.accepts('html') || 'ip' in req.query)));
				break;
		}

		if (!('state' in machine)) {
			res.status(500).send({
				error: 'Internal Server Error',
				message: 'Failed to update machine state'
			});
			return;
		}

		if (!privateAccess) {
			machine = {
				uuid: instance.lab.machines[id].enable_remote ? instance.machines[id].uuid : undefined,
				state: instance.lab.machines[id].enable_restart ? instance.machines[id].state : undefined,
				'rdp-port': instance.lab.machines[id].enable_remote ? instance.machines[id]['rdp-port'] : undefined
			};
		}

		machine._rev = instance._rev;
		res.set('etag', instance._rev);
		res.send(machine);
	}
}));

routes.use('/repository/:repository', (req, res) => {
	const instance = req.instance;
	const id = req.params.repository;

	if (!instance) {
		res.status(404).send({
			error: 'Not found',
			message: 'Instance does not exist'
		});
	} else if (req.instanceToken !== instance.privateToken) {
		res.status(403).send({
			error: 'Forbidden',
			message: 'Access denied'
		});
	} else if (!(id in instance.lab.repositories)) {
		res.status(404).send({
			error: 'Not found',
			message: 'Repository does not exist'
		});
	} else {
		const repository = instance.lab.repositories[id];
		(0, _common.serveRepository)(req, res, repository);
	}
});