import React, { useRef, useEffect, useState } from "react";

type Props = {
  weeks: { 
    startDate: Date; 
    endDate: Date; 
    daysInMonth: number;
    weekNumber: number;
    days: Date[]; // дни, которые попадают в текущий месяц
    allDays: Date[]; // все дни недели (включая дни из других месяцев)
  }[];
  onRangeChange: (startDate: Date, endDate: Date) => void;
  start: Date;
  end: Date;
  selectedMonth: Date | null;
};

export default function WeekMarkers({
  weeks,
  onRangeChange,
  start,
  end,
  selectedMonth,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartRef = useRef<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
      dragStartRef.current = null;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!selectedMonth || weeks.length === 0) return null;

  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  
  // Каждая неделя занимает равную долю
  const weekWidth = 100 / weeks.length;

  // Получаем дату из позиции
  const getDateFromPosition = (clientX: number): Date => {
    if (!trackRef.current) return monthStart;
    
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    // Определяем, на какую неделю попали
    const weekIndex = Math.floor(percent * weeks.length);
    const week = weeks[Math.min(weekIndex, weeks.length - 1)];
    
    // В пределах недели определяем день (используем allDays)
    const weekPercent = (percent * weeks.length) - weekIndex;
    const dayIndex = Math.floor(weekPercent * 7); // В неделе всегда 7 дней
    return week.allDays[Math.min(dayIndex, 6)];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    
    const clickedDate = getDateFromPosition(e.clientX);
    
    isDragging.current = true;
    dragStartRef.current = clickedDate;
    
    onRangeChange(clickedDate, clickedDate);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    
    const currentDate = getDateFromPosition(e.clientX);
    setHoveredDate(currentDate);
    
    if (isDragging.current && dragStartRef.current) {
      const startDate = dragStartRef.current < currentDate ? dragStartRef.current : currentDate;
      const endDate = dragStartRef.current < currentDate ? currentDate : dragStartRef.current;
      
      onRangeChange(startDate, endDate);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    dragStartRef.current = null;
  };

  const handleMouseLeave = () => {
    setHoveredDate(null);
    if (!isDragging.current) {
      dragStartRef.current = null;
    }
  };

  return (
    <div
      ref={trackRef}
      className="absolute inset-0 select-none"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Фон для всего трека */}
      <div className="absolute inset-0 bg-stone-200/50 dark:bg-stone-700/50" />
      
      {/* Блоки недель - каждая равной ширины */}
      {weeks.map((week, weekIndex) => {
        const leftPosition = weekIndex * weekWidth;
        
        return (
          <div
            key={`week-${weekIndex}`}
            className="absolute top-0 h-full"
            style={{
              left: `${leftPosition}%`,
              width: `${weekWidth}%`,
              zIndex: 3,
            }}
          >
            {/* Левая граница недели */}
            {weekIndex > 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-stone-400 dark:bg-stone-600 z-20" />
            )}
            
            {/* Все 7 дней недели */}
            {week.allDays.map((day, dayIndex) => {
              const isDaySelected = day >= start && day <= end;
              const isDayHovered = hoveredDate?.toDateString() === day.toDateString();
              const isInSelectedMonth = day.getMonth() === selectedMonth.getMonth() && 
                                        day.getFullYear() === selectedMonth.getFullYear();
              
              // Каждый день занимает 1/7 ширины недели
              const dayWidth = 100 / 7;
              const dayLeft = (dayIndex / 7) * 100;
              
              return (
                <div
                  key={`day-${weekIndex}-${dayIndex}`}
                  className="absolute top-0 h-full z-10"
                  style={{
                    left: `${dayLeft}%`,
                    width: `${dayWidth}%`,
                    zIndex: 3,
                  }}
                >
                  {/* Выделение выбранного дня */}
                  {isDaySelected && (
                    <div className="absolute inset-0 bg-stone-500/40 dark:bg-stone-400/40" />
                  )}
                  
                  {/* Подсветка при наведении */}
                  {isDayHovered && !isDaySelected && (
                    <div className="absolute inset-0 bg-stone-400/30 dark:bg-stone-500/30" />
                  )}
                  
                  {/* Затемнение для дней не из текущего месяца */}
                  {!isInSelectedMonth && (
                    <div className="absolute inset-0 bg-stone-400/10 dark:bg-stone-500/10" />
                  )}
                  
                  {/* Разделитель между днями */}
                  {dayIndex < 6 && (
                    <div className="absolute right-0 top-0 bottom-0 w-px bg-stone-400/30 dark:bg-stone-500/30" />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Подпись с датой при наведении */}
      {hoveredDate && (
        <div 
          className="absolute -top-6 bg-stone-800 text-white text-xs rounded px-2 py-1 pointer-events-none z-20 whitespace-nowrap"
          style={{
            left: `${((hoveredDate.getTime() - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime())) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {hoveredDate.getDate()} {hoveredDate.toLocaleDateString('ru-RU', { month: 'short' })}
          {hoveredDate.getFullYear() !== selectedMonth.getFullYear() && 
            ` ${hoveredDate.getFullYear()}`}
        </div>
      )}
    </div>
  );
}
