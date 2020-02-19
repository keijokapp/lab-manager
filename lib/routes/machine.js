import { Router } from 'express';
import { apiOperation } from 'express-openapi-middleware';
import { authorize, logger, virtualboxRequest } from '../common';
import render from '../render-layout';


const routes = new Router();
export default routes;


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
	tags: ['Machine'],
	summary: 'List virtual machines',
	parameters: [{
		in: 'query',
		name: 'templates',
		description: 'Fetch templates only',
		schema: { type: 'string' }
	}, {
		in: 'query',
		name: 'running',
		description: 'Fetch running machines only',
		schema: { type: 'string' }
	}, {
		in: 'query',
		name: 'detailed',
		description: 'Ask for machine details',
		schema: { type: 'string' }
	}, {
		in: 'query',
		name: 'ip',
		description: 'Ask for machine IP-s',
		schema: { type: 'string' }
	}],
	responses: {
		200: {
			description: 'List of machines'
		}
	}
}), (req, res, next) => {
	const activeTab = 'templates' in req.query ? 1 : ('running' in req.query ? 2 : 0);

	function getMachines(html) {
		const params = [];

		if ('running' in req.query) {
			params.push('running');
		}

		if ('templates' in req.query) {
			params.push(`filter=${encodeURIComponent('-template$')}`);
		}

		if ('detailed' in req.query || html) {
			params.push('detailed');
		}

		if ('ip' in req.query || html) {
			params.push('ip');
		}

		return virtualboxRequest(`/machine?${params.join('&')}`)
			.then(response => {
				if (!response.ok) {
					return response.text().then(body => {
						logger.error('Failed to request machines', { body });
						res.status(response.status).send(body);
						return Promise.reject(new Error('Failed to request machines'));
					});
				}
				return response.json();
			});
	}

	let title;
	if ('running' in req.query && 'templates' in req.query) {
		title = 'Running templates';
	} else if ('templates' in req.query) {
		title = 'Templates';
	} else if ('running' in req.query) {
		title = 'Running machines';
	} else {
		title = 'Virtual machines';
	}

	res.format({
		html() {
			getMachines(true).then(body => {
				res.send(render(title, { machines: body, activeTab }, '<script src="bundle/machine.js"></script>'));
			}).catch(next);
		},

		json() {
			getMachines().then(body => {
				res.send(body);
			}).catch(next);
		}
	});
});


routes.get('/:machine', apiOperation({
	tags: ['Machine'],
	summary: 'Fetch virtual machine',
	parameters: [{
		in: 'path',
		name: 'machine',
		description: 'Machine name',
		required: false,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'query',
		name: 'ip',
		description: 'Ask for machine IP-s',
		schema: { type: 'string' }
	}],
	responses: {
		200: {
			description: 'Machine'
		},
		404: {
			description: 'Machine does not exist'
		}
	}
}), (req, res, next) => {
	virtualboxRequest(`/machine/${encodeURIComponent(req.params.machine)}${'ip' in req.query ? '?ip' : ''}`)
		.then(response => {
			if (response.ok) {
				return response.json().then(body => {
					res.status(response.status).send(body);
				});
			}
			return response.text().then(body => {
				res.status(response.status).send(body);
			});
		}).catch(next);
});


routes.put('/:machine', apiOperation({
	tags: ['Machine'],
	summary: 'Update state of virtual machine',
	parameters: [{
		in: 'path',
		name: 'machine',
		description: 'Machine name',
		required: false,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'query',
		name: 'ip',
		description: 'Ask for machine IP-s',
		schema: { type: 'string' }
	}],
	requestBody: {
		description: 'Machine state',
		required: true,
		content: {
			'application/json': {
				schema: {
					type: 'object'
				}
			}
		}
	},
	responses: {
		200: {
			description: 'Machine'
		},
		404: {
			description: 'Machine does not exist'
		}
	}
}), (req, res, next) => {
	virtualboxRequest(`/machine/${encodeURIComponent(req.params.machine)}${'ip' in req.query ? '?ip' : ''}`, {
		method: 'PUT',
		body: req.body
	})
		.then(response => {
			if (response.ok) {
				return response.json().then(body => {
					res.status(response.status).send(body);
				});
			}
			return response.text().then(body => {
				res.status(response.status).send(body);
			});
		}).catch(next);
});


routes.post('/:machine/snapshot/:snapshot', apiOperation({
	tags: ['Machine'],
	summary: 'Update state of virtual machine',
	parameters: [{
		in: 'path',
		name: 'machine',
		description: 'Machine name',
		required: false,
		schema: {
			type: 'string',
			minLength: 1
		}
	}, {
		in: 'path',
		name: 'snapshot',
		description: 'Snapshot name',
		schema: {
			type: 'string',
			minLength: 1
		}
	}],
	responses: {
		200: {
			description: 'Snapshot has been created'
		}
	}
}), (req, res, next) => {
	virtualboxRequest(`/machine/${encodeURIComponent(req.params.machine)}/snapshot/${encodeURIComponent(req.params.snapshot)}`, {
		method: 'POST'
	})
		.then(response => {
			if (response.ok) {
				return response.json().then(body => {
					res.status(response.status).send(body);
				});
			}
			return response.text().then(body => {
				res.status(response.status).send(body);
			});
		}).catch(next);
});
