import { ValidationError } from './errors';
import { DailyRecord } from './types';

type DailyRecordInput = Omit<DailyRecord, 'notes'> & { notes?: string };

function assertNonNegative(value: number, label: string): void {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new ValidationError(`${label} must be a valid number`);
  }

  if (value < 0) {
    throw new ValidationError(`${label} cannot be negative`);
  }
}

function assertProfitPercent(value: number): void {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new ValidationError('profitPercent must be a valid number');
  }

  if (value < 0 || value > 1) {
    throw new ValidationError('profitPercent must be between 0 and 1');
  }
}

function assertDateFormat(value: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw new ValidationError('date must use YYYY-MM-DD format');
  }
}

export function validateAndNormalizeDailyRecord(input: DailyRecordInput): DailyRecord {
  assertDateFormat(input.date);
  assertNonNegative(input.totalSold, 'totalSold');
  assertNonNegative(input.additionalExpenses, 'additionalExpenses');
  assertProfitPercent(input.profitPercent);

  const notes = (input.notes ?? '').trim();
  if (notes.length > 300) {
    throw new ValidationError('notes cannot be longer than 300 characters');
  }

  const normalized: DailyRecord = {
    date: input.date,
    totalSold: round2(input.totalSold),
    additionalExpenses: round2(input.additionalExpenses),
    profitPercent: round4(input.profitPercent),
    notes,
  };

  if (input.dataphoneSales !== undefined) {
    assertNonNegative(input.dataphoneSales, 'dataphoneSales');
    normalized.dataphoneSales = round2(input.dataphoneSales);
  }

  return normalized;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
