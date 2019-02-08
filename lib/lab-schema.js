export default {
	type: 'object',
	properties: {
		_id: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
		_rev: { type: 'string' },
		machines: {
			type: 'object',
			minItems: 1,
			additionalProperties: {
				type: 'object',
				oneOf: [{
					properties: {
						type: { type: 'string', enum: ['virtualbox'] },
						base: { type: 'string', pattern: '^[a-zA-Z0-9-]+-template$' },
						description: { type: 'string' },
						enable_autostart: { type: 'boolean' },
						enable_private: { type: 'boolean' },
						enable_remote: { type: 'boolean' },
						enable_restart: { type: 'boolean' },
						networks: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['bridged', 'virtualbox'] },
									name: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
									ip: { type: 'string', minLength: 1 },
									promiscuous: { type: 'boolean' },
									resetMac: { type: 'boolean' }
								},
								required: ['type', 'name'],
								additionalProperties: false
							}
						}
					},
					additionalProperties: false,
					required: ['type', 'base', 'description', 'networks']
				}, {
					properties: {
						type: { type: 'string', enum: ['lxd'] },
						base: { type: 'string', pattern: '^[a-zA-Z0-9-]+-template$' },
						description: { type: 'string' },
						enable_autostart: { type: 'boolean' },
						enable_private: { type: 'boolean' },
						enable_restart: { type: 'boolean' },
						networks: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' }
								},
								required: ['name'],
								additionalProperties: false
							}
						},
						limits: {
							type: 'object',
							properties: {
								cpu: { type: 'integer', min: 1 },
								cpuAllowance: { type: 'integer', min: 1, max: 99 },
								memory: { type: 'integer', min: 1 }
							},
							minProperties: 1
						},
						repositories: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
									location: { type: 'string', pattern: '^/.+$' },
									ref: { type: 'string', pattern: '^[a-zA-Z0-9_/-]+$' }
								},
								additionalProperties: false,
								required: ['name', 'location', 'ref']
							},
							minItems: 1
						}
					},
					additionalProperties: false,
					required: ['type', 'base', 'description', 'networks']
				}]
			}
		},
		machineOrder: { type: 'array', 'items': { type: 'string', minLength: 1 } },
		primaryMachine: { type: 'string', minLength: 1 },
		assistant: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 },
				lab: { type: 'string', minLength: 1 }
			},
			additionalProperties: false
		},
		repositories: {
			type: 'object',
			patternProperties: {
				'^[a-zA-Z0-9_-]+$': {
					type: 'object',
					properties: {
						name: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
						head: { type: 'string', pattern: '^[a-zA-Z0-9_/-]+$' }
					},
					required: ['name']
				}
			},
			minItems: 1
		},
		endpoints: {
			type: 'array',
			uniqueItems: true,
			items: { type: 'string', minLength: 1 }
		},
		gitlab: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 }
			},
			additionalProperties: false,
			required: ['url', 'key']
		}
	},
	additionalProperties: false,
	dependencies: {
		machines: ['machineOrder'],
		machineOrder: ['machines'],
		primaryMachine: ['machines']
	}
};

