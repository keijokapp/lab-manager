import { Router } from 'express';
import config from '../config';
import labRoutes from './lab';
import instanceRoutes from './instance';
import machineRoutes from './machine';
import repositoryRoutes from './repository';


const routes = new Router();
export default routes;

routes.use('/lab', labRoutes);
routes.use('/instance', instanceRoutes);
routes.use('/machine', machineRoutes);
routes.use('/repository', repositoryRoutes);
routes.get('/', (req, res) => {
	res.redirect(`${config.appUrl}/lab`);
});
