import { DailyRecordService } from '../application/DailyRecordService';
import { SQLiteDailyRecordRepository } from './SQLiteDailyRecordRepository';
import { InvestmentBalanceService } from '../investment/application/InvestmentBalanceService';
import { SQLiteInvestmentAdjustmentRepository } from '../investment/infrastructure/SQLiteInvestmentAdjustmentRepository';
import { BackupService, createBackupService } from '../../../core/storage/backup';

const repository = new SQLiteDailyRecordRepository();
const adjustmentRepository = new SQLiteInvestmentAdjustmentRepository();

export const dailyRecordService = new DailyRecordService(repository);
export const investmentBalanceService = new InvestmentBalanceService(
  adjustmentRepository,
  repository
);
export const backupService: BackupService = createBackupService();
