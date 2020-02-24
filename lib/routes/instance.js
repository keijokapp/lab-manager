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

	const result = await db.allDocs({ startkey: 'instance/', endkey: 'instance/\uffff', include_docs: true });

	const instances = result.rows.map(d => {
		d.doc._id = d.doc._id.slice(9);
		return d.doc;
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

	const result = await db.query('instance/uuid', { key: req.params.token, include_docs: true });
	if (result.rows.length === 1) {
		req.instance = result.rows[0].doc;
		req.instance._id = req.instance._id.slice(9);
		req.instanceToken = req.params.token;
	}
}));


routes.use('/:token', instanceSubroutes);
