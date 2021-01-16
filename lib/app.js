import express from 'express';
import browserify from 'browserify-middleware';
import expressWinston from 'express-winston';
import bearerToken from 'express-bearer-token';
import { createPaths } from 'express-openapi-middleware';
import swaggerUi from 'swagger-ui-express';
import config from './config.js';
import { logger, reqid } from './common.js';
import routes from './routes/index.js';

// eslint-disable-next-line import/no-extraneous-dependencies
const babelify = __dirname.endsWith('/lib') ? require('babelify') : undefined;

const app = express();
export default app;

app.set('json spaces', 2);
app.set('trust proxy', true);

app.use(reqid);

expressWinston.requestWhitelist.push('body');
app.use(expressWinston.logger({ winstonInstance: logger }));

const openapi = {
	openapi: '3.0.0',
	servers: [{ url: config.appUrl }],
	tags: [
		{ name: 'Lab', description: 'Labs' },
		{ name: 'Instance', description: 'Running labs' },
		{ name: 'Machine', description: 'VirtualBox machines' },
		{ name: 'Repository', description: 'Git repositories' },
		{ name: 'I-Tee compatibility', description: 'Limited I-Tee compatibility API' }
	],
	paths: createPaths(routes)
};

app.use('/docs/api', swaggerUi.serve, swaggerUi.setup(openapi));

const externalModules = ['react', 'react-dom', 'semantic-ui-react', 'table-dragger'];
app.get('/bundle.js', browserify(externalModules, {
	transform: babelify,
	paths: [`${__dirname}/../node_modules`],
	external: externalModules.concat(['!!../node_modules/css-loader/index.js!./main.css'])
}));
app.use('/bundle', browserify(`${__dirname}/public`, {
	transform: babelify,
	paths: [`${__dirname}/../node_modules`],
	external: externalModules.concat(['!!../node_modules/css-loader/index.js!./main.css'])
}));
app.use(express.static(`${__dirname}/../public`));
app.use(express.json());
app.use(bearerToken());
app.use(routes);

// catch 404 and forward to error handler
// eslint-disable-next-line no-unused-vars
app.use((req, res, next) => {
	res.status(404).send({
		error: 'Not Found',
		message: 'Page not found'
	});
});

// eslint-disable-next-line no-unused-vars
app.use((e, req, res, next) => {
	if (e instanceof Error) {
		if (e.name === 'OpenAPIValidationError') {
			res.status(400).send({
				error: 'Bad Request',
				validations: e.errors
			});
		} else {
			logger.error('Application error ', { e: e.message, stack: e.stack });
			res.status(500).send({
				error: 'Internal Server Error',
				message: 'Something has gone wrong'
			});
		}
	} else {
		logger.error('Unknown application error ', { e });
		res.status(500).send();
	}
});
