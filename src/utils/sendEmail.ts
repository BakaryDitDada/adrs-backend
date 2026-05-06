import { createTransport } from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

interface IEmailOptions {
  email: string;
  subject: string;
  template?: string | any;
  data?: {[key: string]: any};
  message: string;
}

const sendEmail = async (options: IEmailOptions): Promise<void> => {;

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error("SMTP credentials are not properly configured.");
  }

  const transporter = createTransport({
  host: "smtp.gmail.com",
  // port: 465,
  port: 587,
  // secure: true, // IMPORTANT for 465
  secure: false, // IMPORTANT for 587
  auth: {
    user: process.env.SMTP_EMAIL!,
    pass: process.env.SMTP_PASSWORD!,
  },
});

  const templateDir = process.env.EMAIL_TEMPLATE_DIR || path.resolve(process.cwd(), "src", "templates");
  const templatePath = path.join(templateDir, options.template);

  // Render the email template with EJS
  const html:string = await ejs.renderFile(templatePath, options.data || {});

  // 2) Define the mail options
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html
  };

  // 3) Send the Email
  try {
    // await transporter.sendMail(mailOptions);
    await transporter.verify(); 
    await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${options.email}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    throw new Error("Échec de l'envoi de l'email. Veuillez réessayer plus tard.");
  }
};

export default sendEmail;