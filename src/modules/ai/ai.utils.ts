import { getAllTools } from "./tools/index.js";

export function getRelevantTools(
  userMessage: string
) {

  const query =
    userMessage.toLowerCase();

  const tools =
    getAllTools();

  //
  // EMPLOYEES
  //
  if (
    query.includes("employé") ||
    query.includes("employee") ||
    query.includes("rh")
  ) {

    return tools.filter(tool =>
      [
        "get_employee_count",
        "get_employees_by_role",
        "get_employee_details",
        // "get_current_leave_count"
      ].includes(tool.name)
    );
  }

  //
  // PROJECTS
  //
  if (
    query.includes("projet")
  ) {

    return tools.filter(tool =>
      [
        "get_active_projects",
        "get_all_projects",
        "get_all_projects_summary"
      ].includes(tool.name)
    );
  }

  //
  // TASKS
  //
  if (
    query.includes("tâche") ||
    query.includes("activité") ||
    query.includes("réalisation") ||
    query.includes("task")
  ) {

    return tools.filter(tool =>
      [
        "get_task_stats",
        "get_all_tasks"
      ].includes(tool.name)
    );
  }

  //
  // REPORTS
  //
  if (
    query.includes("rapport")
  ) {

    return tools;
  }

  //
  // DEFAULT
  //
  return tools;
}