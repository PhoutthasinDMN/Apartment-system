import { z } from 'zod';

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const meterInputSchema = z.object({
  previousReading: z.number().nonnegative(),
  currentReading: z.number().nonnegative(),
  rate: z.number().nonnegative(),
  meterReset: z.boolean().default(false),
});

export function calculateMeter(input: z.input<typeof meterInputSchema>) {
  const value = meterInputSchema.parse(input);
  if (!value.meterReset && value.currentReading < value.previousReading) throw new Error('current_reading_below_previous');
  const units = value.meterReset ? value.currentReading : value.currentReading - value.previousReading;
  return { units, amount: money(units * value.rate) };
}

export function invoicePaymentState(total: number, paid: number, dueDate: Date, now = new Date()) {
  if (total < 0 || paid < 0) throw new Error('invalid_invoice_amount');
  const balance = money(Math.max(total - paid, 0));
  const status = paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : dueDate < now ? 'overdue' : 'unpaid';
  return { paid: money(Math.min(paid, total)), balance, status } as const;
}

export function calculateCheckout(deposit: number, outstanding: number, damage: number, otherDeduction: number) {
  const values = [deposit, outstanding, damage, otherDeduction];
  if (values.some((value) => value < 0)) throw new Error('invalid_checkout_amount');
  const totalDeductions = money(outstanding + damage + otherDeduction);
  return { totalDeductions, refund: money(Math.max(deposit - totalDeductions, 0)), additionalAmountDue: money(Math.max(totalDeductions - deposit, 0)) };
}
