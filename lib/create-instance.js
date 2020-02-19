/**
 * TODO: move this utility/service somewhere else
 */

import fetch from 'node-fetch';
import uuid from 'uuid/v4';
import {
	addGitlabUserToGroup,
	createGitlabGroup,
	createGitlabUser,
	createNetwork,
	db,
	deleteMachines,
	deleteNetworks,
	logger,
	lxdRequest,
	reqid,
	virtualboxRequest
} from './common';
import config from './config';


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
		devices[`nic${i}`] = {
			nictype: 'bridged',
			parent: network.name,
			name: `eth${i}`,
			type: 'nic'
		};
		i++;
	}

	try {
		if ('repositories' in instance.lab.machines[id] && !('repositories' in config)) {
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

		await lxdRequest('/containers', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(requestData)
		});

		if (instance.lab.machines[id].enable_private) {
			await lxdRequest(`/containers/${encodeURIComponent(instance.machines[id].name)}/files?path=${encodeURIComponent('/root/instance.json')}`, {
				method: 'POST',
				body: JSON.stringify(instance, null, 2)
			});
		}

		if (instance.lab.machines[id].enable_autostart) {
			await lxdRequest(`/containers/${encodeURIComponent(instance.machines[id].name)}/state`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'start' })
			});
		}

		return true;
	} catch (e) {
		logger.error('Failed to create machine', {
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
	if (!('virtualbox' in config)) {
		logger.error('Failed to create machine', {
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
			'system-product-name': config.appUrl,
			'system-sku': instance.machines[id].networks.map(network => network.ip).join('|')
		}
	};

	if (instance.lab.machines[id].enable_private) {
		requestData.dmi['system-version'] = instance.privateToken;
	}

	if ('assistant' in instance && 'assistant' in instance.lab) {
		requestData.dmi['system-serial-number'] = `${encodeURIComponent(instance.lab.assistant.lab)}/${encodeURIComponent(instance.assistant.userKey)}`;
	}

	try {
		const response = await virtualboxRequest(`/machine/${encodeURIComponent(instance.machines[id].name)}`, {
			method: 'PUT',
			body: requestData
		});
		if (response.ok) {
			return true;
		}

		logger.error('Failed to create machine', {
			machine: id,
			requestData,
			response: await response.text()
		});
	} catch (e) {
		logger.error('Failed to create machine', { type: instance.lab.machines[id].type, machine: id, e: e.message });
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
		const response = await fetch(`${instance.lab.assistant.url}/api/v2/labusers`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json', 'x-request-id': reqid() },
			body: JSON.stringify({
				api_key: instance.lab.assistant.key,
				host: config.appUrl,
				username: instance.username,
				fullname: instance.username,
				labID: instance.lab.assistant.lab,
				password: instance.publicToken // TODO: better password
			})
		});

		if (!response.ok) {
			logger.error('Failed to communicate with assistant', { response: await response.text() });
			return 'Failed to communicate with assistant';
		}
		const body = await response.json();
		instance.assistant = {
			userKey: body.userKey,
			link: `${instance.lab.assistant.url}/lab/${encodeURIComponent(instance.lab.assistant.lab)}/${encodeURIComponent(body.userKey)}`
		};
	} catch (e) {
		logger.error('Failed to communicate with assistant', { e: e.message });
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
		const response = await fetch(`${config.labProxy.url}/api/endpoints/${encodeURIComponent(instance.privateToken)}?auth-token=${encodeURIComponent(config.labProxy.key)}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json', 'x-request-id': reqid() },
			body: JSON.stringify({ endpoints })
		});

		if (!response.ok) {
			logger.error('Failed to create endpoints', { endpoints, response: await response.text() });
			return 'Failed to create endpoints';
		}

		const body = await response.json();
		for (const name in body.endpoints) {
			delete body.endpoints[name].destination;
		}

		instance.endpoints = body.endpoints;
	} catch (e) {
		logger.error('Failed to create endpoints', { e: e.message });
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

	const [group, user] = await Promise.all([
		createGitlabGroup(instance.lab.gitlab, instance.publicToken),
		createGitlabUser(instance.lab.gitlab, instance.publicToken)
	]);

	if (group && user && await addGitlabUserToGroup(instance.lab.gitlab, group, user)) {
		logger.debug('Created lab instance in Gitlab', { group, user });
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
export default async function (instance) {
	const { lab } = instance;
	instance._id = `instance/${instance.lab._id}:${instance.username}`;

	if (!('startTime' in instance)) {
		instance.startTime = new Date().toISOString();
	}

	if (!('privateToken' in instance)) {
		instance.privateToken = uuid();
	}

	if (!('publicToken' in instance)) {
		instance.publicToken = uuid();
	}

	if ('labProxy' in config) {
		instance.labProxy = config.labProxy.url;
	}

	if ('repositories' in lab) {
		instance.repositories = {};
		for (const id in lab.repositories) {
			instance.repositories[id] = {
				link: `${config.appUrl}/instance/${encodeURIComponent(instance.privateToken)}/repository/${encodeURIComponent(id)}`
			};
		}
	}

	instance.timing = {};
	const { timing } = instance;

	if ('assistant' in lab && !('assistant' in instance)) {
		const error = await createAssistant(instance);
		if (error) {
			return error;
		}
	}

	if ('endpoints' in lab && !('endpoints' in instance) && 'labProxy' in config) {
		const error = await createEndpoints(instance);
		if (error) {
			return error;
		}
	}

	if ('gitlab' in lab && !('gitlab' in instance)) {
		const error = await createGitLabContext(instance);
		if (error) {
			return error;
		}
	}

	if ('machines' in lab && !('machines' in instance)) {
		timing.networks = [Date.now()];
		const time = Date.now();
		const bridges = {};
		instance.machines = {};

		try {
			for (const id in lab.machines) {
				const machine = lab.machines[id];
				instance.machines[id] = {
					name: machine.base.replace(/-template$/, `-${instance.username}-${time}`),
					networks: []
				};
				for (const network of machine.networks) {
					const instanceNetwork = {};
					if (network.name.endsWith('-template')) {
						const networkNName = network.name.replace(/-template$/, `-${instance.username}-${time}`);
						if (machine.type === 'lxd' || network.type === 'bridged') {
							if (!(networkNName in bridges)) {
								bridges[networkNName] = await createNetwork(networkNName);
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
			logger.error('Failed to create networks', { e: e.message });
			deleteNetworks(instance);
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
				logger.error('Failed to create machine', {
					type: lab.machines[id].type,
					machine: id,
					e: 'Unknown machine type'
				});
				break;
			}
		}

		const result = await Promise.all(promises);

		if (result.includes(false)) {
			await deleteMachines(instance);
			await deleteNetworks(instance);
			return 'Failed to create machines';
		}
	}

	try {
		instance.timing = timing;
		delete instance._rev;
		const result = await db.post(instance);
		instance._id = instance._id.slice(9);
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
		logger.info('Created lab instance', {
			lab: instance.lab._id,
			username: instance.username,
			publicToken: instance.publicToken,
			privateToken: instance.privateToken,
			timing
		});
	} catch (e) {
		if (!instance.imported) {
			await deleteMachines(instance);
			await deleteNetworks(instance);
		}
		if (e.name === 'conflict') {
			return 'Instance already exists';
		}
		throw e;
	}

	return instance;
}
