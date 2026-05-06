import authRouter from "../modules/auth/auth.routes.js";
import userRouter from "../modules/users/users.routes.js";
import docsRouter from "../modules/documents/docs.routes.js";
import taskRouter from "../modules/tasks/tasks.routes.js";
import payrollRouter from "../modules/payrolls/payrolls.routes.js";
import projectRouter from "../modules/projects/projects.routes.js";
import employeeRouter from "../modules/employees/employees.routes.js";
import leaveRouter from "../modules/leaves/leaves.routes.js";
import aiRouter from "../modules/ai/ai.routes.js";
import dashboardRouter from "../modules/dashboard/dashboard.routes.js"

export const registerRoutes = (app: any) => {
    app.use('/api/v1/users', userRouter);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/leaves', leaveRouter);
    app.use('/api/v1/ai', aiRouter);
    app.use('/api/v1/employees', employeeRouter);
    app.use('/api/v1/payrolls', payrollRouter);
    app.use('/api/v1/documents', docsRouter);
    app.use('/api/v1/projects', projectRouter);
    app.use('/api/v1/tasks', taskRouter);
    app.use('/api/v1/dashboard', dashboardRouter);
};