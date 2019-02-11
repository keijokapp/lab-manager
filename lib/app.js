import path from 'path';
import express from 'express';
import browserify from 'browserify-middleware';
import expressWinston from 'express-winston';
import bearerToken from 'express-bearer-token';
import { createPaths, OpenAPIValidationError } from 'express-openapi-middleware';
import config from './config';
import { logger, reqid } from './common';
import routes from './routes';
import { getRootUrl } from './util';
import { routes as iTeeCompatRoutes } from './routes/i-tee-compat';

const babelify = process.env.NODE_ENV !== 'production' ? require('babelify') : undefined;


const app = express();
export default app;

app.set('json spaces', 2);

if('trustProxy' in config) {
	app.set('trust proxy', config.trustProxy);
}

app.use(reqid);

expressWinston.requestWhitelist.push('body');
app.use(expressWinston.logger({ winstonInstance: logger }));

const openapi = {
	openapi: '3.0.0',
	tags: [
		{ 'name': 'Lab', 'description': 'Labs' },
		{ 'name': 'Instance', 'description': 'Running labs' },
		{ 'name': 'Machine', 'description': 'VirtualBox machines' },
		{ 'name': 'Repository', 'description': 'Git repositories' },
		{ 'name': 'I-Tee compatibility', 'description': 'Limited I-Tee compatibility API' }
	],
	paths: { ...createPaths(routes), ...createPaths(iTeeCompatRoutes) }
};

const externalModules = ['react', 'react-dom', 'semantic-ui-react', 'table-dragger'];
app.get('/bundle.js', browserify(externalModules, {
	transform: babelify,
	paths: [__dirname + '/../node_modules'],
	external: externalModules.concat(['!!./../node_modules/css-loader/index.js!./main.css'])
}));
app.use('/bundle', browserify(path.join(__dirname, 'public'), {
	transform: babelify,
	paths: [__dirname + '/../node_modules'],
	external: externalModules.concat(['!!./../node_modules/css-loader/index.js!./main.css'])
}));
app.use(express.static(path.dirname(require.resolve('semantic-ui-css'))));
app.use(express.json());
app.use(bearerToken());
app.use(routes);
app.get('/openapi.json', (req, res) => {
	const oa = {
		...openapi,
		servers: [{ url: getRootUrl(req) }]
	};
	res.set('access-control-allow-origin', '*');
	res.send(oa);
});


// catch 404 and forward to error handler
app.use((req, res, next) => {
	res.status(404).send({
		error: 'Not Found',
		message: 'Page not found'
	});
});

app.use((e, req, res, next) => {
	if(e instanceof OpenAPIValidationError) {
		res.status(400).send({
			error: 'Bad Request',
			errors: e.errors
		});
	} else if(e instanceof Error) {
		logger.error('Application error ', { e: e.message, stack: e.stack });
		res.status(500).send({
			error: 'Internal Server Error',
			message: 'Something has gone wrong'
		});
	} else {
		logger.error('Unknown application error ', { e });
		res.status(500).send();
	}
});
