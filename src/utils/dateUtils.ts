import { addWeeks, addMonths } from 'date-fns';

export const calculateNextPayDate = (currentPayDate: Date, frequency: 'monthly' | 'bi-weekly' | 'weekly'): Date => {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentPayDate, 1);
    case 'bi-weekly':
      return addWeeks(currentPayDate, 2);
    case 'monthly':
      return addMonths(currentPayDate, 1);
    default:
      return addMonths(currentPayDate, 1); // fallback
  }
};