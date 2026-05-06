import { employeeTools, injectEmployeeRepo } from './employee.tools.js';
import { leaveTools, injectLeaveRepo } from './leave.tools.js';
import { projectTools, injectProjectRepo } from './project.tools.js';
import { taskTools, injectTaskRepo } from './task.tools.js';

export const getAllTools = () => [
  ...employeeTools,
  ...leaveTools,
  ...projectTools,
  ...taskTools
];

export const injectRepositories = (repos: {
  employeeRepo: any;
  leaveRepo: any;
  projectRepo: any;
  taskRepo: any;
}) => {
  injectEmployeeRepo(repos.employeeRepo);
  injectLeaveRepo(repos.leaveRepo);
  injectProjectRepo(repos.projectRepo);
  injectTaskRepo(repos.taskRepo);
};