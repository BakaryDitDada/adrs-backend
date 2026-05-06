import cron from 'node-cron';
import Employee from '../modules/employees/employees.model.js';
import User from '../modules/users/users.model.js';
import { sendSalaryReminder } from '../services/email.service.js';


// Schedule job to run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    // Find active employees whose nextPayDate is within the next 3 days
    const employeesDue = await Employee.find({
      employmentStatus: 'active',
      isDeleted: false,
      nextPayDate: {
        $gte: today,
        $lte: threeDaysLater,
      },
    } as any).select('firstName lastName employeeId department nextPayDate');

    if (employeesDue.length === 0) return;

    // Fetch HR admins (users with role 'admin' or 'hr')
    const hrAdmins = await User.find({
      role: { $in: ['admin', 'hr'] },
      status: 'active',
    }).select('email');

    const adminEmails = hrAdmins.map(u => u.email);

    if (adminEmails.length === 0) {
      console.warn('No HR admin emails found for payroll reminder');
      return;
    }

    // Send email
    // await sendSalaryReminder(adminEmails.join(", "), employeesDue);
    await sendSalaryReminder(adminEmails.join(", "), employeesDue);

  } catch (error) {
    console.error('Error in payroll reminder cron job:', error);
  }
});