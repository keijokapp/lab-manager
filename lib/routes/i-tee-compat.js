import fetch from 'node-fetch';
import uuid from 'uuid/v4';
import { Router } from 'express';
import { apiOperation } from 'express-openapi-middleware';
import config from '../config';
import { asyncMiddleware } from '../util';
import {
	authorize,
	db,
	deleteInstance,
	logger,
	lxdMachineInfo,
	lxdUpdateMachine,
	reqid,
	virtualboxMachineInfo,
	virtualboxUpdateMachine
} from '../common';
import createInstance from '../create-instance';


const MACHINE_ID_MULTIPLIER = 2 ** 48;


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
 * Loads I-Tee compatible instance and I-Tee compatibility object from database
 * @param labId {integer} lab ID or instance ID
 * @param userId {integer?} user ID
 * @returns {object} 2-element array of instance and I-Tee compatibility object
 */
async function getInstance(labId, userId) {
	const docs = await db.query(doc => {
		if ('iTeeCompat' in doc) {
			// eslint-disable-next-line no-undef
			emit(doc.iTeeCompat.instanceId);
			// eslint-disable-next-line no-undef
			emit([doc.iTeeCompat.labId, doc.iTeeCompat.userId]);
		}
	}, {
		key: userId === undefined ? labId : [labId, userId],
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
			instance._id = instance._id.slice(9);
		} else if (row.doc._id.startsWith('i-tee-compat/')) {
			if (iTeeCompat) {
				ambiguous = true;
			}
			iTeeCompat = row.doc;
			iTeeCompat._id = iTeeCompat._id.slice(13);
		}
	}

	if (ambiguous) {
		logger.error('I-Tee compatibility state', { rows: docs.rows });
		throw new Error('Ambiguous I-Tee compatibility state');
	}

	return [instance, iTeeCompat];
}


/**
 * Fetches user from I-Tee
 * @param userId {integer} User ID
 * @returns {string} user
 */
async function fetchITeeUser(userId) {
	const response = await fetch(`${config.iTee.url}/users.json?conditions[id]=${encodeURIComponent(userId)}&auth_token=${encodeURIComponent(config.iTee.key)}`, {
		headers: { 'x-request-id': reqid() }
	});

	const body = await response.json();

	if (!response.ok || !Array.isArray(body)) {
		logger.error('Failed to fetch user name from I-Tee', { user: userId, status: response.status, response: body });
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
	const response = await fetch(`${config.iTee.url}/labs.json?conditions[id]=${encodeURIComponent(labId)}&auth_token=${encodeURIComponent(config.iTee.key)}`, {
		headers: { 'x-request-id': reqid() }
	});

	const body = await response.json();

	if (!response.ok || !Array.isArray(body)) {
		logger.error('Failed to fetch lab from I-Tee', { lab: labId, status: response.status, response: body });
		return;
	}

	if (body.length !== 1) {
		return null;
	}

	return body[0];
}


export const routes = new Router();

export default (req, res, next) => {
	let authorized = false;
	if ('auth_token' in req.query) {
		authorized = authorize(req.query.auth_token);
	} else if (req.body instanceof Object && 'auth_token' in req.body) {
		authorized = authorize(req.body.auth_token);
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


routes.get('/', apiOperation({
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


routes.get('/lab_users.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	let result;
	if ('id' in req.body.conditions) {
		result = await getInstance(req.body.conditions.id);
	} else if ('iTee' in config && 'key' in config.iTee) {
		result = await getInstance(req.body.conditions.lab_id, req.body.conditions.user_id);
	} else {
		res.status(503).send(req.apiOperation.responses[503].content['application/json'].example);
		return;
	}

	if (result[0]) {
		res.send([instanceToLabUser(result[0])]);
	} else if (result[1]) {
		res.send([instanceToLabUser(result[1])]);
	} else {
		res.send([]);
	}
}));


routes.post('/lab_users.json', apiOperation({
	tags: ['I-Tee compatibility'],
	summary: 'Create I-Tee `labuser` object',
	requestBody: {
		content: {
			'application/json': {
				schema: {
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
}), asyncMiddleware(async (req, res) => {
	if (!('iTee' in config && 'key' in config.iTee)) {
		res.status(503).send({
			success: false,
			message: 'I-Tee integration is not fully configured'
		});
		return;
	}

	const [lab, user] = await Promise.all([
		fetchITeeLab(req.body.lab_user.lab_id),
		fetchITeeUser(req.body.lab_user.user_id)
	]);

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
		_id: `i-tee-compat/${lab.name}:${user.username}`,
		username: user.username,
		iTeeCompat: {
			instanceId: Date.now(),
			labId: lab.id,
			userId: user.id
		},
		lab: {
			_id: lab.name
		},
		privateToken: uuid(),
		publicToken: uuid()
	};

	try {
		await db.post(iTeeCompat);
	} catch (e) {
		if (e.name === 'conflict') {
			res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		} else {
			logger.error('Failed to create I-Tee compatibility object', {
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


routes.post('/set_vta_info.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	const [instance, iTeeCompat] = await getInstance(req.body.id);

	if (!instance && !iTeeCompat) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	if (instance) {
		logger.warn('Unable to set VirtualTA info on running lab', { id: req.body.id, instance: instance._id });
		res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		return;
	}

	iTeeCompat.lab.assistant = {
		url: req.body.host,
		lab: req.body.lab_hash,
		key: req.body.token
	};

	iTeeCompat.assistant = {
		userKey: req.body.user_key,
		link: `${iTeeCompat.lab.assistant.url}/${encodeURIComponent(iTeeCompat.lab.assistant.lab)}/${encodeURIComponent(req.body.user_key)}`
	};

	try {
		iTeeCompat._id = `i-tee-compat/${iTeeCompat._id}`;
		await db.put(iTeeCompat);
	} catch (e) {
		if (e.name === 'conflict') {
			// TODO: replay request
			logger.warn('Conflict updating VirtualTA info', { id: iTeeCompat._id, rev: iTeeCompat._rev });
			res.status(400).send({
				success: false,
				message: 'Concurrency problems, eh?'
			});
			return;
		}
		throw e;
	}

	res.send(req.apiOperation.responses[200].content['application/json'].example);
}));


routes.post('/start_lab_by_id.json', apiOperation({
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
						message: 'Lab or instance does not exist'
					}
				}
			}
		}
	}
}), asyncMiddleware(async (req, res) => {
	const result = await getInstance(req.body.labuser_id);
	let instance = result[0];
	const iTeeCompat = result[1];

	if (!instance && !iTeeCompat) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	if (instance) {
		logger.warn('Unable to start already running lab', { id: req.body.id, instance: instance._id });
		res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		return;
	}

	try {
		const lab = await db.get(`lab/${iTeeCompat.lab._id}`);
		if ('assistant' in iTeeCompat.lab) {
			lab.assistant = iTeeCompat.lab.assistant;
		}
		lab._id = lab._id.slice(4);
		iTeeCompat.lab = lab;
	} catch (e) {
		if (e.name === 'not_found') {
			logger.debug('Lab for I-Tee compatibility object was not found', { iTeeCompat });
			res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
			return;
		}
		throw e;
	}

	instance = await createInstance(iTeeCompat);
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
			start_time: instance.startTime
		});
	}
}));


routes.post('/end_lab_by_id.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	const [instance, iTeeCompat] = await getInstance(req.body.labuser_id);

	if (!instance && !iTeeCompat) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	if (!instance) {
		logger.warn('Unable to end stopped lab', { id: req.body.id, instance: instance._id });
		res.status(400).send(req.apiOperation.responses[400].content['application/json'].example);
		return;
	}

	if (iTeeCompat) {
		iTeeCompat.privateToken = uuid();
		iTeeCompat.publicToken = uuid();
		try {
			await db.put(iTeeCompat);
		} catch (e) {
			if (e.name === 'conflict') {
				res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
			} else if (e.name !== 'not_found') {
				throw e;
			}
		}
	}

	try {
		await deleteInstance(instance);
	} catch (e) {
		if (e.name === 'conflict') {
			// TODO: replay request
			res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
			return;
		}
		throw e;
	}

	res.send({
		success: true,
		message: 'Lab has been ended',
		lab_user: instance.iTeeCompat.instanceId,
		end_time: new Date()
	});
}));


routes.get('/labuser_vms.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	const [instance, iTeeCompat] = await getInstance(req.body.id);

	if (!instance && !iTeeCompat) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	if (!instance) {
		res.send({
			success: true,
			vms: [],
			lab_user: iTeeCompat.iTeeCompat.instanceId
		});
		return;
	}

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
				promises.push(lxdMachineInfo(instanceMachine.name));
				break;
			case 'virtualbox':
				promises.push(virtualboxMachineInfo(instanceMachine.name, false));
				break;
			default:
				logger.error('Failed to get machine info', {
					type: machine.type,
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


routes.get('/open_guacamole.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	if (!('remote' in config)) {
		res.status(501).send({
			success: false,
			message: 'Remote console is not available'
		});
		return;
	}

	const instanceId = req.body.id % MACHINE_ID_MULTIPLIER;
	const machineIndex = Math.floor(req.body.id / MACHINE_ID_MULTIPLIER) - 1;

	const result = await db.query(doc => {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			// eslint-disable-next-line no-undef
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
			url: `${config.remote}/${encodeURIComponent(instance.publicToken)}:${encodeURIComponent(instance.lab.machineOrder[machineIndex])}`
		});
	}
}));


routes.get('/start_vm.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	const instanceId = req.body.id % MACHINE_ID_MULTIPLIER;
	const machineIndex = Math.floor(req.body.id / MACHINE_ID_MULTIPLIER) - 1;

	const result = await db.query(doc => {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			// eslint-disable-next-line no-undef
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
			result = await lxdUpdateMachine(instanceMachine.name, { state: 'running' });
			break;
		case 'virtualbox':
			result = await virtualboxUpdateMachine(instanceMachine.name, { state: 'running' });
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


routes.get('/stop_vm.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	const instanceId = req.body.id % MACHINE_ID_MULTIPLIER;
	const machineIndex = Math.floor(req.body.id / MACHINE_ID_MULTIPLIER) - 1;

	const result = await db.query(doc => {
		if (~doc._id.indexOf('instance/') && 'iTeeCompat' in doc) {
			// eslint-disable-next-line no-undef
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
			result = await lxdUpdateMachine(instanceMachine.name, { state: 'poweroff' });
			break;
		case 'virtualbox':
			result = await virtualboxUpdateMachine(instanceMachine.name, { state: 'poweroff' });
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


routes.all('/labinfo.json', apiOperation({
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
}), asyncMiddleware(async (req, res) => {
	const result = await db.query('instance/uuid', { key: req.query.uuid, include_docs: true });
	if (result.rows.length !== 1 || req.query.uuid !== result.rows[0].doc.privateToken) {
		res.status(404).send({
			success: false,
			message: 'Instance does not exists'
		});
	} else {
		res.send(instanceToLabinfo(result.rows[0].doc));
	}
}));
