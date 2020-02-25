import uuid from 'uuid/v4';
import { Router } from 'express';
import Ajv from 'ajv';
import { apiOperation } from 'express-openapi-middleware';
import { asyncMiddleware } from '../util';
import { authorize, db, deleteMachines, deleteNetworks } from '../common';
import render from '../render-layout';
import createInstance from '../create-instance';
import instanceSubroutes from './instance-subroutes';


const routes = new Router();
export default routes;


const labSchema = {
	type: 'object',
	properties: {
		_id: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
		_rev: { type: 'string' },
		machines: {
			type: 'object',
			minItems: 1,
			additionalProperties: {
				type: 'object',
				oneOf: [{
					properties: {
						type: { type: 'string', enum: ['virtualbox'] },
						base: { type: 'string', pattern: '^[a-zA-Z0-9-]+-template$' },
						description: { type: 'string' },
						enable_autostart: { type: 'boolean' },
						enable_private: { type: 'boolean' },
						enable_remote: { type: 'boolean' },
						enable_restart: { type: 'boolean' },
						networks: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['bridged', 'virtualbox'] },
									name: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
									ip: { type: 'string', minLength: 1 },
									promiscuous: { type: 'boolean' },
									resetMac: { type: 'boolean' }
								},
								required: ['type', 'name'],
								additionalProperties: false
							}
						}
					},
					additionalProperties: false,
					required: ['type', 'base', 'description', 'networks']
				}, {
					properties: {
						type: { type: 'string', enum: ['lxd'] },
						base: { type: 'string', pattern: '^[a-zA-Z0-9-]+-template$' },
						description: { type: 'string' },
						enable_autostart: { type: 'boolean' },
						enable_private: { type: 'boolean' },
						enable_restart: { type: 'boolean' },
						networks: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' }
								},
								required: ['name'],
								additionalProperties: false
							}
						}
					},
					additionalProperties: false,
					required: ['type', 'base', 'description', 'networks']
				}]
			}
		},
		machineOrder: { type: 'array', items: { type: 'string', minLength: 1 } },
		primaryMachine: { type: 'string', minLength: 1 },
		assistant: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 },
				lab: { type: 'string', minLength: 1 }
			},
			additionalProperties: false
		},
		repositories: {
			type: 'object',
			patternProperties: {
				'^[a-zA-Z0-9_-]+$': {
					type: 'object',
					properties: {
						name: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
						head: { type: 'string', pattern: '^[a-zA-Z0-9_/-]+$' }
					},
					required: ['name']
				}
			},
			minItems: 1
		},
		endpoints: {
			type: 'array',
			uniqueItems: true,
			items: { type: 'string', minLength: 1 }
		},
		gitlab: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 }
			},
			additionalProperties: false,
			required: ['url', 'key']
		}
	},
	additionalProperties: false,
	dependencies: {
		machines: ['machineOrder'],
		machineOrder: ['machines'],
		primaryMachine: ['machines']
	}
};


function normalizeMachines(lab) {
	if ('machines' in lab) {
		const keyExists = new Array(Object.keys(lab.machines).length);
		const newOrder = [];
		const { machineOrder } = lab;
		for (const id of machineOrder) {
			if (id in lab.machines) {
				newOrder.push(id);
				keyExists[id] = true;
			}
		}

		for (const id in lab.machines) {
			if (!keyExists[id]) {
				newOrder.push(id);
			}
		}

		if (!(lab.primaryMachine in lab.machines)) {
			delete lab.primaryMachine;
		}
	}
}


routes.use((req, res, next) => {
	if (authorize(req.token)) {
		next();
	} else {
		res.status(403).send({
			error: 'Permission Denied',
			message: 'Client is not authorized'
		});
	}
});


routes.get('/', apiOperation({
	tags: ['Lab'],
	summary: 'List labs',
	responses: {
		200: {
			description: 'List of labs',
			content: {
				'application/json': {
					schema: {
						type: 'array',
						items: labSchema
					}
				}
			}
		}
	}
}), asyncMiddleware(async (req, res) => {
	const labs = await db.doTn(async tn => {
		const labs = [];
		const iter = tn.getRange(['lab']);
		for await (const [idWrap, labWrap] of iter) {
			if (idWrap.length !== 2 || idWrap[0] !== 'lab') {
				throw new Error(`Invalid lab ID: ${JSON.stringify(idWrap)}`);
			}

			const id = idWrap[1];

			const rev = await iter.next();
			if (rev.done || JSON.stringify(rev.value[0]) !== JSON.stringify(['lab', id, 'rev'])) {
				throw new Error(`Did not find revision for lab: ${id}`);
			}

			const lab = JSON.parse(labWrap);
			lab._id = id;
			lab._rev = rev.value[1].toString();
			labs.push(lab);
		}
		return labs;
	});

	res.format({
		html() {
			res.send(render('Labs', { labs }, '<script src="bundle/lab.js"></script>'));
		},
		json() {
			res.send(labs);
		}
	});
}));


routes.post('/:lab', apiOperation({
	tags: ['Lab'],
	summary: 'Create lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}],
	requestBody: {
		required: true,
		content: {
			'application/json': {
				schema: labSchema
			}
		}
	},
	responses: {
		200: {
			headers: {
				etag: {
					description: 'Lab E-Tag',
					schema: labSchema.properties._rev
				}
			},
			content: {
				'application/json': {
					schema: labSchema
				}
			}
		},
		409: {
			content: {
				'application/json': {
					example: {
						error: 'Conflict',
						message: 'Lab with given id already exists'
					}
				}
			}
		}
	}
}), asyncMiddleware(async (req, res) => {
	const id = req.params.lab;
	const rev = uuid();
	const lab = { ...req.body };
	delete lab._id;
	delete lab._rev;

	normalizeMachines(lab);

	const conflict = await db.doTn(async tn => {
		const existingRev = await tn.get(['lab', id, 'rev']);
		if (existingRev !== null) {
			return true;
		}
		await tn.set(['lab', id], JSON.stringify(lab));
		await tn.set(['lab', id, 'rev'], rev);
		return false;
	});

	if (conflict) {
		res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
		return;
	}

	lab._id = id;
	lab._rev = rev;
	res.set('etag', rev);
	res.send(lab);
}));


routes.put('/:lab', apiOperation({
	tags: ['Lab'],
	summary: 'Update lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Lab E-Tag',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}],
	requestBody: {
		required: true,
		content: {
			'application/json': {
				schema: labSchema
			}
		}
	},
	responses: {
		200: {
			headers: {
				etag: {
					description: 'Lab E-Tag',
					schema: labSchema.properties._rev
				}
			},
			content: {
				'application/json': {
					schema: labSchema
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not Found',
						message: 'Lab does not exist'
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
}), asyncMiddleware(async (req, res) => {
	const id = req.params.lab;
	const rev = req.headers['if-match'];
	const newRev = uuid();
	const lab = { ...req.body };
	delete lab._id;
	delete lab._rev;

	normalizeMachines(lab);

	const error = await db.doTn(async tn => {
		const existingRev = await tn.get(['lab', id, 'rev']);
		if (existingRev === null) {
			return 'not_found';
		}
		if (existingRev.toString() !== rev) {
			return 'conflict';
		}
		await tn.set(['lab', id], JSON.stringify(lab));
		await tn.set(['lab', id, 'rev'], newRev);
	});

	if (error === 'not_found') {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
	} else if (error === 'conflict') {
		res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
	}

	lab._id = id;
	lab._rev = newRev;
	res.set('etag', newRev);
	res.send(lab);
}));


routes.get('/:lab', apiOperation({
	tags: ['Lab'],
	summary: 'Fetch lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}],
	responses: {
		200: {
			headers: {
				etag: {
					description: 'Lab E-Tag',
					schema: labSchema.properties._rev
				}
			},
			content: {
				'application/json': {
					schema: labSchema
				}
			}
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not found',
						message: 'Lab does not exist'
					}
				}
			}
		}
	}
}), asyncMiddleware(async (req, res) => {
	const id = req.params.lab;

	const [lab, rev] = await db.doTn(async tn => {
		const [lab, rev] = await Promise.all([tn.get(['lab', id]), tn.get(['lab', id, 'rev'])]);
		if (rev === null) {
			return [null, null];
		}

		if (lab === null) {
			throw new Error(`Did not find lab entry: ${id}`);
		}

		return [JSON.parse(lab), rev.toString()];
	});

	if (lab === null) {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
	}

	lab._id = id;
	lab._rev = rev;
	res.set('etag', rev);
	res.format({
		html() {
			res.send(render('Lab', { lab }, '<script src="bundle/lab.js"></script>'));
		},
		json() {
			res.send(lab);
		}
	});
}));


routes.delete('/:lab', apiOperation({
	tags: ['Lab'],
	summary: 'Delete lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Instance E-Tag',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}],
	responses: {
		200: {
			description: 'Lab has been deleted'
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not Found',
						message: 'Lab does not exist'
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
}), asyncMiddleware(async (req, res) => {
	const id = req.params.lab;
	const rev = req.headers['if-match'];

	const error = await db.doTn(async tn => {
		const existingRev = await tn.get(['lab', id, 'rev']);
		if (existingRev === null) {
			return 'not_found';
		}
		if (existingRev.toString() !== rev) {
			return 'conflict';
		}
		await tn.clearRangeStartsWith(['lab', id]);
	});

	if (error === 'not_found') {
		res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
		return;
	}

	if (error === 'conflict') {
		res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
		return;
	}

	res.send({
		// ok
	});
}));


routes.post('/:lab/instance/:username', apiOperation({
	tags: ['Instance'],
	summary: 'Start lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'path',
		name: 'username',
		description: 'Username',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Lab E-Tag',
		schema: labSchema.properties._rev
	}],
	requestBody: {
		content: {
			'application/json': {
				schema: {
					type: 'object',
					properties: {
						lab: labSchema
					},
					additionalProperties: false
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Instance'
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not found',
						message: 'Lab does not exist'
					}
				}
			}
		},
		409: {
			content: {
				'application/json': {
					example: {
						error: 'Conflict',
						message: 'Instance already exists'
					}
				}
			}
		},
		410: {
			content: {
				'application/json': {
					example: {
						error: 'Gone',
						message: 'Requested lab revision is not available'
					}
				}
			}
		},
		412: {
			content: {
				'application/json': {
					example: {
						error: 'Precondition Failed',
						message: 'Requested lab is in invalid state',
						errors: []
					}
				}
			}
		}
	}
}), asyncMiddleware(async (req, res) => {
	const { username } = req.params;
	const labId = req.params.lab;

	let lab;

	if (req.body instanceof Object && 'lab' in req.body) {
		lab = req.body.lab;
		lab._id = labId;
		delete lab._rev;
	} else {
		const [existingLab, rev] = await db.doTn(async tn => {
			const [lab, rev] = await Promise.all([tn.get(['lab', labId]), tn.get(['lab', labId, 'rev'])]);
			if (rev === null) {
				return [null, null];
			}

			if (lab === null) {
				throw new Error(`Did not find lab entry: ${labId}`);
			}

			return [JSON.parse(lab), rev.toString()];
		});

		if (existingLab === null) {
			res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
			return null;
		}

		if ('if-match' in req.headers && rev !== req.headers['if-match']) {
			res.status(410).send(req.apiOperation.responses[410].content['application/json'].example);
			return;
		}

		existingLab._id = labId;
		existingLab._rev = rev;

		const validator = new Ajv();
		const valid = validator.validate(labSchema, existingLab);
		if (!valid) {
			res.status(410).send({
				...req.apiOperation.responses[410].content['application/json'].example,
				errors: validator.errors
			});
			return;
		}

		lab = existingLab;
	}

	const instance = await createInstance(lab, username);

	if (typeof instance === 'string') {
		if (instance === 'Instance already exists') {
			res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
		} else {
			res.status(500).send({
				error: 'Internal Server Error',
				message: instance
			});
		}
	} else {
		instance._id = instance._id.slice(9);
		res.send(instance);
	}
}));


routes.delete('/:lab/instance/:username', apiOperation({
	summary: 'End lab',
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'path',
		name: 'username',
		description: 'Username',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'header',
		name: 'if-match',
		description: 'Instance E-Tag',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}],
	responses: {
		200: {
			description: 'Lab has been ended'
		},
		404: {
			content: {
				'application/json': {
					example: {
						error: 'Not found',
						message: 'Instance does not exist'
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
}), (req, res, next) => {
	const id = `${req.params.lab}:${req.params.username}`;
	const rev = req.headers['if-match'];

	db.doTn(async tn => {
		const existingRev = await tn.get(['instance', id, 'rev']);
		if (existingRev === null) {
			return 'not_found';
		}
		if (existingRev.toString() !== rev) {
			return 'conflict';
		}
		const instance = await tn.get(['instance', id]);
		if (instance === null) {
			throw new Error(`Did not find instance entry: ${id}`);
		}
		const parsedInstance = JSON.parse(instance);
		await Promise.all([
			tn.clearRangeStartsWith(['instance', id]),
			tn.clear(['instance-token', parsedInstance.privateToken]),
			tn.clear(['instance-token', parsedInstance.publicToken])
		]);
		return parsedInstance;
	})
		.then(instance => {
			if (instance === 'not_found') {
				res.status(404).send(req.apiOperation.responses[404].content['application/json'].example);
				return;
			}
			if (instance === 'conflict') {
				res.status(409).send(req.apiOperation.responses[409].content['application/json'].example);
				return;
			}
			res.send({});
			Promise.resolve()
				.then(() => deleteMachines(instance))
				.then(() => deleteNetworks(instance));
		}, next);
});


routes.use('/:lab/instance/:username', apiOperation({
	tags: ['Instance'],
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'path',
		name: 'username',
		description: 'Username',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}]
}), asyncMiddleware(async (req, res, next) => {
	const id = `${req.params.lab}:${req.params.username}`;
	const [instance, rev] = await db.doTn(async tn => {
		const [instance, rev] = await Promise.all([tn.get(['instance', id]), tn.get(['instance', id, 'rev'])]);
		if (rev === null) {
			return [null, null];
		}
		if (instance === null) {
			throw new Error(`Did not find instance entry: ${id}`);
		}
		return [JSON.parse(instance), rev.toString()];
	});
	if (instance !== null) {
		instance._id = id;
		instance._rev = rev;
		req.instance = instance;
		req.instanceToken = instance.privateToken;
	}
}));


routes.use('/:lab/instance/:username', apiOperation({
	parameters: [{
		in: 'path',
		name: 'lab',
		description: 'Lab name',
		required: true,
		schema: labSchema.properties._id
	}, {
		in: 'path',
		name: 'username',
		description: 'Username',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}]
}), instanceSubroutes);
