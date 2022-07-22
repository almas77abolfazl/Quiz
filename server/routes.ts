import { UserController } from './controllers/user.controller';
import { Router, Application } from 'express';

const setRoutes = (app: Application): void => {
  const router = Router();
  const userCtrl = new UserController();

  // Users
  router.route('/create').post(userCtrl.createUser.bind(userCtrl));
  // router.route('/login').post(userCtrl.login);
  // router.route('/users').get(userCtrl.getAll);
  // router.route('/users/count').get(userCtrl.count);
  // router.route('/user/:id').get(userCtrl.get);
  // router.route('/user/:id').put(userCtrl.update);
  // router.route('/user/:id').delete(userCtrl.delete);

  // Apply the routes to our application with the prefix /api
  app.use('/users', router);
};

export default setRoutes;
