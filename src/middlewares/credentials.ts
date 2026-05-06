import { NextFunction, Request, Response } from "express";
import { allowedOrigins } from "../config/allowedOrigins.js";

export const credentials = (req: Request | any, res: Response | any, next: NextFunction) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Credentials', true);
        res.header("Access-Control-Allow-Origin", "https://dngr.dada-dev.com");
    }
    next();
}