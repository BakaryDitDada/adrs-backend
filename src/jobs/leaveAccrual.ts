import cron from 'node-cron';
// import Employee from '../models/employeeModel.js';
import Employee from '../modules/employees/employees.model.js';

// Accrue 2.5 days of annual leave per month (adjust as needed)
const ACCRUAL_RATE_ANNUAL = 2.5;

cron.schedule('0 0 1 * *', async () => { // 1st of each month at midnight
  try {
    const result = await Employee.updateMany(
      { employmentStatus: 'active', isDeleted: false } as any,
      { $inc: { 'leaveBalance.annual': ACCRUAL_RATE_ANNUAL } } as any
    );
    console.log(`Leave accrual completed. Updated ${result.modifiedCount} employees.`);
  } catch (error) {
    console.error('Leave accrual error:', error);
  }
});