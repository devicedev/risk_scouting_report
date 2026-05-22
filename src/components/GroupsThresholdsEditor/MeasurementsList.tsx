import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MeasurementsListProps } from './types';

const MeasurementsList: React.FC<MeasurementsListProps> = ({
  indicators,
  templateGroupId,
  cropGroupId,
  measurements,
  templateGroupCropGroupMeasurements,
  templateGroupCropGroups,
  onSelect,
  onDelete, // Добавляем проп для удаления
}) => {
  console.log('MeasurementsList received props:', { 
    indicators, 
    templateGroupId, 
    cropGroupId, 
    measurements,
    templateGroupCropGroupMeasurements 
  });

  const templateGroupIdNum = Number(templateGroupId);
  const cropGroupIdNum = Number(cropGroupId);

  // Получаем ID связки групп
  const getTemplateGroupCropGroupId = (): number | null => {
    const found = templateGroupCropGroups.find(
      tgcg => tgcg.template_group_id === templateGroupIdNum && 
              tgcg.crop_group_id === cropGroupIdNum
    );
    return found?.id || null;
  };

  const tgcgId = getTemplateGroupCropGroupId();
  console.log('TemplateGroupCropGroupId:', tgcgId);

  // Получаем ID измерений, которые добавлены в БД для этой связки
  const existingMeasurementIdsFromDB = new Set(
    tgcgId 
      ? templateGroupCropGroupMeasurements
          .filter(m => m.template_group_crop_group_id === tgcgId)
          .map(m => m.scout_report_measurement_type_id.toString())
      : []
  );
  console.log('Existing measurement IDs from DB:', Array.from(existingMeasurementIdsFromDB));

  // Получаем данные для текущей группы шаблонов и группы культур
  const templateGroupData = indicators[templateGroupId] || indicators[templateGroupIdNum] || {};
  console.log('TemplateGroupData:', templateGroupData);
  
  const cropGroupData = templateGroupData[cropGroupId] || templateGroupData[cropGroupIdNum] || {};
  console.log('CropGroupData:', cropGroupData);

  // Фильтруем измерения, оставляем только те, которые есть в БД
  const measurementsWithRelations = measurements.filter(measurement => {
    const measurementId = measurement.scout_report_measurement_type_id.toString();
    const exists = existingMeasurementIdsFromDB.has(measurementId);
    console.log(`Measurement ${measurement.human_name} (${measurementId}) exists in DB:`, exists);
    return exists;
  });
  console.log('Measurements with relations:', measurementsWithRelations);

  const getZonesForMeasurement = (measurementId: string): any[] => {
    const zones = cropGroupData[measurementId] || [];
    console.log(`Zones for measurement ${measurementId}:`, zones);
    return zones;
  };

  // Обработчик удаления измерения
  const handleDeleteMeasurement = async (e: React.MouseEvent, measurementId: number) => {
    e.stopPropagation(); // Предотвращаем клик по карточке
    
    // Находим ID записи в templateGroupCropGroupMeasurements
    const measurementLink = templateGroupCropGroupMeasurements.find(
      m => m.template_group_crop_group_id === tgcgId && 
           m.scout_report_measurement_type_id === measurementId
    );
    
    if (!measurementLink?.id) {
      console.error('Measurement link not found');
      return;
    }
    
    if (!window.confirm('Вы уверены, что хотите удалить это измерение? Все пороговые значения для него также будут удалены.')) {
      return;
    }
    
    try {
      await onDelete?.(measurementLink.id);
    } catch (error) {
      console.error('Failed to delete measurement:', error);
    }
  };

  // Вычисляем максимальное значение для адаптивной шкалы
  const getMaxThreshold = (zones: any[]) => {
    if (!zones || zones.length === 0) return 100;
    const maxValue = Math.max(...zones.map((z: any) => z.threshold_value));
    const buffer = Math.ceil(maxValue * 0.2);
    const suggestedMax = maxValue + buffer;
    
    if (suggestedMax <= 10) return 10;
    if (suggestedMax <= 20) return 20;
    if (suggestedMax <= 30) return 30;
    if (suggestedMax <= 40) return 40;
    if (suggestedMax <= 50) return 50;
    if (suggestedMax <= 60) return 60;
    if (suggestedMax <= 70) return 70;
    if (suggestedMax <= 80) return 80;
    if (suggestedMax <= 90) return 90;
    return Math.ceil(suggestedMax / 10) * 10;
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'red': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'orange': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'green': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getZoneBackground = (zone: string) => {
    switch (zone) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getZoneText = (zone: string) => {
    switch (zone) {
      case 'red': return 'Красная';
      case 'orange': return 'Оранжевая';
      case 'green': return 'Зеленая';
      default: return zone;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {measurementsWithRelations.map((measurement) => {
            const measurementId = measurement.scout_report_measurement_type_id.toString();
            const zones = getZonesForMeasurement(measurementId);
            
            const sortedZones = [...zones].sort((a, b) => a.threshold_value - b.threshold_value);
            const maxThreshold = getMaxThreshold(sortedZones);
            
            return (
              <Card
                key={measurementId}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-primary group relative"
                onClick={() => onSelect(measurementId)}
              >
                <CardContent className="p-4">
                  {/* Кнопка удаления */}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => handleDeleteMeasurement(e, measurement.scout_report_measurement_type_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 pr-8">
                        {measurement.human_name}
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Зон: {sortedZones.length}</span>
                          {sortedZones.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground cursor-help">
                                  ⚡
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Адаптивная шкала: 0 - {maxThreshold}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        
                        {sortedZones.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex h-6 rounded-lg overflow-hidden shadow-inner">
                              {sortedZones.map((zone, idx) => {
                                const currentValue = zone.threshold_value;
                                const nextValue = idx < sortedZones.length - 1 
                                  ? sortedZones[idx + 1].threshold_value 
                                  : maxThreshold;
                                
                                const width = ((nextValue - currentValue) / maxThreshold) * 100;
                                
                                return (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`h-full flex items-center justify-center text-xs font-medium text-white
                                          ${getZoneBackground(zone.zone)} cursor-help transition-all hover:brightness-110
                                        `}
                                        style={{ width: `${Math.max(width, 2)}%` }}
                                      >
                                        {width > 8 && (
                                          <span className="truncate px-1">
                                            {zone.threshold_value}
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-medium">{getZoneText(zone.zone)} зона</p>
                                      <p className="text-xs">
                                        {idx !== sortedZones.length - 1 
                                          ? `от ${currentValue} до ${nextValue}`
                                          : `от ${currentValue} и выше`}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sortedZones.map((zone, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getZoneColor(zone.zone)}`}
                                >
                                  {zone.zone === 'red' ? '🔴' : zone.zone === 'orange' ? '🟠' : '🟢'} {zone.threshold_value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {sortedZones.length === 0 && (
                          <div className="text-sm text-muted-foreground italic">
                            Нет настроенных зон
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {measurementsWithRelations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-stone-50 dark:bg-stone-800/50">
            <p className="text-lg mb-2">📊 Нет измерений для этой пары групп</p>
            <p className="text-sm">Добавьте измерение через кнопку "Добавить измерение"</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default MeasurementsList;