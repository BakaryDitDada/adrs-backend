import { z } from "zod";

export const employeeCreateSchema = z.object({
  workEmail: z.string().email("Valid work email required"),
  employeeId: z.string().min(1, "Employee ID required"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  position: z.string().min(1, "Position required"),
  department: z.string().min(1, "Department required"),
  hireDate: z.coerce.date(), // handles string, Date, or number
  gender: z.enum(["Homme", "Femme"]).optional(),
  maritalStatus: z.enum(["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"]).optional(),
  nationalId: z.string().optional(),
  contractType: z.enum(["CDI", "CDD", "Stagiaire", "Consultant", "Fonctionnaire"]),
  contractEndDate: z.string().optional(),
  employmentStatus: z.enum(['En activité', 'En formation', 'Licencié', 'En congé', 'Contrat terminé', 'A la retraite']).default('En activité'),
  terminationDate: z.string().optional(),
  salaryInfo: z.object({
    baseSalary: z.number().min(0),
    currency: z.string().default("XOF"),
    payFrequency: z.enum(["Mensuel", "Hebdomadaire", "Bi-hebdomadaire"]),
    bankAccount: z.object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      accountHolder: z.string().optional(),
    }).optional(),
    allowances: z.object({
      transportation: z.number().optional().default(0),
      housing: z.number().optional().default(0),
      other: z.number().optional().default(0),
    }).optional(),
    deductions: z.object({
      tax: z.number().optional().default(0),
      socialSecurity: z.number().optional().default(0),
      other: z.number().optional().default(0),
    }).optional(),
  }),
  contact: z.object({
    phone: z.string().min(1, "Phone number required"),
    personalEmail: z.string().email("Valid personal email required").optional(),
  }),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();
export const employeeBulkCreateSchema = z.object({
  employees: z.array(employeeCreateSchema),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeeBulkCreateInput = z.infer<typeof employeeBulkCreateSchema>;