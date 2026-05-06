import cron from 'node-cron';
import User from '../modules/users/users.model.js';

// Runs every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  await User.updateMany(
    {
      passwordResetExpires: { $lt: new Date() }
    },
    {
      $unset: {
        passwordResetToken: "",
        passwordResetExpires: ""
      }
    }
  );
});