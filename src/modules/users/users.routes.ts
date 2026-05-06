import { Router } from "express";
import { UserController } from "./users.controller.js";
import { UserService } from "./users.service.js";
import { UserRepository } from "./users.repository.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";
import { validateUserCreate, validateUserUpdate, validateUserBulkCreate } from "./users.middleware.js";

const userRouter: Router = Router();
const userService = new UserService(new UserRepository());
const userController = new UserController(userService);

userRouter.use(protect);

userRouter.post("/bulk", restrictTo("admin"), validateUserBulkCreate, userController.bulkCreate);
userRouter.post("/", restrictTo("admin"), validateUserCreate, userController.create);

userRouter.get("/search", restrictTo("admin", "user"), userController.getOne);
userRouter.get("/me", restrictTo("admin", "user"), userController.getMyInfo);
userRouter.get("/", restrictTo("admin"), userController.list);
userRouter.get("/:id", restrictTo("admin", "user"), userController.get);

userRouter.patch("/me/update", restrictTo("admin", "user"), validateUserUpdate, userController.updateMyInfo);
userRouter.patch("/:id", restrictTo("admin", "user"), validateUserUpdate, userController.update);

userRouter.delete("/me/disable", restrictTo("admin", "user"), userController.disableMyAccount);
userRouter.delete("/:id", restrictTo("admin"), userController.delete);

export default userRouter;