import fetch from 'node-fetch';
import { Router } from 'express';
import { apiOperation } from 'express-openapi-middleware';
import config from '../config';
import {
	authorize, db, deleteInstance, iTeeLabinfo, logger, reqid
} from '../common';
import render from '../render-layout';
import { asyncMiddleware } from '../util';
import createInstance from '../create-instance';
import instanceSubroutes from './instance-subroutes';


const routes = new Router();
export default routes;


routes.get('/', apiOperation({
	tags: ['Instance'],
	summary: 'List instances',
	responses: {
		200: {
			description: 'List of instances'
		}
	}
}), asyncMiddleware(async (req, res) => {
	if (!authorize(req.token)) {
		res.status(403).send({
			error: 'Permission Denied',
			message: 'Client is not authorized'
		});
		return;
	}

	const result = await db.allDocs({ startkey: 'instance/', endkey: 'instance/\uffff', include_docs: true });

	const instances = result.rows.map(d => {
		d.doc._id = d.doc._id.slice(9);
		return d.doc;
	});

	await syncITee(instances);

	res.format({
		html() {
			res.send(render('Lab instances', { instances }, '<script src="bundle/instance.js"></script>'));
		},

		json() {
			res.send(instances);
		}
	});
}));


async function syncITee(instances) {
	if (!('iTee' in config) || !('key' in config.iTee)) {
		return;
	}

	let iTeeInstances;
	try {
		const response = await fetch(`${config.iTee.url}/lab_users.json?condition[end]=null&auth_token=${encodeURIComponent(config.iTee.key)}`, {
			headers: { 'x-request-id': reqid() }
		});
		if (response.ok) {
			iTeeInstances = await response.json();
		} else {
			logger.error('Failed to fetch instances from I-Tee', { response: await response.text() });
		}
	} catch (e) {
		logger.error('Failed to fetch instances from I-Tee', { e: e.message });
	}

	if (!iTeeInstances) {
		return;
	}

	const privateTokens = {};

	for (const iTeeInstance of iTeeInstances) {
		if (iTeeInstance.start && !iTeeInstance.end) {
			privateTokens[iTeeInstance.uuid] = iTeeInstance;
		}
	}

	const promises = [];
	let deletedInstances = 0;
	let importedInstances = 0;

	for (const i in instances) {
		const instance = instances[i];
		if (instance.imported && !(instance.privateToken in privateTokens)) {
			promises.push(deleteInstance(instance).catch(e => {
				logger.log({
					level: e.name === 'conflict' ? 'warn' : 'error',
					message: 'Failed to delete imported instance',
					e: e.message
				});
			}));
			instances.splice(i, 1);
			deletedInstances++;
			delete privateTokens[instance.privateToken];
		} else if (instance.privateToken in privateTokens) {
			delete privateTokens[instance.privateToken];
		}
	}

	for (const privateToken in privateTokens) {
		// eslint-disable-next-line no-loop-func
		promises.push(importInstanceFromITee(privateToken).then(instance => {
			if (instance instanceof Object && '_id' in instance) {
				let i;
				for (i = 0; i < instances.length; i++) {
					if (instances[i]._id.localeCompare(instance._id) > -1) {
						instances.splice(i, 0, instance);
						break;
					}
				}
				if (i === instances.length) {
					instances.push(instance);
				}
				importedInstances++;
			} else {
				logger.warn('Failed to import lab', { privateToken, e: instance });
			}
		}));
	}

	await Promise.all(promises);

	if (importedInstances || deletedInstances) {
		logger.debug('Synced instances with I-Tee', { importedInstances, deletedInstances });
	}
}


async function importInstanceFromITee(privateToken) {
	const labinfo = await iTeeLabinfo(privateToken);

	if (!(labinfo instanceof Object)) {
		return labinfo;
	}

	let lab;
	try {
		lab = await db.get(`lab/${labinfo.lab.name}`);
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
		_id: `${labinfo.lab.name}:${labinfo.user.username}`,
		username: labinfo.user.username,
		imported: true,
		startTime: labinfo.labuser.start,
		iTeeCompat: {
			instanceId: labinfo.id,
			labId: labinfo.lab.id,
			userId: labinfo.user.id
		},
		lab,
		publicToken: labinfo.labuser.token,
		privateToken: labinfo.labuser.uuid
	};

	if ('labProxy' in config) {
		instance.labProxy = config.labProxy;
	}

	if ('assistant' in lab) {
		if (labinfo.assistant.uri !== lab.assistant.url) {
			consistencyErrors.push('Assistant URL-s do not match');
		}
		if (labinfo.lab.lab_hash !== lab.assistant.lab) {
			consistencyErrors.push('Assistant lab ID-s do not match');
		}
		if (labinfo.lab.lab_token !== lab.assistant.key) {
			consistencyErrors.push('Assistant access keys do match');
		}

		if (typeof labinfo.user.user_key !== 'string' || labinfo.user.user_key.length < 1) {
			consistencyErrors.push('Invalid user key');
		} else {
			instance.assistant = {
				userKey: labinfo.user.user_key,
				link: `${labinfo.assistant.uri}/lab/${encodeURIComponent(labinfo.lab.lab_hash)}/${encodeURIComponent(labinfo.user.user_key)}`
			};
		}
	}

	if ('machines' in lab) {
		labinfo.vms.sort((vm0, vm1) => vm0.lab_vmt.position - vm1.lab_vmt.position);
		if (labinfo.vms.length !== lab.machineOrder.length) {
			consistencyErrors.push('Machine counts do not match');
		} else {
			instance.machines = {};
			for (let i = 0; i < labinfo.vms.length; i++) {
				const iTeeMachine = labinfo.vms[i];
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

	return createInstance(instance);
}


routes.use('/:token', apiOperation({
	parameters: [{
		in: 'path',
		name: 'token',
		description: 'Public or private token of instance',
		required: true,
		schema: {
			type: 'string',
			minLength: 1
		}
	}]
}), asyncMiddleware(async (req, res) => {
	// No authorization

	const result = await db.query('instance/uuid', { key: req.params.token, include_docs: true });
	if (result.rows.length === 0 && 'iTee' in config) {
		logger.debug('Trying to import lab instance from I-Tee', { privateToken: req.params.token });
		const instance = await importInstanceFromITee(req.params.token);
		if (instance instanceof Object) {
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
				req.instanceImported = true;
			}
		}
	} else if (result.rows.length === 1) {
		req.instance = result.rows[0].doc;
		req.instance._id = req.instance._id.slice(9);
		req.instanceToken = req.params.token;
	}
}));


routes.use('/:token', instanceSubroutes);
