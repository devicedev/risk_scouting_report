import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import type { CropGroupsListProps } from './types';

const CropGroupsList: React.FC<CropGroupsListProps> = ({
  indicators,
  templateGroupId,
  cropGroupNames,
  cropGroups,
  crops,
  measurements,
  templateGroupCropGroups,
  templateGroupCropGroupMeasurements,
  onSelect,
  onDelete,
}) => {
  const templateGroupIdNum = Number(templateGroupId);
  const templateGroupIdStr = templateGroupId;

  // Получаем данные для текущей группы шаблонов
  const templateGroupData = indicators[templateGroupIdStr] || indicators[templateGroupIdNum] || {};

  // Получаем ID групп культур из БД
  const existingCropGroupIdsFromDB = new Set(
    templateGroupCropGroups
      .filter(tgcg => tgcg.template_group_id === templateGroupIdNum)
      .map(tgcg => tgcg.crop_group_id.toString())
  );

  // Фильтруем группы культур
  const cropGroupsWithRelations = cropGroupNames.filter(group => 
    existingCropGroupIdsFromDB.has(group.id.toString())
  );

  // Получаем ID связки групп
  const getTemplateGroupCropGroupId = (cropGroupId: number): number | null => {
    const found = templateGroupCropGroups.find(
      tgcg => tgcg.template_group_id === templateGroupIdNum && tgcg.crop_group_id === cropGroupId
    );
    return found?.id || null;
  };

  // Получаем измерения для связки
  const getMeasurementsForGroupPair = (cropGroupId: number): number[] => {
    const tgcgId = getTemplateGroupCropGroupId(cropGroupId);
    if (!tgcgId) return [];
    
    return templateGroupCropGroupMeasurements
      .filter(m => m.template_group_crop_group_id === tgcgId)
      .map(m => m.scout_report_measurement_type_id);
  };

  // Получаем зоны для измерения
  const getZonesForMeasurement = (cropGroupId: number, measurementId: number): any[] => {
    const cropGroupIdStr = cropGroupId.toString();
    const measurementIdStr = measurementId.toString();
    
    // Пробуем все комбинации ключей
    const zones = templateGroupData[cropGroupIdStr]?.[measurementIdStr] ||
                  templateGroupData[cropGroupIdStr]?.[measurementId] ||
                  templateGroupData[cropGroupId]?.[measurementIdStr] ||
                  templateGroupData[cropGroupId]?.[measurementId];
    
    if (zones && Array.isArray(zones)) {
      return [...zones].sort((a, b) => a.threshold_value - b.threshold_value);
    }
    
    return [];
  };

  const getMeasurementName = (measurementId: number): string => {
    const measurement = measurements?.find(m => m.scout_report_measurement_type_id === measurementId);
    return measurement?.human_name || `Измерение ${measurementId}`;
  };

  const getCropsInGroup = (groupId: number) => {
    return cropGroups
      .filter(cg => cg.crop_group_id === groupId)
      .map(cg => {
        const crop = crops.find(c => c.crop_id === cg.crop_id);
        return {
          id: cg.crop_id,
          name: crop?.crop_name || 'Неизвестная культура'
        };
      });
  };

  const handleDeleteCropGroup = async (e: React.MouseEvent, cropGroupId: number) => {
    e.stopPropagation();
    
    const measurementIds = getMeasurementsForGroupPair(cropGroupId);
    let message = 'Вы уверены, что хотите удалить эту группу культур?';
    
    if (measurementIds.length > 0) {
      message = `Группа содержит ${measurementIds.length} измерений с пороговыми значениями. Все данные будут удалены. Продолжить?`;
    }
    
    if (!window.confirm(message)) {
      return;
    }
    
    try {
      await onDelete?.(Number(templateGroupId), cropGroupId);
    } catch (error) {
      console.error('Failed to delete crop group:', error);
    }
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getZoneBadgeColor = (zone: string) => {
    switch (zone) {
      case 'red': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'orange': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'green': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMaxThreshold = (zones: any[]) => {
    if (!zones || zones.length === 0) return 100;
    const maxValue = Math.max(...zones.map(z => z.threshold_value));
    return Math.ceil((maxValue + maxValue * 0.2) / 10) * 10;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cropGroupsWithRelations.map((group) => {
            const groupId = group.id;
            const measurementIds = getMeasurementsForGroupPair(groupId);
            const cropsInGroup = getCropsInGroup(groupId);
            
            return (
              <Card
                key={groupId}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-primary/20 group relative"
                onClick={() => onSelect(groupId.toString())}
              >
                <CardContent className="p-5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteCropGroup(e, groupId)}
                    disabled={!onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <h3 className="font-semibold text-lg mb-3 text-stone-800 dark:text-stone-200 pr-8">
                    {group.crop_group_name}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        <span className="font-medium">Культуры в группе:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {cropsInGroup.map((crop) => (
                          <span
                            key={crop.id}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          >
                            {crop.name}
                          </span>
                        ))}
                        {cropsInGroup.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            Нет культур в группе
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg">
                      <span className="text-muted-foreground">📊 Измерений:</span>
                      <span className="font-semibold text-stone-700 dark:text-stone-300">{measurementIds.length}</span>
                    </div>
                    
                    {measurementIds.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Настроенные измерения
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                          {measurementIds.map((measurementId) => {
                            const zones = getZonesForMeasurement(groupId, measurementId);
                            const sortedZones = [...zones].sort((a, b) => a.threshold_value - b.threshold_value);
                            const maxThreshold = getMaxThreshold(sortedZones);
                            
                            return (
                              <Tooltip key={measurementId}>
                                <TooltipTrigger asChild>
                                  <div className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-help">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-stone-700 dark:text-stone-300 truncate max-w-[120px]">
                                        {getMeasurementName(measurementId)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {sortedZones.length} зон
                                      </span>
                                    </div>
                                    
                                    {sortedZones.length > 0 && (
                                      <>
                                        <div className="flex h-2 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700">
                                          {sortedZones.map((zone, idx, arr) => {
                                            const currentValue = zone.threshold_value;
                                            const nextValue = idx < arr.length - 1 ? arr[idx + 1].threshold_value : maxThreshold;
                                            const width = ((nextValue - currentValue) / maxThreshold) * 100;
                                            
                                            return (
                                              <div
                                                key={idx}
                                                className={`h-full ${getZoneColor(zone.zone)} transition-all hover:brightness-110`}
                                                style={{ width: `${Math.max(width, 2)}%` }}
                                              />
                                            );
                                          })}
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {sortedZones.map((zone, idx) => (
                                            <span
                                              key={idx}
                                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getZoneBadgeColor(zone.zone)}`}
                                            >
                                              {zone.threshold_value}
                                            </span>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="font-medium">{getMeasurementName(measurementId)}</p>
                                  <p className="text-xs text-muted-foreground">{sortedZones.length} зон</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {cropGroupsWithRelations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-stone-50 dark:bg-stone-800/50">
            <p className="text-lg mb-2">📁 Нет групп культур, связанных с этой группой шаблонов</p>
            <p className="text-sm">Добавьте группу культур через кнопку "Добавить группу культур"</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CropGroupsList;