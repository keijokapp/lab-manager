function fetchMethod(method) {
	return function(url, body) {
		const options = {
			method,
			credentials: 'same-origin'
		};

		if(body !== undefined) {
			options.headers = {
				accept: 'application/json'
			};
			if(body !== null) {
				options.headers['content-type'] = 'application/json';
				options.body = JSON.stringify(body);
			}
		}

		return fetch(url, options);
	};
}


export default {
	get: fetchMethod('GET'),
	post: fetchMethod('POST'),
	put: fetchMethod('PUT'),
	patch: fetchMethod('PATCH'),
	delete: fetchMethod('DELETE')
};
