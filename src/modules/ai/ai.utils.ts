export const getRelevantTools = (message: string, availableTools: any[]): any[] => {
  const query = message.toLowerCase();

  // Example intent mapping matching your 4 core domains
  const wantsEmployeeData = query.includes("employé") || query.includes("salarié") || query.includes("jean");
  const wantsProjectData = query.includes("projet") || query.includes("infrastructure") || query.includes("adrs");
  const wantsTaskData = query.includes("tâche") || query.includes("avancement") || query.includes("à faire") || query.includes("en cours");
  const wantsLeaveData = query.includes("congé") || query.includes("absence") || query.includes("maladie");

  return availableTools.filter(tool => {
    // If it's a structural or fallback tool, always keep it
    if (tool.name.includes("fallback") || tool.name.includes("general")) return true;

    // Filter based on matched keywords/intents
    if (wantsEmployeeData && tool.name.includes("employee")) return true;
    if (wantsProjectData && tool.name.includes("project")) return true;
    if (wantsTaskData && tool.name.includes("task")) return true;
    if (wantsLeaveData && tool.name.includes("leave")) return true;

    // If the user's prompt is completely generic, keep it available or default-include
    return false;
  });
};