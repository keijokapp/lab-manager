import path from 'path';
import express from 'express';
import browserify from 'browserify-middleware';
import expressWinston from 'express-winston';
import bearerToken from 'express-bearer-token';
import { logger, reqid } from './common';
import routes from './routes';

const babelify = process.env.NODE_ENV !== 'production' ? require('babelify') : undefined;


const app = express();
export default app;

app.set('json spaces', 2);
app.set('trust proxy', true);

app.use(reqid);

expressWinston.requestWhitelist.push('body');
app.use(expressWinston.logger({ winstonInstance: logger }));

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
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(bearerToken());
app.use(routes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
	res.status(404).send({
		error: 'Not Found',
		message: 'Page not found'
	});
});

app.use((e, req, res, next) => {
	if(e && e.name === 'JsonSchemaValidation') {
		res.status(400);
		res.send({
			error: 'Bad Request',
			validations: e.validations
		});
	} else if(!(e instanceof Error)) {
		logger.error('Unknown application error ', { e });
		res.status(500).send();
	} else {
		logger.error('Application error ', { e: e.message, stack: e.stack });
		res.status(500).send({
			error: 'Internal Server Error',
			message: 'Something has gone wrong'
		});
	}
});
