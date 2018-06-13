import { Router } from 'express';
import request from '../request';
import config from '../config';
import { authorize } from '../common';
import render from '../render-layout';


const routes = new Router;
export default routes;


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


routes.get('/', (req, res, next) => {

	const activeTab = 'templates' in req.query ? 1 : ('running' in req.query ? 2 : 0);

	function getMachines(html) {

		const params = [];

		if('running' in req.query) {
			params.push('running');
		}

		if('templates' in req.query) {
			params.push('filter=' + encodeURIComponent('-template$'));
		}

		if('detailed' in req.query || html) {
			params.push('detailed');
		}

		if('ip' in req.query || html) {
			params.push('ip');
		}

		return request.get(config.virtualbox + '/machine?' + params.join('&'))
			.then(response => {
				if(!response.ok) {
					return response.text().then(body => {
						logger.error('Failed to request machines', { body });
						res.status(response.status).send(body);
						return Promise.reject(new Error('Failed to request machines'));
					});
				} else {
					return response.json();
				}
			});
	}

	let title;
	if('running' in req.query && 'templates' in req.query) {
		title = 'Running templates';
	} else if('templates' in req.query) {
		title = 'Templates';
	} else if('running' in req.query) {
		title = 'Running machines';
	} else {
		title = 'Virtual machines';
	}

	res.format({
		html: function() {
			getMachines(true).then(body => {
				res.send(render(title, { machines: body, activeTab }, '<script src="bundle/machine.js"></script>'));
			}).catch(next);
		},

		json: function() {
			getMachines().then(body => {
				res.send(body);
			}).catch(next);
		}
	});
});


routes.get('/:machine', (req, res, next) => {
	request.get(config.virtualbox + '/machine/' + encodeURIComponent(req.params.machine) + ('ip' in req.query ? '?ip' : ''))
		.then(response => {
			if(response.ok) {
				return response.json().then(body => {
					res.status(response.status).send(body);
				});
			} else {
				return response.text().then(body => {
					res.status(response.status).send(body);
				});
			}
		}).catch(next);
});


routes.put('/:machine', (req, res, next) => {
	request.put(config.virtualbox + '/machine/' + encodeURIComponent(req.params.machine) + ('ip' in req.query ? '?ip' : ''), req.body)
		.then(response => {
			if(response.ok) {
				return response.json().then(body => {
					res.status(response.status).send(body);
				});
			} else {
				return response.text().then(body => {
					res.status(response.status).send(body);
				});
			}
		}).catch(next);
});


routes.post('/:machine/snapshot/:snapshot', (req, res, next) => {
	request.post(config.virtualbox + '/machine/' + encodeURIComponent(req.params.machine) + '/snapshot/' + encodeURIComponent(req.params.snapshot))
		.then(response => {
			if(response.ok) {
				return response.json().then(body => {
					res.status(response.status).send(body);
				});
			} else {
				return response.text().then(body => {
					res.status(response.status).send(body);
				});
			}
		}).catch(next);
});
