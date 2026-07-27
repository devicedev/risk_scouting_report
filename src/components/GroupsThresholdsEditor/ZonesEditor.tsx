import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, Loader2, CheckCircle2, Info, ZoomIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ZonesEditorProps, ThresholdValue } from './types';
import type { ThresholdValueWithId } from '@/api/scoutingReportApi';

const normalizeZones = (zones: ThresholdValue[]): ThresholdValueWithId[] => {
  const sortedZones = [...zones].sort((a, b) => a.threshold_value - b.threshold_value);
  if (sortedZones.length === 0) {
    return [{ threshold_value: 0, zone: 'green' }];
  }
  if (!sortedZones.some(zone => zone.threshold_value === 0)) {
    return [{ threshold_value: 0, zone: 'green' }, ...sortedZones];
  }
  return sortedZones;
};

const getValidationErrors = (zones: ThresholdValue[]): Map<number, string> => {
  const errors = new Map<number, string>();
  const valueMap = new Map<number, number[]>();

  zones.forEach((zone, index) => {
    const existing = valueMap.get(zone.threshold_value) || [];
    valueMap.set(zone.threshold_value, [...existing, index]);
  });

  valueMap.forEach((indices, value) => {
    if (indices.length > 1) {
      indices.forEach(index => {
        errors.set(index, `Значение ${value} уже используется`);
      });
    }
  });

  zones.forEach((zone, index) => {
    if (index === 0 && zone.threshold_value !== 0) {
      errors.set(index, 'Первая зона всегда должна быть 0');
    } else if (index > 0 && zone.threshold_value < 0) {
      errors.set(index, 'Значение не может быть отрицательным');
    }
  });

  return errors;
};

const ZonesEditor: React.FC<ZonesEditorProps> = ({
  zones,
  measurementName,
  onChange,
  onAutoSave,
  disabled = false,
  isSaving = false
}) => {
  const localZones = useMemo(() => normalizeZones(zones || []), [zones]);
  const [validationErrors, setValidationErrors] = useState<Map<number, string>>(
    () => getValidationErrors(localZones)
  );
  const [lastSavedZones, setLastSavedZones] = useState<ThresholdValue[]>(
    normalizeZones(zones || [])
  );
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  const [inputValues, setInputValues] = useState<{ [key: number]: string }>({});
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);
  const [originalValueAtFocus, setOriginalValueAtFocus] = useState<{ [key: number]: number }>({});

  const maxThreshold = useMemo(() => {
    if (localZones.length === 0) return 100;
    const maxValue = Math.max(...localZones.map(z => z.threshold_value));
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
  }, [localZones]);

  useEffect(() => {
    if (showSaveSuccess) {
      const timer = setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSaveSuccess]);

  const saveIfNeeded = (newZones: ThresholdValueWithId[]) => {
    const isValid = getValidationErrors(newZones).size === 0;
    const hasChanges = JSON.stringify(newZones) !== JSON.stringify(lastSavedZones);
    
    if (isValid && hasChanges && onAutoSave && !disabled && !isSaving) {
      onAutoSave(newZones);
      setLastSavedZones(newZones);
      setShowSaveSuccess(true);
    }
  };

  const handleAddZone = () => {
    if (disabled) return;
    
    const maxValue = localZones.length > 0 
      ? Math.max(...localZones.map(z => z.threshold_value))
      : 0;
    
    const nextValue = maxValue + 1;
    
    const newZone: ThresholdValue = { 
      threshold_value: nextValue, 
      zone: 'green' as const
    };
    const newZones = [...localZones, newZone].sort((a, b) => a.threshold_value - b.threshold_value);
    
    onChange(newZones);
    saveIfNeeded(newZones);
  };

  const applyValue = (index: number) => {
    if (disabled || index === 0) return;
    
    const rawValue = inputValues[index];
    if (rawValue === undefined) return;
    
    const numValue = parseFloat(rawValue);
    if (isNaN(numValue) || rawValue === '') return;
    
    const isDuplicate = localZones.some((zone, i) => i !== index && zone.threshold_value === numValue);
    
    if (isDuplicate) {
      const newErrors = new Map(validationErrors);
      newErrors.set(index, `Значение ${numValue} уже используется`);
      setValidationErrors(newErrors);
      
      setInputValues(prev => ({
        ...prev,
        [index]: localZones[index].threshold_value.toString()
      }));
      return;
    }
    
    if (validationErrors.has(index)) {
      const newErrors = new Map(validationErrors);
      newErrors.delete(index);
      setValidationErrors(newErrors);
    }
    
    if (numValue >= 0) {
      const updatedZones = [...localZones];
      updatedZones[index] = { ...updatedZones[index], threshold_value: numValue };
      const sortedZones = [...updatedZones].sort((a, b) => a.threshold_value - b.threshold_value);
      
      onChange(sortedZones);
      saveIfNeeded(sortedZones);
      
      setInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[index];
        return newValues;
      });
      
      setOriginalValueAtFocus(prev => {
        const newValues = { ...prev };
        delete newValues[index];
        return newValues;
      });
    }
  };

  const handleInputChange = (index: number, value: string) => {
    setInputValues(prev => ({ ...prev, [index]: value }));
    
    if (value === '') {
      if (validationErrors.has(index)) {
        const newErrors = new Map(validationErrors);
        newErrors.delete(index);
        setValidationErrors(newErrors);
      }
    }
  };

  const handleFocus = (index: number) => {
    setActiveInputIndex(index);
    setOriginalValueAtFocus(prev => ({
      ...prev,
      [index]: localZones[index].threshold_value
    }));
  };

  const handleBlur = (index: number) => {
    setActiveInputIndex(null);
    applyValue(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      
      const originalValue = originalValueAtFocus[index];
      if (originalValue !== undefined) {
        setInputValues(prev => ({
          ...prev,
          [index]: originalValue.toString()
        }));
      } else {
        setInputValues(prev => ({
          ...prev,
          [index]: localZones[index].threshold_value.toString()
        }));
      }
      
      if (validationErrors.has(index)) {
        const newErrors = new Map(validationErrors);
        newErrors.delete(index);
        setValidationErrors(newErrors);
      }
    }
  };

  const getInputValue = (index: number) => {
    return inputValues[index] !== undefined ? inputValues[index] : localZones[index].threshold_value.toString();
  };

  const handleUpdateZone = (index: number, field: keyof ThresholdValueWithId, value: string | number) => {
    if (disabled) return;
    
    const updatedZones = [...localZones];
    const currentZone = updatedZones[index];
    
    updatedZones[index] = {
      ...currentZone,
      [field]: value,
      id: currentZone.id
    };
    
    onChange(updatedZones);
    saveIfNeeded(updatedZones);
  };

  const handleDeleteZone = (index: number) => {
    if (disabled) return;
    
    if (index === 0) {
      return;
    }
    
    const updatedZones = localZones.filter((_, i) => i !== index);
    onChange(updatedZones);
    saveIfNeeded(updatedZones);
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'red': return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'orange': return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
      case 'green': return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      default: return '';
    }
  };

  const getZoneBackground = (zone: string) => {
    switch (zone) {
      case 'red': return 'bg-red-500 dark:bg-red-600';
      case 'orange': return 'bg-orange-500 dark:bg-orange-600';
      case 'green': return 'bg-green-500 dark:bg-green-600';
      default: return 'bg-gray-500 dark:bg-gray-600';
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

  const hasErrors = validationErrors.size > 0;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              Настройка зон для {measurementName}
            </h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Первая зона всегда имеет значение 0</p>
                <p className="text-xs mt-1">Enter - подтвердить, Escape - отмена</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 min-w-[140px] justify-end">
              {isSaving && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Сохранение...</span>
                </div>
              )}
              {!isSaving && showSaveSuccess && !hasErrors && (
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Сохранено</span>
                </div>
              )}
              {hasErrors && (
                <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Ошибки валидации
                </span>
              )}
            </div>
            <Button 
              onClick={handleAddZone} 
              size="sm"
              disabled={disabled || hasErrors}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить зону
            </Button>
          </div>
        </div>

        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Исправьте ошибки перед добавлением новых зон. Пороговые значения должны быть уникальными, первая зона всегда 0.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {localZones.map((zone, index) => {
            const hasError = validationErrors.has(index);
            const isFirstZone = index === 0;
            const isActive = activeInputIndex === index;
            
            return (
              <Card 
                key={index} 
                className={`border-2 transition-all ${
                  hasError 
                    ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/30' 
                    : getZoneColor(zone.zone)
                } ${disabled ? 'opacity-75' : ''} ${isFirstZone ? 'border-dashed border-stone-400 dark:border-stone-600' : ''} ${isActive ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium flex items-center gap-1">
                          Пороговое значение
                          {isFirstZone && (
                            <span className="text-xs text-muted-foreground">(фиксировано)</span>
                          )}
                          {hasError && (
                            <span className="text-xs text-red-500">
                              {validationErrors.get(index)}
                            </span>
                          )}
                        </label>
                        {isFirstZone ? (
                          <div className="mt-1 p-2 bg-stone-100 dark:bg-stone-800 rounded-md text-stone-600 dark:text-stone-400 font-mono">
                            {zone.threshold_value}
                          </div>
                        ) : (
                          <Input
                            type="number"
                            value={getInputValue(index)}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            onFocus={() => handleFocus(index)}
                            onBlur={() => handleBlur(index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={`mt-1 ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            disabled={disabled}
                            min={0}
                            step="any"
                          />
                        )}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Зона</label>
                        <Select
                          value={zone.zone}
                          onValueChange={(value: 'green' | 'orange' | 'red') => 
                            handleUpdateZone(index, 'zone', value)
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger className={`mt-1 ${hasError ? 'border-red-500' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="green">Зеленая</SelectItem>
                            <SelectItem value="orange">Оранжевая</SelectItem>
                            <SelectItem value="red">Красная</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${isFirstZone ? 'opacity-0 pointer-events-none' : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950'}`}
                      onClick={() => handleDeleteZone(index)}
                      disabled={disabled || isFirstZone}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {localZones.length > 0 && !hasErrors && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-stone-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Предпросмотр зон:</h4>
              <Tooltip>
                <TooltipTrigger>
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Адаптивная шкала: 0 - {maxThreshold}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="relative">
              <div className="flex h-10 rounded-lg overflow-hidden shadow-inner dark:shadow-none">
                {localZones.map((zone, index) => {
                  const currentValue = zone.threshold_value;
                  const nextValue = index < localZones.length - 1 
                    ? localZones[index + 1].threshold_value 
                    : maxThreshold;
                  
                  const startValue = currentValue;
                  const endValue = nextValue;
                  const width = ((endValue - startValue) / maxThreshold) * 100;
                  
                  return (
                    <Tooltip key={index}>
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
                          {index !== localZones.length - 1 
                            ? `от ${startValue} до ${endValue}`
                            : `от ${startValue} и выше`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-medium">Всего зон:</span>
                <span>{localZones.length}</span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-3 pt-3 border-t border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-600"></div>
                <span className="text-xs">Зеленая</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500 dark:bg-orange-600"></div>
                <span className="text-xs">Оранжевая</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-600"></div>
                <span className="text-xs">Красная</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ZonesEditor;
