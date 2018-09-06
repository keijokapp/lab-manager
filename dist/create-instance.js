'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _child_process = require('child_process');

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _common = require('./common');

var _v = require('uuid/v4');

var _v2 = _interopRequireDefault(_v);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function resolveRef(repository, ref) {
	// assume ref is safe (alpha-numeric/alpha-numeric)
	try {
		return await new Promise((resolve, reject) => {
			(0, _child_process.execFile)('git', ['-C', _config2.default.repositories + '/' + repository + '.git', 'rev-parse', ref], (e, stdout) => {
				if (e) {
					reject(e);
				} else {
					resolve(stdout.trim());
				}
			});
		});
	} catch (e) {
		_common.logger.error('Failed to resolve ref', { respository, ref, e: e.message });
	}
	return null;
} /**
   * TODO: move this utility/service somewhere else
   */

async function listFiles(repository, rev) {
	try {
		return await new Promise((resolve, reject) => {
			(0, _child_process.execFile)('git', ['-C', _config2.default.repositories + '/' + repository + '.git', 'ls-tree', '--full-tree', '--name-only', '-r', rev], (e, stdout) => {
				if (e) {
					reject(e);
				} else {
					resolve(stdout.split(/\n/g).filter(f => f));
				}
			});
		});
	} catch (e) {
		_common.logger.error('Failed to list files from repository', { respository, rev, e: e.message });
	}
	return null;
}

async function fetchFile(repository, rev, file) {
	try {
		return await new Promise((resolve, reject) => {
			(0, _child_process.execFile)('git', ['-C', _config2.default.repositories + '/' + repository + '.git', 'show', rev, '--', file], (e, stdout) => {
				if (e) {
					reject(e);
				} else {
					resolve(stdout);
				}
			});
		});
	} catch (e) {
		_common.logger.error('Failed to fetch file from repository', { respository, rev, file, e: e.message });
	}
	return null;
}

/*
async function uploadRepositoryFile(instance, id, repository, rev, file) {
	const content = await fetchFile(repository.name, rev, file);
	if(content === null) {
		return false;
	}

	try {
		await lxdRequest.post('/containers/' + encodeURIComponent(instance.machines[id].name)
			+ '/files?path=' + encodeURIComponent(repository.destination + '/' + file), content);
		return true;
	} catch(e) {
		logger.error('Failed to upload file to container', { instance: instance._id, machine: instance.machines[id].name, repository: repository.name, rev, file, e: e.message });
	}
	return false;
}


async function createRepositoryDirectory(instance, id, repository, directory, files) {
	try {
		await lxdRequest.post('/containers/' + encodeURIComponent(instance.machines[id].name)
			+ '/files?path=' + encodeURIComponent(repository.destination + '/' + file), content);
		return true;
	} catch(e) {
		logger.error('Failed to create directory to container', { instance: instance._id, machine: instance.machines[id].name, repository: repository.name, directory, e: e.message });
	}
	return false;
}


async function uploadRepository(instance, id, repository) {
	const rev = await resolveRef(repository.name, repository.ref);
	if(rev === null) {
		return false;
	}

	const files = await listFiles(repository.name, rev);
	if(files === null) {
		return false;
	}

	const createdDirs

console.log('FILES', files);
	const promises = [];
	for(const file of files) {
		promises.push(uploadRepositoryFile(instance, id, repository, rev, file));
	}

	const result = await Promise.all(promises);

	return !result.includes(false);
}


/**
 * Creates LXD container
 * @nothrow
 * @param instance {object}
 * @param id {string}
 * @returns {boolean} true on success, false on failure
 */
async function lxdCreateMachine(instance, id) {
	let i = 0;
	const devices = {};
	for (const network of instance.machines[id].networks) {
		devices['nic' + i] = {
			nictype: 'bridged',
			parent: network.name,
			name: 'eth' + i,
			type: 'nic'
		};
		i++;
	}

	try {
		if ('repositories' in instance.lab.machines[id] && !('repositories' in _config2.default)) {
			throw new Error('Repositories are not available');
		}

		const requestData = {
			name: instance.machines[id].name,
			profiles: ['lab'],
			devices,
			source: {
				type: 'image',
				alias: instance.lab.machines[id].base
			}
		};

		await (0, _common.lxdRequest)('/containers', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(requestData)
		});

		if (instance.lab.machines[id].enable_private) {
			await (0, _common.lxdRequest)('/containers/' + encodeURIComponent(instance.machines[id].name) + '/files?path=' + encodeURIComponent('/root/instance.json'), {
				method: 'POST',
				body: JSON.stringify(instance, null, 2)
			});
		}

		/*			if('repositories' in instance.lab.machines[id]) {
  			const promises = [];
  			for(const repository of instance.lab.machines[id].repositories) {
  				logger.debug('Copying repository', { repository });
  				promises.push(uploadRepository(instance, id, repository));
  			}
  				const result = await Promise.all(promises);
  			logger.debug('Copying repositories has been finished');
  			if(result.includes(false)) {
  				return false;
  			}
  		}*/

		if (instance.lab.machines[id].enable_autostart) {
			await (0, _common.lxdRequest)('/containers/' + encodeURIComponent(instance.machines[id].name) + '/state', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'start' })
			});
		}

		return true;
	} catch (e) {
		_common.logger.error('Failed to create machine', {
			type: instance.lab.machines[id].type,
			machine: id,
			e: e.message
		});
	}
	return false;
}

/**
 * Creates Virtualbox
 * @nothrow
 * @param instance {object}
 * @param id {string}
 * @returns {boolean} true on success, false on failure
 */
async function virtualboxCreateMachine(instance, id) {
	if (!('virtualbox' in _config2.default)) {
		_common.logger.error('Failed to create machine', {
			type: 'virtualbox',
			machine: id,
			e: 'VirtualBox is not configured'
		});
		return false;
	}

	const requestData = {
		image: instance.lab.machines[id].base,
		groups: [`/${instance.lab.machines[id].base.replace(/-template$/, '')}`, `/${instance.username}`],
		networks: instance.machines[id].networks.map((n, i) => {
			return {
				type: instance.lab.machines[id].networks[i].type === 'virtualbox' ? 'intnet' : 'bridged',
				name: n.name
			};
		}),
		state: instance.lab.machines[id].enable_autostart ? 'running' : 'poweroff',
		dmi: {
			'bios-version': instance.machines[id].name,
			'bios-release-date': instance.lab.machines[id].description,
			'system-manufacturer': 'Lab Manager',
			'system-product-name': _config2.default.appUrl,
			'system-sku': instance.machines[id].networks.map(network => network.ip).join('|')
		}
	};

	if (instance.lab.machines[id].enable_private) {
		requestData.dmi['system-version'] = instance.privateToken;
	}

	if ('assistant' in instance && 'assistant' in instance.lab) {
		requestData.dmi['system-serial-number'] = encodeURIComponent(instance.lab.assistant.lab) + '/' + encodeURIComponent(instance.assistant.userKey);
	}

	try {
		const response = await (0, _nodeFetch2.default)(_config2.default.virtualbox + '/machine/' + encodeURIComponent(instance.machines[id].name), {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'x-request-id': (0, _common.reqid)() },
			body: JSON.stringify(requestData)
		});
		if (response.ok) {
			return true;
		}

		_common.logger.error('Failed to create machine', {
			machine: id,
			requestData,
			response: await response.text()
		});
	} catch (e) {
		_common.logger.error('Failed to create machine', { type: instance.lab.machines[id].type, machine: id, e: e.message });
	}
	return false;
}

/**
 * Create assistant instance
 * @param instance {object}
 * @returns {string|undefined} error or undefined
 */
async function createAssistant(instance) {
	instance.timing.assistant = [Date.now()];

	try {
		const response = await (0, _nodeFetch2.default)(instance.lab.assistant.url + '/api/v2/labusers', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'accept': 'application/json', 'x-request-id': (0, _common.reqid)() },
			body: JSON.stringify({
				api_key: instance.lab.assistant.key,
				host: _config2.default.appUrl,
				username: instance.username,
				fullname: instance.username,
				labID: instance.lab.assistant.lab,
				password: instance.publicToken // TODO: better password
			})
		});

		if (!response.ok) {
			_common.logger.error('Failed to communicate with assistant', { response: await response.text() });
			return 'Failed to communicate with assistant';
		} else {
			const body = await response.json();
			instance.assistant = {
				userKey: body.userKey,
				link: instance.lab.assistant.url + '/lab/' + encodeURIComponent(instance.lab.assistant.lab) + '/' + encodeURIComponent(body.userKey)
			};
		}
	} catch (e) {
		_common.logger.error('Failed to communicate with assistant', { e: e.message });
		return 'Failed to communicate with assistant';
	}

	instance.timing.assistant[1] = Date.now();
}

/**
 * Creates endpoints for lab
 * @nothrow
 * @param instance {object} Instance object
 * @returns {string|undefined} error or undefined
 */
async function createEndpoints(instance) {
	instance.timing.endpoints = [Date.now()];
	const endpoints = {};
	for (const endpointName of instance.lab.endpoints) {
		endpoints[endpointName] = {};
	}

	try {
		const response = await (0, _nodeFetch2.default)(_config2.default.labProxy.url + '/api' + '/endpoints/' + encodeURIComponent(instance.privateToken) + '?auth-token=' + encodeURIComponent(_config2.default.labProxy.key), {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'x-request-id': (0, _common.reqid)() },
			body: JSON.stringify({ endpoints })
		});

		if (!response.ok) {
			_common.logger.error('Failed to create endpoints', { endpoints, response: await response.text() });
			return 'Failed to create endpoints';
		}

		const body = await response.json();
		for (const name in body.endpoints) {
			delete body.endpoints[name].destination;
		}

		instance.endpoints = body.endpoints;
	} catch (e) {
		_common.logger.error('Failed to create endpoints', { e: e.message });
		return 'Failed to create endpoints';
	}

	instance.timing.endpoints[1] = Date.now();
}

/**
 * Creates GitLab context for lab
 * @nothrow
 * @param instance {object} Instance object
 * @returns {string|undefined} error or undefined
 */
async function createGitLabContext(instance) {
	instance.timing.gitlab = [Date.now()];

	let [group, user] = await Promise.all([(0, _common.createGitlabGroup)(instance.lab.gitlab, instance.publicToken), (0, _common.createGitlabUser)(instance.lab.gitlab, instance.publicToken)]);

	if (group && user && (await (0, _common.addGitlabUserToGroup)(instance.lab.gitlab, group, user))) {
		_common.logger.debug('Created lab instance in Gitlab', { group, user });
		instance.gitlab = { group, user };
	} else {
		return 'Failed to create lab instance on Gitlab';
	}

	instance.timing.gitlab[1] = Date.now();
}

/**
 * Creates and populates preseed instance object
 * @param instance {object} p
 * @returns {object|string} instance object on success, string constant on error
 */

exports.default = async function (instance) {
	const lab = instance.lab;
	instance._id = 'instance/' + instance.lab._id + ':' + instance.username;

	if (!('startTime' in instance)) {
		instance.startTime = new Date().toISOString();
	}

	if (!('privateToken' in instance)) {
		instance.privateToken = (0, _v2.default)();
	}

	if (!('publicToken' in instance)) {
		instance.publicToken = (0, _v2.default)();
	}

	if ('labProxy' in _config2.default) {
		instance.labProxy = _config2.default.labProxy.url;
	}

	if ('repositories' in lab) {
		instance.repositories = {};
		for (const id in lab.repositories) {
			instance.repositories[id] = {
				link: _config2.default.appUrl + '/instance/' + encodeURIComponent(instance.privateToken) + '/repository/' + encodeURIComponent(id)
			};
		}
	}

	const timing = instance.timing = {};

	if ('assistant' in lab && !('assistant' in instance)) {
		const error = await createAssistant(instance);
		if (error) {
			return error;
		}
	}

	if ('endpoints' in lab && 'labProxy' in _config2.default) {
		const error = await createEndpoints(instance);
		if (error) {
			return error;
		}
	}

	if ('gitlab' in lab) {
		const error = await createGitLabContext(instance);
		if (error) {
			return error;
		}
	}

	if ('machines' in lab) {
		timing.networks = [Date.now()];
		const time = Date.now();
		const bridges = {};
		instance.machines = {};

		try {
			for (const id in lab.machines) {
				const machine = lab.machines[id];
				instance.machines[id] = {
					name: machine.base.replace(/-template$/, '-' + instance.username + '-' + time),
					networks: []
				};
				for (const network of machine.networks) {
					const instanceNetwork = {};
					if (network.name.endsWith('-template')) {
						const networkNName = network.name.replace(/-template$/, '-' + instance.username + '-' + time);
						if (machine.type === 'lxd' || network.type === 'bridged') {
							if (!(networkNName in bridges)) {
								bridges[networkNName] = await (0, _common.createNetwork)(networkNName);
							}
							instanceNetwork.name = bridges[networkNName];
						} else {
							instanceNetwork.name = networkNName;
						}
					} else {
						instanceNetwork.name = network.name;
					}
					instance.machines[id].networks.push(instanceNetwork);
				}
			}
		} catch (e) {
			_common.logger.error('Failed to create networks', { e: e.message });
			// noinspection JSIgnoredPromiseFromCall
			(0, _common.deleteNetworks)(instance);
			return 'Failed to create networks';
		}
		timing.networks[1] = Date.now();

		timing.machines = {};
		const promises = [];
		for (const id in instance.machines) {
			switch (lab.machines[id].type) {
				case 'lxd':
					timing.machines[id] = [Date.now()];
					promises.push(lxdCreateMachine(instance, id).then(r => {
						timing.machines[id][1] = Date.now();
						return r;
					}));
					break;
				case 'virtualbox':
					timing.machines[id] = [Date.now()];
					promises.push(virtualboxCreateMachine(instance, id).then(r => {
						timing.machines[id][1] = Date.now();
						return r;
					}));
					break;
				default:
					promises.push(false);
					_common.logger.error('Failed to create machine', {
						type: lab.machines[id].type,
						machine: id,
						e: 'Unknown machine type'
					});
					break;
			}
		}

		const result = await Promise.all(promises);

		if (result.includes(false)) {
			(0, _common.cleanupInstance)(instance);
			return 'Failed to create machines';
		}
	}

	try {
		instance.timing = timing;
		delete instance._rev;
		const result = await _common.db.post(instance);
		instance._rev = result.rev;

		for (const i in timing) {
			if (Array.isArray(timing[i])) {
				timing[i] = Math.round((timing[i][1] - timing[i][0]) / 100) / 10;
			} else {
				for (const ii in timing[i]) {
					timing[i][ii] = Math.round((timing[i][ii][1] - timing[i][ii][0]) / 100) / 10;
				}
			}
		}
		_common.logger.info('Created lab instance', {
			lab: instance.lab._id,
			username: instance.username,
			publicToken: instance.publicToken,
			privateToken: instance.privateToken,
			timing
		});
	} catch (e) {
		// noinspection JSIgnoredPromiseFromCall
		(0, _common.cleanupInstance)(instance);
		if (e.name === 'conflict') {
			return 'Instance already exists';
		} else {
			throw e;
		}
	}

	return instance;
};