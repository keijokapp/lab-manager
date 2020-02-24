/* eslint-disable no-console */
import fs from 'fs';
import yaml from 'js-yaml';
import { validate } from 'jsonschema';


// eslint-disable-next-line import/no-mutable-exports
let config;

try {
	if (process.argv.length >= 3) {
		console.log('Reading configuration from %s', process.argv[2]);
		config = yaml.safeLoad(fs.readFileSync(process.argv[2]));
	} else {
		console.log('Reading configuration from standard input');
		config = yaml.safeLoad(fs.readFileSync(0));
	}
} catch (e) {
	console.error('Failed to read configuration: %s', e.message);
	process.exit(1);
}

const validationResult = validate(config, {
	type: 'object',
	properties: {
		listen: {
			oneOf: [{
				type: 'string',
				enum: ['systemd']
			}, {
				type: 'object',
				properties: {
					port: { type: 'integer', min: 1, max: 65535 },
					address: { type: 'string', minLength: 1 }
				},
				additionalProperties: false,
				required: ['port']
			}, {
				type: 'object',
				properties: {
					path: { type: 'string', minLength: 1 },
					mode: { oneOf: [{ type: 'string' }, { type: 'integer' }] }
				},
				additionalProperties: false,
				required: ['path']
			}]
		},
		database: {
			type: 'string',
			minLength: 1
		},
		tokens: {
			type: 'array',
			items: {
				type: 'string',
				minLength: 1
			}
		},
		labProxy: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 }
			},
			required: ['url', 'key']
		},
		virtualbox: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 }
			},
			required: ['url']
		},
		remote: {
			type: 'string',
			minLength: 1
		},
		appUrl: {
			type: 'string',
			minLength: 1
		},
		repositories: {
			type: 'string',
			minLength: 1
		},
		lxd: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				certificate: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 }
			},
			required: ['url', 'certificate', 'key']
		},
		iTee: {
			type: 'object',
			properties: {
				url: { type: 'string', minLength: 1 },
				key: { type: 'string', minLength: 1 }
			},
			required: ['url']
		}
	},
	required: ['listen', 'database', 'appUrl'],
	additionalProperties: false
});

if (validationResult.errors.length) {
	console.error('Found configuration errors:');
	for (const error of validationResult.errors) {
		console.error(error.message);
	}
	process.exit(1);
}

export default config;
