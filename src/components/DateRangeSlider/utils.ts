export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getMonthName(date: Date): string {
  return date.toLocaleDateString("ru-RU", { month: "long" });
}

export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / MS_PER_DAY;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getWeeksInMonth(date: Date): {
  startDate: Date;
  endDate: Date;
  daysInMonth: number;
  weekNumber: number;
  days: Date[]; // дни в текущем месяце
  allDays: Date[]; // все 7 дней недели
}[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const daysInMonth = monthEnd.getDate();
  
  const weeks: {
    startDate: Date;
    endDate: Date;
    daysInMonth: number;
    weekNumber: number;
    days: Date[];
    allDays: Date[];
  }[] = [];
  
  // Находим первый понедельник перед началом месяца или первый день месяца
  const currentDate = new Date(monthStart);
  const firstDayOfWeek = currentDate.getDay();
  
  // Корректируем до понедельника (день недели 1 = понедельник)
  if (firstDayOfWeek === 0) { // Воскресенье
    currentDate.setDate(currentDate.getDate() - 6);
  } else if (firstDayOfWeek > 1) { // Вторник-суббота
    currentDate.setDate(currentDate.getDate() - (firstDayOfWeek - 1));
  }
  
  while (currentDate <= monthEnd) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Собираем все 7 дней недели
    const allDaysInWeek: Date[] = [];
    const daysInWeek: Date[] = [];
    const dayIterator = new Date(weekStart);
    
    for (let i = 0; i < 7; i++) {
      allDaysInWeek.push(new Date(dayIterator));
      
      if (dayIterator.getMonth() === month && dayIterator.getFullYear() === year) {
        daysInWeek.push(new Date(dayIterator));
      }
      
      dayIterator.setDate(dayIterator.getDate() + 1);
    }
    
    // Добавляем неделю если она пересекается с текущим месяцем
    if (daysInWeek.length > 0) {
      weeks.push({
        startDate: new Date(weekStart),
        endDate: new Date(weekEnd),
        daysInMonth,
        weekNumber: getWeekNumber(weekStart),
        days: daysInWeek,
        allDays: allDaysInWeek,
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return weeks;
}
