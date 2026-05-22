import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, AlertCircle, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  existingItemIds: Set<string>;
  onAddItem: (item: any) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  noItemsMessage: string;
  noResultsMessage: string;
  getId: (item: any) => number;
  getName: (item: any) => string;
  
  // Валидация для групп культур (при добавлении группы в шаблон)
  validateCropGroup?: (item: any) => {
    isValid: boolean;
    conflictCrops?: Array<{ id: number; name: string; groupName: string }>;
    errorMessage?: string;
  };
  
  // Валидация для культур (при добавлении культуры в группу культур)
  validateCrop?: (item: any) => {
    isValid: boolean;
    conflictMessage?: string;
    existingGroups?: Array<{ id: number; name: string }>;
    conflictingGroups?: Array<{ id: number; name: string; templateGroupName: string }>;
  };
  
  // Данные о культурах и их группах
  allCropGroups?: any[];
  allCrops?: any[];
  existingCropGroupIds?: number[];
  getCropsInGroup?: (groupId: number) => Array<{ id: number; name: string }>;
  
  // Валидация для шаблонов
  validateTemplate?: (item: any) => {
    status: 'available' | 'in_current_group' | 'in_other_group';
    message?: string;
    groupName?: string;
  };
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  open,
  onOpenChange,
  items,
  existingItemIds,
  onAddItem,
  title,
  description,
  searchPlaceholder,
  noItemsMessage,
  noResultsMessage,
  getId,
  getName,
  validateCropGroup,
  validateCrop,
  getCropsInGroup,
  validateTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);

  const filteredItems = items.filter(item => {
    const itemId = getId(item).toString();
    const isNotExisting = !existingItemIds.has(itemId);
    const matchesSearch = getName(item)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return isNotExisting && matchesSearch;
  });

  // Получаем конфликтующие культуры для группы культур
  const getCropGroupConflicts = (item: any) => {
    if (!validateCropGroup) return null;
    return validateCropGroup(item);
  };

  // Получаем информацию о конфликте для культуры
  const getCropValidation = (item: any) => {
    if (!validateCrop) return null;
    return validateCrop(item);
  };

  // Получаем статус шаблона
  const getTemplateStatus = (item: any) => {
    if (!validateTemplate) return null;
    return validateTemplate(item);
  };

  const handleAddItem = (item: any) => {
    const cropValidation = getCropValidation(item);
    
    // Проверяем валидацию для культуры
    if (cropValidation && !cropValidation.isValid) {
      setValidationError(cropValidation.conflictMessage || 'Эта культура не может быть добавлена из-за конфликтов');
      return;
    }
    
    setSelectedItem(null);
    setValidationError(null);
    onAddItem(item);
    setShowConflicts(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery('');
    setSelectedItem(null);
    setValidationError(null);
  };

  const handleSelectItem = (item: any) => {
    if (selectedItem === item) {
      setSelectedItem(null);
      setShowConflicts(false);
    } else {
      setSelectedItem(item);
      setShowConflicts(true);
    }
  };

  // Определяем, можно ли добавить элемент
  const canAddItem = (item: any): boolean => {
    const cropGroupConflicts = getCropGroupConflicts(item);
    const cropValidation = getCropValidation(item);
    const templateStatus = getTemplateStatus(item);
    
    // Для групп культур
    if (cropGroupConflicts) {
      return cropGroupConflicts.isValid;
    }
    
    // Для культур
    if (cropValidation) {
      return cropValidation.isValid;
    }
    
    // Для шаблонов
    if (templateStatus) {
      return templateStatus.status === 'available';
    }
    
    return true;
  };

  // Получаем сообщение о статусе для шаблонов
  const getTemplateStatusMessage = (item: any) => {
    const templateStatus = getTemplateStatus(item);
    if (templateStatus && templateStatus.status !== 'available') {
      return {
        message: templateStatus.message || (templateStatus.status === 'in_current_group' ? 'Уже в этой группе' : `Уже в группе "${templateStatus.groupName}"`),
        className: templateStatus.status === 'in_current_group' 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-amber-600 dark:text-amber-400'
      };
    }
    return null;
  };

  // Получаем стили для элемента
  const getItemStyles = (item: any, isSelected: boolean) => {
    const cropGroupConflicts = getCropGroupConflicts(item);
    const cropValidation = getCropValidation(item);
    const templateStatus = getTemplateStatus(item);
    
    if (isSelected) {
      return 'border-primary ring-2 ring-primary/20';
    }
    
    // Для групп культур с конфликтами
    if (cropGroupConflicts && !cropGroupConflicts.isValid) {
      return 'border-red-300 bg-red-50 dark:bg-red-950/20';
    }
    
    // Для культур с конфликтами
    if (cropValidation && !cropValidation.isValid) {
      return 'border-amber-300 bg-amber-50 dark:bg-amber-950/20';
    }
    
    // Для шаблонов
    if (templateStatus) {
      switch (templateStatus.status) {
        case 'in_current_group':
          return 'border-green-300 bg-green-50 dark:bg-green-950/20 hover:border-green-400';
        case 'in_other_group':
          return 'border-amber-300 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-400';
        default:
          return 'border-border hover:border-primary/50';
      }
    }
    
    return 'border-border hover:border-primary/50';
  };

  // Получаем иконку и текст статуса для культуры
  const getCropStatusDisplay = (item: any) => {
    const validation = getCropValidation(item);
    if (!validation) return null;
    
    if (validation.isValid) {
      return {
        icon: <CheckCircle2 className="h-3 w-3 text-green-500" />,
        text: 'Можно добавить',
        className: 'text-green-600 dark:text-green-400'
      };
    } else {
      return {
        icon: <AlertTriangle className="h-3 w-3 text-amber-500" />,
        text: validation.conflictingGroups?.length 
          ? `Конфликт с ${validation.conflictingGroups.length} группой(ами)`
          : validation.existingGroups?.length 
            ? `Уже в ${validation.existingGroups.length} группе(ах)`
            : 'Конфликт',
        className: 'text-amber-600 dark:text-amber-400'
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Показываем ошибку валидации */}
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-2 pr-4">
            {filteredItems.map((item) => {
              const cropGroupConflicts = getCropGroupConflicts(item);
              const cropValidation = getCropValidation(item);
              const cropStatusDisplay = getCropStatusDisplay(item);
              const templateStatusMessage = getTemplateStatusMessage(item);
              const canAdd = canAddItem(item);
              
              return (
                <div
                  key={getId(item)}
                  className={`border rounded-lg transition-all ${getItemStyles(item, selectedItem === item)}`}
                >
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{getName(item)}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {getId(item)}
                        </div>
                        
                        {/* Статус для культур */}
                        {cropStatusDisplay && (
                          <div className={`text-xs mt-1 flex items-center gap-1 ${cropStatusDisplay.className}`}>
                            {cropStatusDisplay.icon}
                            <span>{cropStatusDisplay.text}</span>
                            {cropValidation?.existingGroups && cropValidation.existingGroups.length > 0 && (
                              <span className="text-muted-foreground">
                                ({cropValidation.existingGroups.map(g => g.name).join(', ')})
                              </span>
                            )}
                            {cropValidation?.conflictingGroups && cropValidation.conflictingGroups.length > 0 && (
                              <span className="text-muted-foreground">
                                (связаны с группами шаблонов)
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Статус для шаблонов */}
                        {templateStatusMessage && (
                          <div className={`text-xs mt-1 flex items-center gap-1 ${templateStatusMessage.className}`}>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{templateStatusMessage.message}</span>
                          </div>
                        )}
                        
                        {/* Статус для групп культур */}
                        {cropGroupConflicts && !cropGroupConflicts.isValid && (
                          <div className="text-xs mt-1 flex items-center gap-1 text-red-500">
                            <XCircle className="h-3 w-3" />
                            <span>Конфликт: {cropGroupConflicts.errorMessage || 'есть пересекающиеся культуры'}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Кнопка "Добавить" показывается только если элемент можно добавить */}
                      {canAdd && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddItem(item);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить
                        </Button>
                      )}
                      
                      {/* Для уже добавленных/заблокированных элементов показываем иконку */}
                      {!canAdd && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {cropValidation?.conflictingGroups?.length ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="text-sm">Конфликт</span>
                            </>
                          ) : cropValidation?.existingGroups?.length ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="text-sm">Уже в группе</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm">Недоступно</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Показываем детали конфликта для групп культур при выборе */}
                  {selectedItem === item && showConflicts && cropGroupConflicts && !cropGroupConflicts.isValid && cropGroupConflicts.conflictCrops && (
                    <div className="border-t p-3 space-y-2 bg-red-50/50 dark:bg-red-950/10">
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Конфликтующие культуры:
                      </div>
                      <div className="space-y-1">
                        {cropGroupConflicts.conflictCrops.map((crop) => (
                          <div key={crop.id} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span>{crop.name}</span>
                            <span className="text-xs text-muted-foreground">
                              (уже в группе "{crop.groupName}")
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Для добавления этой группы необходимо сначала удалить конфликтующие группы культур
                      </div>
                    </div>
                  )}
                  
                  {/* Показываем детали конфликта для культуры (конфликт с группами, связанными с группой шаблонов) */}
                  {selectedItem === item && showConflicts && cropValidation && !cropValidation.isValid && cropValidation.conflictingGroups && cropValidation.conflictingGroups.length > 0 && (
                    <div className="border-t p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10">
                      <div className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Конфликт с существующими группами культур:
                      </div>
                      <div className="space-y-1">
                        {cropValidation.conflictingGroups.map((group) => (
                          <div key={group.id} className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <span>Группа культур "{group.name}"</span>
                            <span className="text-xs text-muted-foreground">
                              (связана с группой шаблонов "{group.templateGroupName}")
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Эта культура уже присутствует в группах культур, связанных с той же группой шаблонов.
                        Для добавления необходимо сначала удалить культуру из конфликтующих групп.
                      </div>
                    </div>
                  )}
                  
                  {/* Показываем существующие группы для культуры (обычный конфликт) */}
                  {selectedItem === item && showConflicts && cropValidation && !cropValidation.isValid && cropValidation.existingGroups && cropValidation.existingGroups.length > 0 && !cropValidation.conflictingGroups?.length && (
                    <div className="border-t p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10">
                      <div className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Культура уже в группах:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cropValidation.existingGroups.map((group) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Культура не может быть добавлена, так как уже присутствует в других группах
                      </div>
                    </div>
                  )}
                  
                  {/* Показываем культуры в группе при выборе (для групп культур) */}
                  {selectedItem === item && showConflicts && cropGroupConflicts?.isValid && getCropsInGroup && (
                    <div className="border-t p-3 space-y-2">
                      <div className="text-sm font-medium">Культуры в группе:</div>
                      <div className="flex flex-wrap gap-2">
                        {getCropsInGroup(getId(item)).map((crop) => (
                          <span
                            key={crop.id}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          >
                            {crop.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {items.length === 0 ? noItemsMessage : noResultsMessage}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;