'use strict';
import {Express} from 'express';
import {UploadVideo, Home, GetUrl, GetAccessToken} from '../controllers/app.controller';
import * as yargs from 'yargs';
const argv = yargs.argv;
const expire = argv.cache ? Number(argv.cache) : 60 * 30;

export function routes(app: Express) {
  app.route('/').get(Home);
  app.route('/api/url').get(GetUrl);
  app.route('/api/upload').post(UploadVideo);
  app.route('/api/upload/:id').post(UploadVideo);
  app.route('/api/auth').get(GetAccessToken);
}
