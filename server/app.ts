import * as express from 'express';
import * as bodyParser from 'body-parser';

import setRoutes from './routes';
import { run } from './db';
import { UserController } from './controllers/user.controller';

run().catch((err) => console.log(err));

// add default admin
new UserController().addDefaultAdmin();

const app = express();

//#region middleWares

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// CORS HEADERS MIDDLEWARE
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, x-access-token, _id'
  );

  res.header('Access-Control-Expose-Headers', 'x-access-token');

  next();
});

//#endregion middleWares

setRoutes(app);
const port = process.env.PORT || 5000;

app.listen(port, () =>
  console.log('> Server is up and running on port : ' + port)
);
