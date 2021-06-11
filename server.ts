import * as express from "express";
import * as bodyParser from "body-parser";
import { routes } from "./api/routes/app.routes";
import * as cors from "cors";
import * as http from "http";
// tslint:disable-next-line:no-duplicate-imports
import * as _ from "lodash";
import { Logger } from "./helpers/logger";

Logger.setup();

const port = process.env.PORT || 1337;
const app = express();
const oneHour = 3600000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  express.static("public", {
    maxAge: oneHour,
  })
);

// Use cors
app.use(cors());

// Define routes
routes(app);

// If route was not found
// General error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: "Internal Error" });
});

const httpsServer = http.createServer(app);
httpsServer.listen(port);

Logger.log(`Server runs on port ${port}`);
