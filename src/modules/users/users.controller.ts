import { UserService } from "./users.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { Request, Response, NextFunction } from "express";

export class UserController {
  constructor(private service: UserService) {}

  create = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    console.log("Creating A User with role ::: ", req.body);
    const user = await this.service.create(req.body);
    res.status(201).json({ status: "success", data: { user } });
  });

  bulkCreate = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const users = await this.service.bulkCreateUsers(req.body);
    res.status(201).json({ status: "success", data: { users } });
  });

  list = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const sort = req.query.sort as string | undefined;
    const search = req.query.search as string | undefined;

    // Filters from query (e.g., ?role=admin)
    const filters = { ...req.query };
    const excluded = ["page", "limit", "sort", "search"];
    excluded.forEach(key => delete filters[key]);

    const result = await this.service.listUsers(filters, { page, limit, sort, search });

    res.status(200).json({
      status: "success",
      results: result.data.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.data,
    });
  });

  get = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const user = await this.service.findById(req.params.id as string);
    res.status(200).json({ status: "success", data: { user } });
  });

  getMyInfo = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const user = await this.service.findById(req.user.id as string);
    res.status(200).json({ status: "success", data: { user } });
  });

  getOne = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const filters = { ...req.query };
    const user = await this.service.findOne(filters);
    res.status(200).json({ status: "success", data: { user } });
  });

  update = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const { email, password, ...updates } = req.body; // Prevent email and password updates here
    const user = await this.service.updateById(req.params.id as string, updates);
    res.status(200).json({ status: "success", data: { user } });
  });

  updatePassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { password, newPassword, passwordConfirm } = req.body;
    const id = req.params.id as string;

    // find user to ensure it exists
    const user = await this.service.findById(id);

    // Check to see if the password is correct
    if (!(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ status: "Echec", message: "Le mot de passe actuel est incorrecte!!!" });
    }

    // Check to see if the current and new passwords are not the same
    if (password === newPassword) {
      return res.status(301).json({ status: "Avertissement", message: "Aucune modification effectuée, voulez-vous garder votre mot de passe ?" });
    }

    if (newPassword !== passwordConfirm) {
      return next(new Error("Les mots de passe ne correspondent pas!"));
    }

    // Update the user's password
    const newUser = await this.service.updatePassword(id, newPassword, passwordConfirm);

    res.status(200).json({ status: "success", data: { user: newUser } });
  });

  updatePasswordByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { newPassword, passwordConfirm } = req.body;
    const id = req.params.id as string;

    if (newPassword !== passwordConfirm) {
      return next(new Error("Les mots de passe ne correspondent pas!"));
    }

    // Update the user's password
    const newUser = await this.service.updatePassword(id, newPassword, passwordConfirm);

    res.status(200).json({ status: "success", data: { user: newUser } });

  });

  updateMyInfo = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const { email, password, ...updates } = req.body; // Prevent email and password updates here
    
    // Prevent users from updating their email or password through this route
    if (email || password) {
      return res.status(400).json({ status: "Echec", message: "Vous ne pouvez pas mettre à jour votre email ou mot de passe ici. Veuillez utiliser les routes dédiées pour cela." });
    }

    const user = await this.service.updateById(req.user.id as string, updates);
    
    return res.status(200).json({ status: "success", data: { user } });
  });

  disableMyAccount = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    await this.service.updateById(req.user.id as string, { active: false });
    res.status(204).send();
  });

  // updateOne = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  //   const filters = { ...req.query };
  //   const user = await this.service.updateOne(filters, req.body);
  //   res.status(200).json({ status: "success", data: { user } });
  // });

  delete = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    await this.service.deleteById(req.params.id as string);
    res.status(204).send();
  });
}
    