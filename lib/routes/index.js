import { Router } from 'express';
import config from '../config';
import iTeeCompat from './i-tee-compat';
import labRoutes from './lab';
import instanceRoutes from './instance';
import machineRoutes from './machine';
import repositoryRoutes from './repository';


const routes = new Router;
export default routes;

routes.use(iTeeCompat);
routes.use((req, res, next) => {
	if('if-match' in req.headers) {
		if(!('rev' in req.query)) {
			req.query.rev = req.headers['if-match'];
		}
	} else {
		req.headers['if-match'] = req.query.rev;
	}
	next();
});
routes.use('/lab', labRoutes);
routes.use('/instance', instanceRoutes);
routes.use('/machine', machineRoutes);
routes.use('/repository', repositoryRoutes);
routes.get('/', (req, res) => {
	res.redirect(config.appUrl + '/lab');
});
