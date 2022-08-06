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
  router
    .route('/')
    .get(
      controller.authenticate.bind(controller),
      controller.getUsers.bind(controller)
    );

  router.route('/create').post(controller.createUser.bind(controller));

  router.route('/login').post(controller.login.bind(controller));

  router.route('/me/access-token').get(
    controller.verifySession.bind(controller), //middleWare
    controller.generateNewAccessToken.bind(controller)
  );
  router
    .route('/:id')
    .get(
      controller.authenticate.bind(controller),
      controller.getUserById.bind(controller)
    );

  // Apply the routes to our application with the prefix /api
  app.use('/users', router);
};

const setQuestionRoutes = (app: Application) => {
  const router = Router();
  const controller = new QuestionController();
  const userController = new UserController();

  // questions
  router
    .route('/')
    .get(
      userController.authenticate.bind(userController),
      controller.getQuestions.bind(controller)
    );
  router
    .route('/create')
    .post(
      userController.authenticate.bind(userController),
      controller.createQuestion.bind(controller)
    );
  router
    .route('/update')
    .post(
      userController.authenticate.bind(userController),
      controller.updateQuestion.bind(controller)
    );
  router
    .route('/random')
    .get(
      userController.authenticate.bind(userController),
      controller.getRandom.bind(controller)
    );
  router
    .route('/:id')
    .delete(
      userController.authenticate.bind(userController),
      controller.deleteQuestion.bind(controller)
    );
  router
    .route('/:id')
    .get(
      userController.authenticate.bind(userController),
      controller.getQuestionById.bind(controller)
    );

  // Apply the routes to our application with the prefix /api
  app.use('/questions', router);
};

export default setRoutes;
