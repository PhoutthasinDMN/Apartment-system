import { describe, expect, it } from 'vitest';
import { calculateCheckout, calculateMeter, invoicePaymentState } from './billing';

describe('meter calculation', () => {
  it('calculates units and amount', () => expect(calculateMeter({ previousReading: 120, currentReading: 145.5, rate: 1200 })).toEqual({ units: 25.5, amount: 30600 }));
  it('rejects a decreasing meter', () => expect(() => calculateMeter({ previousReading: 120, currentReading: 119, rate: 1200 })).toThrow('current_reading_below_previous'));
  it('supports an explicit meter reset', () => expect(calculateMeter({ previousReading: 900, currentReading: 12, rate: 1000, meterReset: true })).toEqual({ units: 12, amount: 12000 }));
});

describe('invoice payment state', () => {
  it('marks a partial payment', () => expect(invoicePaymentState(1_500_000, 500_000, new Date('2026-09-05'), new Date('2026-09-01'))).toMatchObject({ paid: 500_000, balance: 1_000_000, status: 'partial' }));
  it('marks a settled invoice paid', () => expect(invoicePaymentState(1_500_000, 1_500_000, new Date('2026-09-05'))).toMatchObject({ balance: 0, status: 'paid' }));
  it('marks an unpaid past-due invoice overdue', () => expect(invoicePaymentState(1_500_000, 0, new Date('2026-08-05'), new Date('2026-08-06'))).toMatchObject({ status: 'overdue' }));
});

describe('checkout settlement', () => {
  it('calculates a deposit refund', () => expect(calculateCheckout(2_000_000, 500_000, 200_000, 100_000)).toEqual({ totalDeductions: 800_000, refund: 1_200_000, additionalAmountDue: 0 }));
  it('calculates an additional amount due', () => expect(calculateCheckout(500_000, 600_000, 200_000, 0)).toEqual({ totalDeductions: 800_000, refund: 0, additionalAmountDue: 300_000 }));
});
