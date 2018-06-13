'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fetchMethod(method) {
	return function (url, body) {
		const options = { method };

		if (body !== undefined) {
			options.headers = {
				accept: 'application/json'
			};
			if (body !== null) {
				options.headers['content-type'] = 'application/json';
				options.body = JSON.stringify(body);
			}
		}

		return (0, _nodeFetch2.default)(url, options);
	};
}

exports.default = {
	get: fetchMethod('GET'),
	post: fetchMethod('POST'),
	put: fetchMethod('PUT'),
	patch: fetchMethod('PATCH'),
	delete: fetchMethod('DELETE')
};