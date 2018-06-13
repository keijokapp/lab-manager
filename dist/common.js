'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.db = exports.logger = undefined;
exports.reqid = reqid;
exports.authorize = authorize;
exports.lxdRequest = lxdRequest;
exports.createNetwork = createNetwork;
exports.deleteNetworks = deleteNetworks;
exports.deleteMachines = deleteMachines;
exports.cleanupInstance = cleanupInstance;
exports.createGitlabGroup = createGitlabGroup;
exports.createGitlabUser = createGitlabUser;
exports.addGitlabUserToGroup = addGitlabUserToGroup;
exports.lxdMachineInfo = lxdMachineInfo;
exports.virtualboxMachineInfo = virtualboxMachineInfo;
exports.lxdUpdateMachine = lxdUpdateMachine;
exports.virtualboxUpdateMachine = virtualboxUpdateMachine;
exports.serveRepository = serveRepository;

var _url = require('url');

var _async_hooks = require('async_hooks');

var _async_hooks2 = _interopRequireDefault(_async_hooks);

var _crypto = require('crypto');

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _uniqid = require('uniqid');

var _uniqid2 = _interopRequireDefault(_uniqid);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _pouchdb = require('pouchdb');

var _pouchdb2 = _interopRequireDefault(_pouchdb);

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _pushover = require('pushover');

var _pushover2 = _interopRequireDefault(_pushover);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const requestNamespace = {};
const asyncHook = _async_hooks2.default.createHook({
	init(asyncId, type, triggerId, resource) {
		if (requestNamespace[triggerId]) {
			requestNamespace[asyncId] = requestNamespace[triggerId];
		}
	},

	destroy(asyncId) {
		delete requestNamespace[asyncId];
	}
});

asyncHook.enable();

function reqid(req, res, next) {
	const eid = _async_hooks2.default.executionAsyncId();
	if (req) {
		if (!(eid in requestNamespace)) {
			requestNamespace[eid] = {
				id: req.headers['x-request-id'] || (0, _uniqid2.default)()
			};
		}
		if (typeof next === 'function') {
			next();
		}
		return requestNamespace[eid].id;
	} else {
		if (typeof next === 'function') {
			next();
		}
		return eid in requestNamespace ? requestNamespace[eid].id : null;
	}
}

const reqidFormat = _winston2.default.format(info => {
	const eid = _async_hooks2.default.executionAsyncId();
	if (eid in requestNamespace && 'id' in requestNamespace[eid]) {
		info.reqid = requestNamespace[eid].id;
	}
	return info;
});

const logger = exports.logger = _winston2.default.createLogger({
	format: _winston2.default.format.combine(reqidFormat(), _winston2.default.format.simple()),
	transports: [new _winston2.default.transports.Console({ level: 'debug' })]
});

const db = exports.db = new _pouchdb2.default(_config2.default.database);

/**
 * Authorizes token usage
 * @param token {string}
 * @return {boolean} true on authorized usage, false otherwise
 */
function authorize(token) {
	if (!('tokens' in _config2.default)) {
		return true;
	}

	return _config2.default.tokens.includes(token);
}

/**
 * Performs LXD request with given parameters
 * @param path {string} Path of the endpoint without version prefix
 * @param options {object} Options: method, headers, body
 * @param wait {boolean} Whether to wait for operation to complete (defaults to true)
 * @param originalRequest {object} used internally to debug
 * @returns {object} Response: ok, status, headers, body
 */
async function lxdRequest(path, options = {}, wait = true, originalRequest = null) {
	if (!('lxd' in _config2.default)) {
		throw new Error('LXD is not configured');
	}

	if (!path.startsWith('/')) {
		path = '/' + path;
	}

	const opts = (0, _url.parse)(_config2.default.lxd.url + '/1.0' + path);
	opts.method = options.method;
	opts.headers = options.headers;
	opts.key = _config2.default.lxd.key;
	opts.cert = _config2.default.lxd.certificate;
	opts.rejectUnauthorized = false; // TODO:

	if (!originalRequest) {
		originalRequest = {
			method: options.method,
			path,
			startTime: Date.now()
		};
	}

	const response = await new Promise((resolve, reject) => {
		const req = _https2.default.request(opts, res => {
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

		if ('body' in options) {
			req.end(options.body);
		} else {
			req.end();
		}
	});

	response.ok = response.status >= 200 && response.status <= 299;

	if (response.headers['content-type'] === 'application/json') {
		try {
			response.body = JSON.parse(response.body);
		} catch (e) {
			throw new Error('Bad response body: ' + e.message);
		}

		if (response.ok && response.body instanceof Object) {
			const metadata = response.body.metadata;
			if (response.body.type === 'async' && wait) {
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

	if (response.ok) {
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
async function createNetwork(networkName = '') {
	const id = (0, _uniqid2.default)();
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
async function deleteNetworks(instance) {
	if ('machines' in instance) {
		const danglingNetworks = [];
		for (const id in instance.machines) {
			const machine = instance.machines[id];
			const labMachine = instance.lab.machines[id];
			for (const networkId in machine.networks) {
				if ((labMachine.type === 'lxd' || labMachine.networks[networkId].type === 'bridged') && machine.networks[networkId].name !== labMachine.networks[networkId].name && !danglingNetworks.includes(machine.networks[networkId].name)) {
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
			}).catch(e => {
				if (e.response instanceof Object && e.error === 'not found') {
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
		} catch (e) {
			if (e._message !== 'The container is already stopped') {
				throw e;
			}
		}
		await lxdRequest('/containers/' + encodeURIComponent(name), {
			method: 'DELETE'
		});
	} catch (e) {
		if (e.response instanceof Object && e.error === 'not found') {
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
		if ('virtualbox' in _config2.default) {
			const response = await _request2.default.delete(_config2.default.virtualbox + '/machine/' + encodeURIComponent(name));
			if (!response.ok) {
				logger.error('Failed to delete machine', {
					type: 'virtualbox',
					machine: name,
					response: await response.text()
				});
			}
		} else {
			logger.error('Failed to delete machine', {
				type: 'virtualbox',
				machine: name,
				e: 'VirtualBox is not configured'
			});
		}
	} catch (e) {
		logger.error('Failed to delete machine', { type: 'virtualbox', machine: name, e: e.message });
	}
}

/**
 * Deletes machines of instance
 * @nothrow
 * @param instance {object}
 * @returns {void}
 */
async function deleteMachines(instance) {
	if ('machines' in instance) {
		const machineDeletePromises = [];
		for (const id in instance.machines) {
			const machine = instance.machines[id];
			switch (instance.lab.machines[id].type) {
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
async function cleanupInstance(instance) {
	if (!instance.imported) {
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
async function createGitlabGroup(gitlab, publicToken) {
	try {
		const response = await _request2.default.post(gitlab.url + '/api/v4/groups?private_token=' + encodeURIComponent(gitlab.key), {
			name: 'lab-' + publicToken,
			path: 'lab-' + publicToken,
			lfs_enabled: false
		});

		const body = await response.json();
		if (response.ok) {
			return {
				id: body.id,
				name: body.name,
				link: body.web_url
			};
		} else if (body && body.message === 'Failed to save group {:path=>["has already been taken"]}') {
			logger.debug('GitLab group already exists');
			try {
				const response = await _request2.default.get(gitlab.url + '/api/v4/groups/' + 'lab-' + encodeURIComponent(publicToken) + '?private_token=' + encodeURIComponent(gitlab.key), null);
				const body = await response.json();
				if (response.ok) {
					return {
						id: body.id,
						name: body.name,
						link: body.web_url
					};
				} else {
					logger.error('Failed to retrieve GitLab group', { response: body });
				}
			} catch (e) {
				logger.error('Failed to retrieve GitLab group', { e: e.message });
			}
		} else {
			logger.error('Failed to create Gitlab group', { response: body });
		}
	} catch (e) {
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
async function createGitlabUser(gitlab, publicToken) {
	try {
		const response = await _request2.default.post(gitlab.url + '/api/v4/users?private_token=' + encodeURIComponent(gitlab.key), {
			email: 'user-' + encodeURIComponent(publicToken) + '@lab.example.com',
			username: 'user-' + publicToken,
			password: publicToken,
			name: 'user-' + publicToken,
			projects_limit: 0,
			can_create_group: false,
			skip_confirmation: true
		});

		const body = await response.json();
		if (response.ok) {
			return {
				id: body.id,
				name: body.name,
				link: body.web_url,
				password: publicToken
			};
		} else if (body && (body.message === 'Email has already been taken' || body.message === 'Username has already been taken')) {
			logger.debug('GitLab user already exists');
			try {
				const response = await _request2.default.get(gitlab.url + '/api/v4/users?username=' + 'user-' + encodeURIComponent(publicToken) + '&private_token=' + encodeURIComponent(gitlab.key), null);
				const body = await response.json();
				if (response.ok) {
					if (body.length === 0) {
						throw new Error('User not found');
					} else if (body.length !== 1) {
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
			} catch (e) {
				logger.error('Failed to retrieve GitLab user', { e: e.message });
			}
		} else {
			logger.error('Failed to create Gitlab user', { response: body });
		}
	} catch (e) {
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
async function addGitlabUserToGroup(gitlab, group, user) {
	try {
		const response = await _request2.default.post(gitlab.url + '/api/v4/groups/' + encodeURIComponent(group.id) + '/members?private_token=' + encodeURIComponent(gitlab.key), {
			user_id: user.id,
			access_level: 30
		});
		if (response.ok) {
			return true;
		} else {
			const body = await response.json();
			if (body && body.message === 'Member already exists') {
				return true;
			}
			logger.error('Failed to add Gitlab user to group', { group, user, response: body });
		}
	} catch (e) {
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
async function lxdMachineInfo(name) {
	try {
		const response = await lxdRequest('/containers/' + encodeURIComponent(name) + '/state');
		const ips = [];
		for (const network in response.body.network) {
			if (network !== 'lo') {
				for (const address of response.body.network[network].addresses) {
					if (address.scope !== 'link') {
						ips.push(address.address);
					}
				}
			}
		}
		return {
			state: response.body.status.toLowerCase(),
			ip: ips
		};
	} catch (e) {
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
async function virtualboxMachineInfo(name, ip = false) {
	try {
		if (!('virtualbox' in _config2.default)) {
			throw new Error('VirtualBox is not configured');
		}
		const response = await _request2.default.get(_config2.default.virtualbox + '/machine/' + encodeURIComponent(name) + (ip ? '?ip' : ''));
		const body = await response.json();
		if (response.ok) {
			return body;
		} else {
			logger.error('Failed to get machine info', {
				type: 'virtualbox',
				machine: name,
				response: body
			});
		}
	} catch (e) {
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
async function lxdUpdateMachine(name, state) {
	let action;
	let failOnNoop;
	switch (state.state) {
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
	} catch (e) {
		if (failOnNoop || !('body' in e) || e.body !== 'The container is already running' && e.body !== 'The container is already stopped') {
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
async function virtualboxUpdateMachine(name, state, ip = false) {
	try {
		if (!('virtualbox' in _config2.default)) {
			throw new Error('VirtualBox is not configured');
		}
		const response = await _request2.default.put(_config2.default.virtualbox + '/machine/' + encodeURIComponent(name) + (ip ? '?ip' : ''), state);
		const body = await response.json();
		if (response.ok) {
			return body;
		} else {
			logger.error('Failed to update machine', { type: 'lxd', machine: name, response: body });
		}
	} catch (e) {
		logger.error('Failed to update machine', { type: 'lxd', machine: name, e: e.message });
	}
	return null;
}

const repos = 'repositories' in _config2.default ? (0, _pushover2.default)(_config2.default.repositories) : null;
if (repos) {
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
function serveRepository(req, res, repository) {
	req.url = '/' + repository + '.git' + req.url;
	if (repos) {
		repos.handle(req, res);
	} else {
		res.status(501).send('Repositories are not available');
	}
}