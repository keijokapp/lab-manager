import { parse as parseUrl } from 'url';
import asyncHooks from 'async_hooks';
import { randomBytes } from 'crypto';
import https from 'https';
import fetch from 'node-fetch';
import uniqid from 'uniqid';
import winston from 'winston';
import PouchDB from 'pouchdb';
import pouchSeed from 'pouchdb-seed-design';
import config from './config';
import pushover from 'pushover';


const requestNamespace = {};
const asyncHook = asyncHooks.createHook({
	init(asyncId, type, triggerId, resource) {
		if(requestNamespace[triggerId]) {
			requestNamespace[asyncId] = requestNamespace[triggerId];
		}
	},

	destroy(asyncId) {
		delete requestNamespace[asyncId];
	}
});

asyncHook.enable();


export function reqid(req, res, next) {
	const eid = asyncHooks.executionAsyncId();
	if(req) {
		if(!(eid in requestNamespace)) {
			requestNamespace[eid] = {
				id: req.headers['x-request-id'] || uniqid()
			};
		}
		res.setHeader('x-request-id', requestNamespace[eid].id);
		if(typeof next === 'function') {
			next();
		}
		return requestNamespace[eid].id;
	} else {
		if(typeof next === 'function') {
			next();
		}
		return eid in requestNamespace ? requestNamespace[eid].id : null;
	}
}


const reqidFormat = winston.format(info => {
	const eid = asyncHooks.executionAsyncId();
	if(eid in requestNamespace && 'id' in requestNamespace[eid]) {
		info.reqid = requestNamespace[eid].id;
	}
	return info;
});


export const logger = winston.createLogger({
	format: winston.format.combine(reqidFormat(), winston.format.simple()),
	transports: [new winston.transports.Console({ level: 'debug' })]
});


export const db = new PouchDB(config.database);


// TODO: make application stop on fail
pouchSeed(db, {
	instance: {
		views:{
			uuid:{
				map: function(doc){
					if(doc._id.indexOf('instance/') === 0) {
						emit(doc.privateToken);
						emit(doc.publicToken);
					}
				}
			}
		}
	}
})
	.then(updated => {
		if(updated) {
			logger.info('Design documents updated');
		} else {
			logger.debug('Design documents didn\'t need updates');
		}
	}, e => {
		logger.error('Failed to seed database with design documents', { e: e.message });
	});



/**
 * Authorizes token usage
 * @param token {string}
 * @return {boolean} true on authorized usage, false otherwise
 */
export function authorize(token) {
	if(!('tokens' in config)) {
		return true;
	}

	return config.tokens.includes(token);
}


/**
 * Performs LXD request with given parameters
 * @param path {string} Path of the endpoint without version prefix
 * @param options {object} Options: method, headers, body
 * @param wait {boolean} Whether to wait for operation to complete (defaults to true)
 * @param originalRequest {object} used internally to debug
 * @returns {object} Response: ok, status, headers, body
 */
export async function lxdRequest(path, options = {}, wait = true, originalRequest = null) {
	if(!('lxd' in config)) {
		throw new Error('LXD is not configured');
	}

	if(!path.startsWith('/')) {
		path = '/' + path;
	}

	const opts = parseUrl(config.lxd.url + '/1.0' + path);
	opts.method = options.method;
	opts.headers = options.headers;
	opts.key = config.lxd.key;
	opts.cert = config.lxd.certificate;
	opts.rejectUnauthorized = false; // TODO:

	if(!originalRequest) {
		originalRequest = {
			method: options.method,
			path,
			startTime: Date.now()
		};
	}

	const response = await new Promise((resolve, reject) => {
		const req = https.request(opts, res => {
			const chunks = [];
			res.on('data', chunk => {
				chunks.push(chunk);
			});
			res.on('end', () => {
				resolve({
					status: res.statusCode,
					headers: res.headers,
					body: chunks.join('')
				});
			});
			res.on('error', reject);
		});
		req.on('error', reject);

		if('body' in options) {
			req.end(options.body);
		} else {
			req.end();
		}
	});

	response.ok = response.status >= 200 && response.status <= 299;

	if(response.headers['content-type'] === 'application/json') {
		try {
			response.body = JSON.parse(response.body);
		} catch(e) {
			throw new Error('Bad response body: ' + e.message);
		}

		if(response.ok && response.body instanceof Object) {
			const metadata = response.body.metadata;
			if(response.body.type === 'async' && wait) {
				return lxdRequest('/operations/' + encodeURIComponent(metadata.id) + '/wait', {}, true, originalRequest);
			}
			response.body = metadata;
		}
	}

	logger.debug('LXD request', {
		method: originalRequest.method,
		path: originalRequest.path,
		timing: Math.floor((Date.now() - originalRequest.startTime) / 100) / 10
	});

	if(response.ok) {
		return response;
	} else {
		const e = new Error('Bad response status: ' + response.status);
		// noinspection JSUndefinedPropertyAssignment
		e.response = response;
		throw e;
	}
}


const maxInterfaceNameLength = 15;


/**
 * Creates LXD bridge network
 * @param networkName {string} arbitrary network name
 * @returns {string} bridge name
 */
export async function createNetwork(networkName = '') {
	const id = uniqid();
	const nic = 'b' + id.slice(id.length - maxInterfaceNameLength + 1);

	logger.debug('Creating network', { network: nic });

	await lxdRequest('/networks', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			name: nic,
			description: networkName,
			config: {
				'ipv4.address': 'none',
				'ipv4.firewall': 'false',
				'ipv4.nat': 'false',
				'ipv4.dhcp': 'false',
				'ipv6.address': 'none',
				'ipv6.firewall': 'false',
				'ipv6.nat': 'false',
				'ipv6.dhcp': 'false'
			}
		})
	});
	return nic;
}


/**
 * Deletes dangling bridge networks via LXD
 * @nothrow
 * @param instance {object}
 * @returns {void}
 */
export async function deleteNetworks(instance) {
	if('machines' in instance) {
		const danglingNetworks = [];
		for(const id in instance.machines) {
			const machine = instance.machines[id];
			const labMachine = instance.lab.machines[id];
			for(const networkId in machine.networks) {
				if((labMachine.type === 'lxd' || labMachine.networks[networkId].type === 'bridged')
					&& machine.networks[networkId].name !== labMachine.networks[networkId].name
					&& !danglingNetworks.includes(machine.networks[networkId].name)) {
					// network was created for this instance so delete it later
					danglingNetworks.push(machine.networks[networkId].name);
				}
			}
		}

		logger.debug('Deleting dangling networks', { networks: danglingNetworks });

		// now delete dangling bridged networks
		const networkDeletePromise = danglingNetworks.map(network => {
			return lxdRequest('/networks/' + encodeURIComponent(network), {
				method: 'DELETE'
			})
				.catch(e => {
					if(e.response instanceof Object && e.error === 'not found') {
						logger.debug('Failed to delete network', { network, e: 'Not found' });
					} else {
						logger.error('Failed to delete network', { network, e: e.message, response: e.response });
					}
				});
		});

		await Promise.all(networkDeletePromise);
	}
}


/**
 * Deletes given LXD container
 * @nothrow
 * @param name {string} Machine name
 * @returns {void}
 */
async function lxdDeleteMachine(name) {
	try {
		try {
			await lxdRequest('/containers/' + encodeURIComponent(name) + '/state', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'stop'
				})
			});
		} catch(e) {
			if(e._message !== 'The container is already stopped') {
				throw e;
			}
		}
		await lxdRequest('/containers/' + encodeURIComponent(name), {
			method: 'DELETE'
		});
	} catch(e) {
		if(e.response instanceof Object && e.error === 'not found') {
			logger.debug('Failed to delete machine', { type: 'lxd', machine: name, e: 'Not found' });
		} else {
			logger.error('Failed to delete machine', {
				type: 'lxd',
				machine: name,
				e: e.message,
				response: e.response
			});
		}
	}
}


/**
 * Deletes given VirtualBox machine
 * @nothrow
 * @param name {string} Machine name
 * @returns {void}
 */
async function virtualboxDeleteMachine(name) {
	try {
		if('virtualbox' in config) {
			const response = await fetch(config.virtualbox + '/machine/' + encodeURIComponent(name), {
				method: 'DELETE',
				headers: { 'x-request-id': reqid() }
			});
			if(!response.ok) {
				const body = await response.json();
				if(body.error === 'Not Found') {
					logger.debug('Failed to delete machine', { type: 'virtualbox', machine: name, e: 'Not found' });
				} else {
					logger.error('Failed to delete machine', {
						type: 'virtualbox',
						machine: name,
						response: body
					});
				}
			}
		} else {
			logger.error('Failed to delete machine', {
				type: 'virtualbox',
				machine: name,
				e: 'VirtualBox is not configured'
			});
		}
	} catch(e) {
		logger.error('Failed to delete machine', { type: 'virtualbox', machine: name, e: e.message });
	}
}


/**
 * Deletes machines of instance
 * @nothrow
 * @param instance {object}
 * @returns {void}
 */
export async function deleteMachines(instance) {
	if('machines' in instance) {
		const machineDeletePromises = [];
		for(const id in instance.machines) {
			const machine = instance.machines[id];
			switch(instance.lab.machines[id].type) {
				case 'lxd':
					machineDeletePromises.push(lxdDeleteMachine(machine.name));
					break;
				case 'virtualbox':
					machineDeletePromises.push(virtualboxDeleteMachine(machine.name));
					break;
				default:
					logger.error('Failed to delete machine', {
						type: instance.lab.machines[id].type,
						machine: machine.name,
						e: 'Unknown machine type'
					});
			}
		}

		await Promise.all(machineDeletePromises); // should not throw
	}
}


/**
 * Cleans up resources attached to instance if necessary
 * @nothrow
 * @param instance {object}
 * @returns {void}
 */
export async function cleanupInstance(instance) {
	if(!instance.imported) {
		await deleteMachines(instance);
		await deleteNetworks(instance);
	}
}


/**
 * Creates GitLab group for instance on specified GitLab instance
 * @nothrow
 * @param gitlab {object} GitLab instance info
 * @param publicToken {string} instance public token
 * @returns {object} GitLab group object or null on error
 */
export async function createGitlabGroup(gitlab, publicToken) {
	try {
		const response = await fetch(gitlab.url + '/api/v4/groups?private_token=' + encodeURIComponent(gitlab.key), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'accept': 'application/json',
				'x-request-id': reqid()
			},
			body: JSON.stringify({
				name: 'lab-' + publicToken,
				path: 'lab-' + publicToken,
				lfs_enabled: false
			})
		});

		const body = await response.json();
		if(response.ok) {
			return {
				id: body.id,
				name: body.name,
				link: body.web_url
			};
		} else if(body && body.message === 'Failed to save group {:path=>["has already been taken"]}') {
			logger.debug('GitLab group already exists');
			try {
				const response = await fetch(gitlab.url + '/api/v4/groups/' + 'lab-' + encodeURIComponent(publicToken)
					+ '?private_token=' + encodeURIComponent(gitlab.key), {
					headers: { 'accept': 'application/json', 'x-request-id': reqid() }
				});
				const body = await response.json();
				if(response.ok) {
					return {
						id: body.id,
						name: body.name,
						link: body.web_url
					};
				} else {
					logger.error('Failed to retrieve GitLab group', { response: body });
				}
			} catch(e) {
				logger.error('Failed to retrieve GitLab group', { e: e.message });
			}
		} else {
			logger.error('Failed to create Gitlab group', { response: body });
		}
	} catch(e) {
		logger.error('Failed to create GitLab group', { e: e.message });
	}
	return null;
}


/**
 * Creates GitLab user for instance on specified GitLab instance
 * @nothrow
 * @param gitlab {object} GitLab instance info
 * @param publicToken {string} instance public token
 * @returns {object} GitLab user object or null on error
 */
export async function createGitlabUser(gitlab, publicToken) {
	try {
		const response = await fetch(gitlab.url + '/api/v4/users?private_token=' + encodeURIComponent(gitlab.key), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'accept': 'application/json',
				'x-request-id': reqid()
			},
			body: JSON.stringify({
				email: 'user-' + encodeURIComponent(publicToken) + '@lab.example.com',
				username: 'user-' + publicToken,
				password: publicToken,
				name: 'user-' + publicToken,
				projects_limit: 0,
				can_create_group: false,
				skip_confirmation: true
			})
		});

		const body = await response.json();
		if(response.ok) {
			return {
				id: body.id,
				name: body.name,
				link: body.web_url,
				password: publicToken
			};
		} else if(body && (body.message === 'Email has already been taken' || body.message === 'Username has already been taken')) {
			logger.debug('GitLab user already exists');
			try {
				const response = await fetch(gitlab.url + '/api/v4/users'
					+ '?username=user-' + encodeURIComponent(publicToken)
					+ '&private_token=' + encodeURIComponent(gitlab.key), {
					headers: {
						'accept': 'application/json',
						'x-request-id': reqid()
					}
				});
				const body = await response.json();
				if(response.ok) {
					if(body.length === 0) {
						throw new Error('User not found');
					} else if(body.length !== 1) {
						throw new Error('Invalid number of users: ' + body.length);
					}
					return {
						id: body[0].id,
						name: body[0].name,
						link: body[0].web_url,
						password: publicToken
					};
				} else {
					logger.error('Failed to retrieve GitLab user', { response: body });
				}
			} catch(e) {
				logger.error('Failed to retrieve GitLab user', { e: e.message });
			}
		} else {
			logger.error('Failed to create Gitlab user', { response: body });
		}
	} catch(e) {
		logger.error('Failed to create Gitlab user', { e: e.message });
	}
	return null;
}


/**
 * Adds GitLab user to GitLab group
 * @nothrow
 * @param gitlab {object} GitLab instance info
 * @param group {object} GitLab group object
 * @param user {object} GitLab user object
 * @returns {boolean} true on success, false on error
 */
export async function addGitlabUserToGroup(gitlab, group, user) {
	try {
		const response = await fetch(gitlab.url + '/api/v4/groups/' + encodeURIComponent(group.id) + '/members?private_token=' + encodeURIComponent(gitlab.key), {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-request-id': reqid() },
			body: JSON.stringify({
				user_id: user.id,
				access_level: 30
			})
		});
		if(response.ok) {
			return true;
		} else {
			const body = await response.json();
			if(body && body.message === 'Member already exists') {
				return true;
			}
			logger.error('Failed to add Gitlab user to group', { group, user, response: body });
		}
	} catch(e) {
		logger.error('Failed to add Gitlab user to group', { group, user, e: e.message });
	}
	return false;
}


/**
 * Retrieves LXD machine info
 * @nothrow
 * @param name {string} machine name
 * @returns {object} machine info on success, null on failure
 */
export async function lxdMachineInfo(name) {
	try {
		const response = await lxdRequest('/containers/' + encodeURIComponent(name) + '/state');
		const ips = [];
		for(const network in response.body.network) {
			if(network !== 'lo') {
				for(const address of response.body.network[network].addresses) {
					if(address.scope !== 'link') {
						ips.push(address.address);
					}
				}
			}
		}
		return {
			state: response.body.status.toLowerCase(),
			ip: ips
		};
	} catch(e) {
		logger.error('Failed to get machine info', {
			type: 'lxd',
			machine: name,
			e: e.message,
			response: e.response
		});
	}
	return null;
}


/**
 * Retrieves VirtualBox machine info
 * @nothrow
 * @param name {string} machine name
 * @param ip {boolean}
 * @returns {object} machine info on success, null on failure
 */
export async function virtualboxMachineInfo(name, ip = false) {
	try {
		if(!('virtualbox' in config)) {
			throw new Error('VirtualBox is not configured');
		}
		const response = await fetch(config.virtualbox + '/machine/'
			+ encodeURIComponent(name)
			+ (ip ? '?ip' : ''), {
			headers: { 'x-request-id': reqid() }
		});
		const body = await response.json();
		if(response.ok) {
			return body;
		} else {
			logger.error('Failed to get machine info', {
				type: 'virtualbox',
				machine: name,
				response: body
			});
		}
	} catch(e) {
		logger.error('Failed to get machine info', {
			type: 'virtualbox',
			machine: name,
			e: e.message
		});
	}
	return null;
}


/**
 * Updates state of LXD container
 * @nothrow
 * @param name {string}
 * @param state {object}
 * @returns {object} machine info on success, null on failure
 */
export async function lxdUpdateMachine(name, state) {
	let action;
	let failOnNoop;
	switch(state.state) {
		case 'starting':
			action = 'start';
			failOnNoop = true;
			break;
		case 'running':
			action = 'start';
			failOnNoop = false;
			break;
		case 'stopping':
			action = 'stop';
			failOnNoop = true;
			break;
		case 'poweroff':
			action = 'stop';
			failOnNoop = false;
			break;
	}

	try {
		await lxdRequest('/containers/' + encodeURIComponent(name) + '/state', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action })
		});
	} catch(e) {
		if(failOnNoop || !('body' in e) || (e.body !== 'The container is already running' && e.body !== 'The container is already stopped')) {
			logger.error('Failed to update machine', {
				type: 'lxd',
				machine: name,
				e: e.message,
				response: e.response
			});
			return null;
		}
	}

	return await lxdMachineInfo(name);
}


/**
 * Updates state of VirtualBox machine
 * @nothrow
 * @param name {string}
 * @param state {object}
 * @param ip {boolean}
 * @returns {object} machine info on success, null on failure
 */
export async function virtualboxUpdateMachine(name, state, ip = false) {
	try {
		if(!('virtualbox' in config)) {
			throw new Error('VirtualBox is not configured');
		}
		const response = await fetch(config.virtualbox + '/machine/' + encodeURIComponent(name) + (ip ? '?ip' : ''), {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'x-request-id': reqid() },
			body: JSON.stringify(state)
		});
		const body = await response.json();
		if(response.ok) {
			return body;
		} else {
			logger.error('Failed to update machine', { type: 'lxd', machine: name, response: body });
		}
	} catch(e) {
		logger.error('Failed to update machine', { type: 'lxd', machine: name, e: e.message });
	}
	return null;
}


const repos = 'repositories' in config ? pushover(config.repositories) : null;
if(repos) {
	repos.on('error', e => {
		logger.error('Git server error', { e: e.message });
	});
	repos.on('push', service => {
		service.reject(403);
	});
	repos.on('tag', service => {
		service.reject(403);
	});
}


/**
 * Serves Git repository to client in read-only mode
 * @param req {object} HTTP request object
 * @param res {object} HTTP response object
 * @param repository {string} name of the repository (without trailing '.git')
 */
export function serveRepository(req, res, repository) {
	req.url = '/' + repository + '.git' + req.url;
	if(repos) {
		repos.handle(req, res);
	} else {
		res.status(501).send('Repositories are not available');
	}
}
