import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import AppError from "./appError.js";

const handleCastErrorDB = (err: any) => {
  const message = `Invalid path ${err.path} : ${err.value}`;
  return new AppError(message, 400);
}

const handleJWTError = () => new AppError('Token Invalide, re-essayez à nouveau!', 401);
const handleJWTExpiredError = () => new AppError('Le token a expiré, re-essayez à nouveau!', 401);

const handleDuplicateFieldsDB = (err: any) => {
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  // Modern MongoDB driver provides the exact field and value in `err.keyValue`
  const fieldName = Object.keys(err.keyValue)[0];
  const value = err.keyValue[fieldName];
  const message = `Le champ avec le nom "${value}" existe déjà, donnez un nom différent!`;
  return new AppError(message, 400);
}

const handleValidationErrorDB = (err: any) => {
  const value = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data: ${value.join(' -- ')}`;
  return new AppError(message, 400);
}

const sendDevError = (err: any, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
}

const sendProdError = (err: any, res: Response) => {
  if(err.isOperational === true) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // 1) Log error for backend developers
    console.error('ERROR 💥', err);

    // 2) Send generic message to the client
    res.status(500).json({
      status: 'error',
      message: 'Une erreur s\'est produite!!!'
    })
  }
}

const globalErrorHandler: ErrorRequestHandler = (
  err: any, 
  _req: Request | any, 
  res: Response,
  _next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if(process.env.NODE_ENV === 'development') {
    sendDevError(err, res);
  } else if(process.env.NODE_ENV === 'production') {
    let error = {...err};
    error.name = err.name;
    error.message = err.message;
    error.code = err.code;

    if(error.name === 'CastError') error = handleCastErrorDB(error);
    if(error.code === 11000) error = handleDuplicateFieldsDB(error);
    if(error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if(error.name === 'JsonWebTokenError') error = handleJWTError();
    if(error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if(error.name === 'UnauthorizedError' || error.message.includes('token')) error = handleJWTExpiredError()
    
    sendProdError(error, res);
  }
}

export default globalErrorHandler;