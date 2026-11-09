export interface MonthlyCalendarDayCellBorder {
  borderWidth: number;
  borderColor: string;
  backgroundColor?: string;
}

export function resolveMonthlyDayCellBorder(
  isSelected: boolean,
  isToday: boolean,
  selectedBorderColor: string,
  selectedBackgroundColor: string,
  todayBorderColor: string,
): MonthlyCalendarDayCellBorder | null {
  if (isSelected) {
    return {
      borderWidth: 2,
      borderColor: selectedBorderColor,
      backgroundColor: selectedBackgroundColor,
    };
  }

  if (!isToday) {
    return null;
  }

  return {
    borderWidth: 1,
    borderColor: todayBorderColor,
  };
}
