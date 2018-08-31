import { Router } from 'express';
import { validate } from 'express-jsonschema';
import { validate as validateSchema } from 'jsonschema';
import { asyncMiddleware } from '../util';
import { authorize, cleanupInstance, db } from '../common';
import render from '../render-layout';
import createInstance from '../create-instance';
import instanceSubroutes from './instance-subroutes';


const routes = new Router;
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
						},
						repositories: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
									location: { type: 'string', pattern: '^/.+$' },
									ref: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
								},
								additionalProperties: false,
								required: ['name', 'location', 'ref']
							}
						}
					},
					additionalProperties: false,
					required: ['type', 'base', 'description', 'networks']
				}]
			}
		},
		machineOrder: { type: 'array', 'items': { type: 'string', minLength: 1 } },
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
				'^[a-zA-Z0-9_-]+$': { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
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
		machineOrder: ['machines']
	}
};


function normalizeMachines(lab) {
	if(!('machines' in lab)) {
		delete lab.primaryMachine;
		return;
	}

	const keyExists = new Array(Object.keys(lab.machines).length);
	const newOrder = [];
	const machineOrder = lab.machineOrder;
	for(const id of machineOrder) {
		if(lab.machines[id] === null) {
			delete lab.machine[id];
		} else if(id in lab.machines) {
			newOrder.push(id);
			keyExists[id] = true;
		}
	}

	for(const id in lab.machines) {
		if(!keyExists[id]) {
			newOrder.push(id);
		}
	}

	if(!(lab.primaryMachine in lab.machines)) {
		delete lab.primaryMachine;
	}
}


routes.use((req, res, next) => {
	if(authorize(req.token)) {
		next();
	} else {
		res.status(403).send({
			error: 'Permission Denied',
			message: 'Client is not authorized'
		});
	}
});


routes.get('/', asyncMiddleware(async (req, res) => {

	const result = await db.allDocs({ startkey: 'lab/', endkey: 'lab/\uffff', include_docs: true });

	const labs = result.rows.map(d => {
		d.doc._id = d.doc._id.slice(4);
		return d.doc;
	});

	res.format({
		html: function() {
			res.send(render('Labs', { labs }, '<script src="bundle/lab.js"></script>'));
		},

		json: function() {
			res.send(labs);
		}
	});
}));


routes.post('/:lab', validate({
	params: {
		properties: {
			lab: labSchema.properties._id
		}
	},
	body: labSchema
}), asyncMiddleware(async (req, res) => {
	const lab = {
		...req.body,
		_id: 'lab/' + req.params.lab,
		_rev: undefined
	};

	normalizeMachines(lab);

	try {
		const result = await db.post(lab);
		lab._id = result.id.slice(4);
		lab._rev = result.rev;
		res.set('etag', lab._rev);
		res.send(lab);
	} catch(e) {
		if(e.name === 'conflict') {
			res.status(409).send({
				error: 'Conflict',
				message: 'Lab with given id already exists'
			});
		} else {
			throw e;
		}
	}
}));


routes.put('/:lab', validate({
	params: {
		properties: {
			lab: labSchema.properties._id
		}
	},
	headers: {
		type: 'object',
		properties: {
			'if-match': { type: 'string', minLength: 1 }
		},
		required: ['if-match']
	},
	body: labSchema
}), asyncMiddleware(async (req, res) => {
	const lab = {
		...req.body,
		_id: 'lab/' + req.params.lab,
		_rev: req.headers['if-match']
	};

	normalizeMachines(lab);

	try {
		const result = await db.put(lab);
		lab._id = result.id.slice(4);
		lab._rev = result.rev;
		res.set('etag', lab._rev);
		res.send(lab);
	} catch(e) {
		if(e.name === 'not_found') {
			res.status(404).send({
				error: 'Not Found',
				message: 'Lab does not exist'
			});
		} else if(e.name === 'conflict') {
			res.status(409).send({
				error: 'Conflict',
				message: 'Revision mismatch'
			});
		} else {
			throw e;
		}
	}
}));


routes.get('/:lab', validate({
	params: {
		properties: {
			lab: labSchema.properties._id
		}
	}
}), asyncMiddleware(async (req, res) => {
	try {
		const lab = await db.get('lab/' + req.params.lab);
		lab._id = lab._id.slice(4);
		res.set('etag', lab._rev);
		res.format({
			html: function() {
				res.send(render('Lab', { lab }, '<script src="bundle/lab.js"></script>'));
			},

			json: function() {
				res.send(lab);
			}
		});
	} catch(e) {
		if(e.name === 'not_found') {
			res.status(404).send({
				error: 'Not found',
				message: 'Lab does not exist'
			});
		} else {
			throw e;
		}
	}
}));


routes.delete('/:lab', validate({
	params: {
		properties: {
			lab: labSchema.properties._id
		}
	},
	headers: {
		properties: {
			'if-match': { type: 'string', minLength: 1 }
		},
		required: ['if-match']
	}
}), asyncMiddleware(async (req, res) => {
	try {
		await db.remove('lab/' + req.params.lab, req.headers['if-match']);
		res.send({
			// ok
		});
	} catch(e) {
		if(e.name === 'not_found') {
			res.status(404).send({
				error: 'Not found',
				message: 'Lab does not exist'
			});
		} else if(e.name === 'conflict') {
			res.status(409).send({
				error: 'Conflict',
				message: 'Revision mismatch'
			});
			throw e;
		}
	}
}));


routes.post('/:lab/instance/:username', validate({
	params: {
		type: 'object',
		properties: {
			username: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' }
		}
	},
	headers: {
		properties: {
			'if-match': { type: 'string', minLength: 1 }
		}
	}
}), asyncMiddleware(async (req, res) => {
	const username = req.params.username;
	let lab;
	try {
		lab = await db.get('lab/' + req.params.lab);
	} catch(e) {
		if(e.name === 'not_found') {
			res.status(404).send({
				error: 'Not found',
				message: 'Lab does not exist'
			});
		} else {
			throw e;
		}
		return;
	}

	if('if-match' in req.headers && lab._rev !== req.headers['if-match']) {
		res.status(410).send({
			error: 'Gone',
			message: 'Requested lab revision is not available'
		});
		return;
	}

	lab._id = lab._id.slice(4);

	const validationResult = validateSchema(lab, labSchema);
	if(!validationResult.valid) {
		res.status(412).send({
			error: 'Precondition Failed',
			message: 'Requested lab is in invalid state',
			errors: validationResult.errors
		});
		return;
	}

	const instance = await createInstance({
		_id: 'instance/' + lab._id + ':' + username,
		lab,
		username
	});

	if(typeof instance === 'string') {
		res.status(instance === 'Instance already exists' ? 409 : 500).send({
			error: instance === 'Instance already exists' ? 'Conflict' : 'Internal Server Error',
			message: instance
		});
	} else {
		instance._id = instance._id.slice(9);
		res.send(instance);
	}
}));


routes.use('/:lab/instance/:username', (req, res, next) => {
	db.get('instance/' + req.params.lab + ':' + req.params.username)
		.then(instance => {
			req.instance = instance;
			req.instanceToken = instance.privateToken;
			next();
		}, e => {
			if(e.name !== 'not_found') {
				next(e);
			} else {
				next();
			}
		});
});


routes.delete('/:lab/instance/:username', validate({
	headers: {
		properties: {
			'if-match': { type: 'string', minLength: 1 }
		},
		required: ['if-match']
	}
}), (req, res, next) => {
	if(!('instance' in req)) {
		res.status(404).send({
			error: 'Not found',
			message: 'Instance does not exist'
		});
		return;
	}

	const instance = req.instance;

	db.remove(instance._id, req.headers['if-match'])
		.then(() => {
			// noinspection JSIgnoredPromiseFromCall
			cleanupInstance(instance);
			res.send({});
		})
		.catch(e => {
			if(e.name === 'conflict') {
				res.status(409).send({
					error: 'Conflict',
					message: 'Revision mismatch'
				});
			} else {
				next(e);
			}
		});
});


routes.use('/:lab/instance/:username', instanceSubroutes);
