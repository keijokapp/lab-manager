import fetch from 'node-fetch';
import { Router } from 'express';
import { apiOperation } from 'express-openapi-middleware';
import config from '../config';
import { authorize, db, logger } from '../common';
import render from '../render-layout';
import { asyncMiddleware } from '../util';
import createInstance from '../create-instance';
import instanceSubroutes from './instance-subroutes';


const routes = new Router;
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
	if(!authorize(req.token)) {
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

	res.format({
		html: function() {
			res.send(render('Lab instances', { instances }, '<script src="bundle/instance.js"></script>'));
		},

		json: function() {
			res.send(instances);
		}
	});
}));


async function importInstanceFromITee(privateToken) {

	const response = await fetch(config.iTee.url + '/labinfo.json'
		+ '?uuid=' + encodeURIComponent(privateToken), {
		method: 'POST'
	});

	if(!response.ok) {
		logger.error('Failed to fetch lab instance', { response: await response.text() });
		throw new Error('Failed to fetch lab instance');
	}

	const body = await response.json();

	if(body && body.message === 'Unable to find labuser with given uid') {
		return null;
	}

	if(typeof body !== 'object' || body === null || !body.success) {
		logger.error('Bad response from I-Tee', { response: body });
		throw new Error('Bad response from I-Tee');
	}

	let lab;
	try {
		lab = await db.get('lab/' + body.lab.name);
	} catch(e) {
		if(e.name === 'not_found') {
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
		lab,
		publicToken: body.labuser.token,
		privateToken: body.labuser.uuid
	};

	if('labProxy' in config) {
		instance.labProxy = config.labProxy;
	}

	if('assistant' in lab) {
		if(body.assistant.uri !== lab.assistant.url) {
			consistencyErrors.push('Assistant URL-s do not match');
		}
		if(body.lab.lab_hash !== lab.assistant.lab) {
			consistencyErrors.push('Assistant lab ID-s do not match');
		}
		if(body.lab.lab_token !== lab.assistant.key) {
			consistencyErrors.push('Assistant access keys do match');
		}

		if(typeof body.user.user_key !== 'string' || body.user.user_key.length < 1) {
			consistencyErrors.push('Invalid user key');
		} else {
			instance.assistant = {
				userKey: body.user.user_key,
				link: body.assistant.uri + '/lab/' + encodeURIComponent(body.lab.lab_hash) + '/' + encodeURIComponent(body.user.user_key)
			};
		}
	}

	if('machines' in lab) {
		body.vms.sort((vm0, vm1) => vm0.lab_vmt.position - vm1.lab_vmt.position);
		if(body.vms.length !== lab.machineOrder.length) {
			consistencyErrors.push('Machine counts do not match');
		} else {
			instance.machines = {};
			for(let i = 0; i < body.vms.length; i++) {
				const iTeeMachine = body.vms[i];
				const machine = lab.machines[lab.machineOrder[i]];
				if(machine.type !== 'virtualbox') {
					consistencyErrors.push('Machine is not VirtualBox machine');
				}
				if(machine.base !== iTeeMachine.lab_vmt.vmt.image) {
					consistencyErrors.push('Machine base images do not match');
				}
				if(machine.description !== iTeeMachine.lab_vmt.nickname) {
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


	if(consistencyErrors.length) {
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
			'type': 'string',
			'minLength': 1
		}
	}]
}), asyncMiddleware(async (req, res) => {

	// No authorization

	const result = await db.query('instance/uuid', { key: req.params.token, include_docs: true });
	if(result.rows.length === 0 && 'iTee' in config) {
		logger.debug('Trying to import lab instance from I-Tee', { privateToken: req.params.token });
		const instance = await importInstanceFromITee(req.params.token);
		if(instance !== null) {
			if(typeof instance === 'string' && instance !== 'Instance already exists') {
				res.status(500).send({
					error: 'Internal Server Error',
					message: 'Failed to import lab instance from I-Tee',
					errors: instance
				});
			} else if(instance === 'instance already exists' || !('_id' in instance)) {
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
	} else if(result.rows.length === 1) {
		req.instance = result.rows[0].doc;
		req.instanceToken = req.params.token;
	}
}));


routes.use('/:token', instanceSubroutes);
