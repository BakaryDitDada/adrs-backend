import express from 'express';
import * as controller from './auth.controller.js';

const authRouter: express.Router = express.Router();

authRouter.post('/register', controller.signup);
authRouter.post('/signin', controller.login);
authRouter.post('/signout', controller.logout);
authRouter.post('/activate', controller.saveUser);

authRouter.get('/refresh', controller.refresh);

authRouter.post('/forgot-password', controller.forgotPassword);

authRouter.patch('/reset-password/:token', controller.resetPassword);

export default authRouter;