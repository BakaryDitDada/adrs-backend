import { addWeeks, addMonths } from 'date-fns';

export const calculateNextPayDate = (currentPayDate: Date, frequency: 'Mensuel' | 'Bi-hebdomadaire' | 'Hebdomadaire'): Date => {
  switch (frequency) {
    case 'Hebdomadaire':
      return addWeeks(currentPayDate, 1);
    case 'Bi-hebdomadaire':
      return addWeeks(currentPayDate, 2);
    case 'Mensuel':
      return addMonths(currentPayDate, 1);
    default:
      return addMonths(currentPayDate, 1); // fallback
  }
};