import { Router, Application } from 'express';
import { UserController } from './controllers/user.controller';
import { QuestionController } from './controllers/question.controller';

const setRoutes = (app: Application): void => {
  setUserRoutes(app);
  setQuestionRoutes(app);
};

const setUserRoutes = (app: Application) => {
  const router = Router();
  const controller = new UserController();

  // Users
  router.route('/').get(controller.getUsers.bind(controller));
  router.route('/create').post(controller.createUser.bind(controller));
  router.route('/login').post(controller.login.bind(controller));
  router
    .route('/me/access-token')
    .get(
      controller.verifySession.bind(controller),//middleWare
      controller.generateNewAccessToken.bind(controller)
    );

  // Apply the routes to our application with the prefix /api
  app.use('/users', router);
};

const setQuestionRoutes = (app: Application) => {
  const router = Router();
  const controller = new QuestionController();

  // questions
  router.route('/').get(controller.getQuestions.bind(controller));
  router.route('/create').post(controller.createQuestion.bind(controller));

  // Apply the routes to our application with the prefix /api
  app.use('/questions', router);
};

export default setRoutes;
