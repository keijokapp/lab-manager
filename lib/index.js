#!/usr/bin/node

import { chmodSync, unlinkSync } from 'fs';
import http from 'http';
import cleanup from './cleanup';
import { logger } from './common';
import config from './config';
import app from './app';


let notify = {
	ready() {
	}
};

try {
	// eslint-disable-next-line global-require,import/no-extraneous-dependencies
	notify = require('sd-notify');
} catch (e) {
	logger.debug('Systemd notifications are disabled');
}


const server = http.createServer(app);

server.on('error', e => {
	logger.error('Server error', { e });
	cleanup(1);
});

cleanup((exit, callback) => {
	server.close();
	logger.on('finish', callback);
	logger.info('Exiting...', { exit });
	logger.end();
	if (config.listen.path) {
		try {
			unlinkSync(config.listen.path);
		} catch (e) {
			if (e.code !== 'ENOENT') {
				throw e;
			}
		}
	}
});

if (config.listen === 'systemd') {
	const socketCount = parseInt(process.env.LISTEN_FDS, 10);
	if (socketCount !== 1) {
		logger.error('Bad number of sockets', { socketCount });
	} else {
		const PipeWrap = process.binding('pipe_wrap');
		let handle;
		if (PipeWrap.constants && typeof PipeWrap.constants.SOCKET !== 'undefined') {
			handle = new PipeWrap.Pipe(PipeWrap.constants.SOCKET);
		} else {
			handle = new PipeWrap.Pipe();
		}
		handle.open(3);
		// eslint-disable-next-line no-underscore-dangle
		server._handle = handle;
		// eslint-disable-next-line no-underscore-dangle
		server._listen2(null, -1, -1);
		logger.info('Listening', { fd: 3 });
		notify.ready();
	}
} else if ('port' in config.listen) {
	server.listen(config.listen.port, config.listen.address, () => {
		const address = server.address();
		logger.info('Listening', address);
		notify.ready();
	});
} else if ('path' in config.listen) {
	server.listen(config.listen.path, () => {
		let error = false;
		if ('mode' in config.listen) {
			try {
				chmodSync(config.listen.path, config.listen.mode);
			} catch (e) {
				error = true;
				logger.error(e.code === 'ERR_INVALID_ARG_VALUE' ? 'Bad socket mode' : 'Failed to set socket mode', {
					path: config.listen.path,
					mode: config.listen.mode
				});
				server.close();
			}
		}
		if (!error) {
			logger.info('Listening', { path: config.listen.path });
			notify.ready();
		}
	});
}
