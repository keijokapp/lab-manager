import { Router } from 'express';
import config from '../config.js';
import labRoutes from './lab.js';
import instanceRoutes from './instance.js';
import machineRoutes from './machine.js';
import repositoryRoutes from './repository.js';

const routes = new Router();
export default routes;

routes.use('/lab', labRoutes);
routes.use('/instance', instanceRoutes);
routes.use('/machine', machineRoutes);
routes.use('/repository', repositoryRoutes);
routes.get('/', (req, res) => {
	res.redirect(`${config.appUrl}/lab`);
});
