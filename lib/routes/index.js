import { Router } from 'express';
import iTeeCompat from './i-tee-compat';
import labRoutes from './lab';
import instanceRoutes from './instance';
import machineRoutes from './machine';
import repositoryRoutes from './repository';
import { getRootUrl } from '../util';


const routes = new Router;
export default routes;

routes.use(iTeeCompat);
routes.use('/lab', labRoutes);
routes.use('/instance', instanceRoutes);
routes.use('/machine', machineRoutes);
routes.use('/repository', repositoryRoutes);
routes.get('/', (req, res) => {
	res.redirect(getRootUrl(req) + '/lab');
});
