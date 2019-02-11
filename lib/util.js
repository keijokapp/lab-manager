export function asyncMiddleware(handler) {
	return function() {
		const next = arguments.length === 4 ? arguments[3] : arguments[2];
		const res = arguments.length === 4 ? arguments[2] : arguments[1];

		handler.apply(this, [].slice.call(arguments, 0, arguments.length - 1))
			.then(() => {
				if(!res.finished) {
					next();
				}
			})
			.catch(e => {
				if(!res.finished) {
					next(e);
				}
			});
	};
}


/**
 * Returns req.hostname with port if present in header
 * @param req {object} Express request
 * @returns {string} request host or undefined
 */
export function getHost(req) {
	const trust = req.app.get('trust proxy fn');
	let host = req.get('X-Forwarded-Host');

	if (!host || !trust(req.connection.remoteAddress, 0)) {
		host = req.get('Host');
	}

	if(!host) {
		// better to have dummy value than
		// leave it empty or undefined
		// TODO: should return Bad Request?
		host = 'host-not-available';
	}

	return host;
}


/**
 * Detects application root path based on X-Forwared-Path
 * @param req {object} Express request
 * @returns {string} request path prefix
 */
export function getPathPrefix(req) {
	const trust = req.app.get('trust proxy fn');
	const path = req.get('X-Forwarded-Path');
	if(!path || !trust(req.connection.remoteAddress, 0)) {
		return '';
	}

	return path.split(', ')[0];
}


/**
 * Detects application root URL
 * @param req {object} Express request
 */
export function getRootUrl(req) {
	let pathPrefix = getPathPrefix(req);
	if(pathPrefix && !pathPrefix.startsWith('/')) {
		pathPrefix = '/' + pathPrefix;
	}
	return `${req.protocol}://${getHost(req)}${pathPrefix}`;
}
