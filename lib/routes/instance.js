import { Router } from 'express';
import { apiOperation } from 'express-openapi-middleware';
import { authorize, db } from '../common';
import render from '../render-layout';
import { asyncMiddleware } from '../util';
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

	const instances = await db.doTn(async tn => {
		const instances = [];
		const iter = tn.getRange(['instance']);
		for await (const [idWrap, instanceWrap] of iter) {
			if (idWrap.length !== 2 || idWrap[0] !== 'instance') {
				throw new Error(`Invalid instance ID: ${JSON.stringify(idWrap)}`);
			}

			const id = idWrap[1];

			const rev = await iter.next();
			if (rev.done || JSON.stringify(rev.value[0]) !== JSON.stringify(['instance', id, 'rev'])) {
				throw new Error(`Did not find revision for instance: ${id}`);
			}

			const instance = JSON.parse(instanceWrap);
			instance._id = id;
			instance._rev = rev.value[1].toString();
			instances.push(instance);
		}
		return instances;
	});

	res.format({
		html() {
			res.send(render('Lab instances', { instances }, '<script src="bundle/instance.js"></script>'));
		},

		json() {
			res.send(instances);
		}
	});
}));


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
	const [instance, id, rev] = await db.doTn(async tn => {
		const id = await tn.get(['instance-token', req.params.token]);
		if (id !== null) {
			const [instance, rev] = await Promise.all([
				tn.get(['instance', id.toString()]),
				tn.get(['instance', id.toString(), 'rev'])
			]);
			if (rev === null) {
				throw new Error(`Did not find rev entry for instance: ${id}`);
			}
			if (instance === null) {
				throw new Error(`Did not find instance entry: ${id}`);
			}
			return [JSON.parse(instance), id.toString(), rev.toString()];
		}
		return [null, null, null];
	});
	if (instance !== null) {
		instance._id = id;
		instance._rev = rev;
		req.instance = instance;
		req.instanceToken = req.params.token;
	}
}));


routes.use('/:token', instanceSubroutes);
