import * as express from 'express';
import * as bodyParser from 'body-parser';

import setRoutes from './routes';
import { run } from './db';

run().catch((err) => console.log(err));

const app = express();

//#region middleWares

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

setRoutes(app);

//#endregion middleWares

const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('hello from simple server :)');
});

app.listen(port, () =>
  console.log('> Server is up and running on port : ' + port)
);
