import sendEmail from "../utils/sendEmail.js";

export const sendVerificationEmail = async (email: string, username: string, verificationCode: string) => {
  return sendEmail({
    email,
    subject: "Vérifiez votre adresse email",
    template: "activationMail.ejs",
    data: { user: { username }, verificationCode },
    message: "Message de vérification..."
  });
};

export const sendResetPasswordEmail = async (email: string, username: string, resetURL: string) => {
  return sendEmail({
    email,
    subject: "Instructions pour changer votre mot de passe",
    template: "resetPasswordMail.ejs",
    data: { username, email, resetURL },
    message: "Changer le mot de passe utilisateur..."
  });
};

export const sendSalaryReminder = async (email: string, employeesDue: any[]) => {
  return sendEmail({
    email,
    subject: "Rappel de paie - Employés à payer dans les 3 prochains jours",
    template: "salaryReminderMail.ejs",
    data: { employeesDue },
    message: 'Voici la liste des employés dont la date de paie est prévue dans les 3 prochains jours :'
  });
};

export const sendTaskAssignmentEmails = async (
  employees: { email: string; firstName: string, lastName: string }[],
  task: any
) => {
  if (!employees || employees.length === 0) {
    throw new Error("No employees provided for task assignment email.");
  }

  const results = await Promise.allSettled(
    employees.map(emp =>
      sendEmail({
        email: emp.email,
        subject: `Nouvelle tâche assignée: ${task.title}`,
        template: "taskAssignmentMail.ejs",
        data: { employeeName: emp.firstName || emp.lastName || "Collègue", task },
        message: `Vous avez une nouvelle tâche assignée: ${task.title}`
      })
    )
  );

  const successes = results.filter(r => r.status === "fulfilled").length;
  const failures = results.filter(r => r.status === "rejected");

  if (failures.length) {
    console.warn(
      `Some emails failed: ${failures.map(f => (f as any).reason.message).join(", ")}`
    );
  }

  console.log(`Emails envoyés: ${successes}, Échecs: ${failures.length}`);
};


// export const sendTaskAssignmentEmails = async (
//   employees: { email: string; firstName: string, lastName: string }[],
//   task: any
// ) => {
//   if (!employees || employees.length === 0) {
//     throw new Error("No employees provided for task assignment email.");
//   }

//   // Send emails in parallel for efficiency
//   await Promise.all(
//     employees.map(emp =>
//       sendEmail({
//         email: emp.email,
//         subject: `Nouvelle tâche assignée: ${task.title}`,
//         template: "taskAssignmentMail.ejs",
//         data: { username: emp.firstName, task },
//         message: `Vous avez une nouvelle tâche assignée: ${task.title}`
//       })
//     )
//   );

//   console.log(`Emails envoyés à ${employees.map(e => e.email).join(", ")}`);
// };

export const sendTaskAssignmentEmail = async (email: string, username: string, task: any) => {
  return sendEmail({
    email,
    subject: `Nouvelle tâche assignée: ${task.title}`,
    template: "taskAssignmentMail.ejs",
    data: { username, task },
    message: `Vous avez une nouvelle tâche assignée: ${task.title}`
  });
}

export const sendContactEmail = async (data: any) => {
  return sendEmail({
    email: "support@yourapp.com",
    subject: "Contact Support Team",
    template: "contactUsMail.ejs",
    data,
    message: "Contact Us Message..."
  });
};

export const sendWelcomeEmail = async (email: string, username: string) => {
  return sendEmail({
    email,
    subject: "Bienvenue à bord!",
    template: "welcomeMail.ejs",
    data: { username },
    message: "Welcome Email..."
  });
};
