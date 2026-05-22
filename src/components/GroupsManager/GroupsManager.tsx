import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit, Save, X, FolderTree, Package, AlertCircle, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import AddItemDialog from '../ThresholdsEditor/AddItemDialog';
import {
  createTemplateGroupName,
  updateTemplateGroupName,
  deleteTemplateGroupName,
  createTemplateGroup,
  deleteTemplateGroup,
  createCropGroupName,
  updateCropGroupName,
  deleteCropGroupName,
  createCropGroup,
  deleteCropGroup,
} from '@/api/scoutingReportApi';
import type { Crop, ScoutReportTemplate } from '@/types/handbooks';
import type { TemplateGroupName, TemplateGroup, CropGroup, CropGroupName, TemplateGroupCropGroup } from '@/types/groups';

interface GroupsManagerProps {
  templates: ScoutReportTemplate[];
  crops: Crop[];
  templateGroupNames: TemplateGroupName[];
  templateGroups: TemplateGroup[];
  cropGroupNames: CropGroupName[];
  cropGroups: CropGroup[];
  templateGroupCropGroups: TemplateGroupCropGroup[];
  onUpdate: () => Promise<void>;
  onClose?: () => void;
}

const GroupsManager: React.FC<GroupsManagerProps> = ({ 
  templates, 
  crops, 
  templateGroupCropGroups,
  templateGroupNames: initialTemplateGroupNames,
  templateGroups: initialTemplateGroups,
  cropGroupNames: initialCropGroupNames,
  cropGroups: initialCropGroups,
  onUpdate,
  onClose
}) => {
  // ======================
  // Состояния
  // ======================
  const [activeTab, setActiveTab] = useState<'templates' | 'crops'>('templates');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  
  // Template groups
  const [templateGroupNames, setTemplateGroupNames] = useState<TemplateGroupName[]>(initialTemplateGroupNames);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroup[]>(initialTemplateGroups);
  const [editingTemplateGroupId, setEditingTemplateGroupId] = useState<number | null>(null);
  const [editingTemplateGroupName, setEditingTemplateGroupName] = useState('');
  const [newTemplateGroupName, setNewTemplateGroupName] = useState('');
  
  // Crop groups
  const [cropGroupNames, setCropGroupNames] = useState<CropGroupName[]>(initialCropGroupNames);
  const [cropGroups, setCropGroups] = useState<CropGroup[]>(initialCropGroups);
  const [editingCropGroupId, setEditingCropGroupId] = useState<number | null>(null);
  const [editingCropGroupName, setEditingCropGroupName] = useState('');
  const [newCropGroupName, setNewCropGroupName] = useState('');
  
  // Dialogs
  const [isAddTemplateToGroupDialogOpen, setIsAddTemplateToGroupDialogOpen] = useState(false);
  const [isAddCropToGroupDialogOpen, setIsAddCropToGroupDialogOpen] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<number | null>(null);
  
  // Error/Success states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Синхронизация с пропсами
  useEffect(() => {
    setTemplateGroupNames(initialTemplateGroupNames);
    setTemplateGroups(initialTemplateGroups);
  }, [initialTemplateGroupNames, initialTemplateGroups]);

  useEffect(() => {
    setCropGroupNames(initialCropGroupNames);
    setCropGroups(initialCropGroups);
  }, [initialCropGroupNames, initialCropGroups]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Фильтрация групп по поиску
  const filteredTemplateGroups = useMemo(() => {
    if (!searchQuery) return templateGroupNames;
    return templateGroupNames.filter(g => 
      g.template_group_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templateGroupNames, searchQuery]);

  const filteredCropGroups = useMemo(() => {
    if (!searchQuery) return cropGroupNames;
    return cropGroupNames.filter(g => 
      g.crop_group_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cropGroupNames, searchQuery]);

  // ======================
// Crop Group Items - валидация с учетом конфликтов с группой шаблонов
// ======================

// Валидация для культуры при добавлении в группу культур
// Проверяет, не будет ли конфликта с уже существующими связями групп шаблонов
const validateCropForGroup = useCallback((crop: any) => {
  if (!selectedGroupForAdd) {
    return { isValid: true, existingGroups: [] };
  }
  
  const cropId = crop.crop_id;
  const targetCropGroupId = selectedGroupForAdd;
  
  // 1. Находим все группы шаблонов, к которым привязана целевая группа культур
  const linkedTemplateGroups = templateGroupCropGroups
    .filter(tgcg => tgcg.crop_group_id === targetCropGroupId)
    .map(tgcg => tgcg.template_group_id);
  
  if (linkedTemplateGroups.length === 0) {
    // Если группа культур ни с чем не связана, конфликтов нет
    return { isValid: true, existingGroups: [] };
  }
  
  // 2. Для каждой связанной группы шаблонов находим все группы культур, которые уже в ней есть
  const conflictingCropGroups: Array<{ id: number; name: string; templateGroupName: string }> = [];
  
  for (const templateGroupId of linkedTemplateGroups) {
    // Находим все группы культур, связанные с этой группой шаблонов
    const cropGroupsInTemplate = templateGroupCropGroups
      .filter(tgcg => tgcg.template_group_id === templateGroupId)
      .map(tgcg => tgcg.crop_group_id);
    
    // Для каждой группы культур проверяем, есть ли в ней наша культура
    for (const cropGroupId of cropGroupsInTemplate) {
      const isCropInGroup = cropGroups.some(
        cg => cg.crop_group_id === cropGroupId && cg.crop_id === cropId
      );
      
      if (isCropInGroup && cropGroupId !== targetCropGroupId) {
        const groupName = cropGroupNames.find(g => g.id === cropGroupId)?.crop_group_name || `Группа ${cropGroupId}`;
        const templateGroupName = templateGroupNames.find(tg => tg.id === templateGroupId)?.template_group_name || `Группа шаблонов ${templateGroupId}`;
        
        conflictingCropGroups.push({
          id: cropGroupId,
          name: groupName,
          templateGroupName
        });
      }
    }
  }
  
  if (conflictingCropGroups.length > 0) {
    const uniqueConflicts = conflictingCropGroups.filter((v, i, a) => 
      a.findIndex(t => t.id === v.id) === i
    );
    
    return {
      isValid: false,
      conflictMessage: `Культура уже присутствует в группе(ах) культур, связанных с этой же группой шаблонов: ${uniqueConflicts.map(c => `"${c.name}"`).join(', ')}`,
      conflictingGroups: uniqueConflicts
    };
  }
  
  return { isValid: true, existingGroups: [] };
}, [selectedGroupForAdd, templateGroupCropGroups, cropGroups, cropGroupNames, templateGroupNames]);

  // ======================
  // Template Group Names CRUD
  // ======================
  const handleCreateTemplateGroupName = async () => {
    if (!newTemplateGroupName.trim()) {
      setError('Введите название группы');
      return;
    }

    try {
      setIsLoading(true);
      await createTemplateGroupName(newTemplateGroupName.trim());
      await onUpdate();
      setNewTemplateGroupName('');
      setSuccess('Группа создана');
    } catch (err) {
      setError('Ошибка создания группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTemplateGroupName = async (id: number) => {
    if (!editingTemplateGroupName.trim()) {
      setError('Введите название группы');
      return;
    }

    try {
      setIsLoading(true);
      await updateTemplateGroupName(id, editingTemplateGroupName.trim());
      await onUpdate();
      setEditingTemplateGroupId(null);
      setEditingTemplateGroupName('');
      setSuccess('Группа обновлена');
    } catch (err) {
      setError('Ошибка обновления группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplateGroupName = async (id: number) => {
    if (!confirm('Вы уверены? Это удалит группу и все связи с шаблонами')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteTemplateGroupName(id);
      await onUpdate();
      setSuccess('Группа удалена');
    } catch (err) {
      setError('Ошибка удаления группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ======================
  // Crop Group Names CRUD
  // ======================
  const handleCreateCropGroupName = async () => {
    if (!newCropGroupName.trim()) {
      setError('Введите название группы');
      return;
    }

    try {
      setIsLoading(true);
      await createCropGroupName(newCropGroupName.trim());
      await onUpdate();
      setNewCropGroupName('');
      setSuccess('Группа создана');
    } catch (err) {
      setError('Ошибка создания группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCropGroupName = async (id: number) => {
    if (!editingCropGroupName.trim()) {
      setError('Введите название группы');
      return;
    }

    try {
      setIsLoading(true);
      await updateCropGroupName(id, editingCropGroupName.trim());
      await onUpdate();
      setEditingCropGroupId(null);
      setEditingCropGroupName('');
      setSuccess('Группа обновлена');
    } catch (err) {
      setError('Ошибка обновления группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCropGroupName = async (id: number) => {
    if (!confirm('Вы уверены? Это удалит группу и все связи с культурами')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteCropGroupName(id);
      await onUpdate();
      setSuccess('Группа удалена');
    } catch (err) {
      setError('Ошибка удаления группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ======================
  // Template Group Items
  // ======================
  const handleAddTemplateToGroup = async (template: any) => {
    if (!selectedGroupForAdd) return;

    try {
      setIsLoading(true);
      await createTemplateGroup(selectedGroupForAdd, template.scout_report_template_id);
      await onUpdate();
      setSuccess('Шаблон добавлен в группу');
    } catch (err) {
      setError('Ошибка добавления шаблона в группу');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTemplateFromGroup = async (groupId: number, templateId: number) => {
    const groupItem = templateGroups.find(
      g => g.template_group_id === groupId && g.scout_report_template_id === templateId
    );
    
    if (!groupItem) return;

    try {
      setIsLoading(true);
      await deleteTemplateGroup(groupItem.id);
      await onUpdate();
      setSuccess('Шаблон удален из группы');
    } catch (err) {
      setError('Ошибка удаления шаблона из группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ======================
  // Crop Group Items
  // ======================
  const handleAddCropToGroup = async (crop: any) => {
    if (!selectedGroupForAdd) return;

    try {
      setIsLoading(true);
      await createCropGroup(selectedGroupForAdd, crop.crop_id);
      await onUpdate();
      setSuccess('Культура добавлена в группу');
    } catch (err) {
      setError('Ошибка добавления культуры в группу');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCropFromGroup = async (groupId: number, cropId: number) => {
    const groupItem = cropGroups.find(
      g => g.crop_group_id === groupId && g.crop_id === cropId
    );
    
    if (!groupItem) return;

    try {
      setIsLoading(true);
      await deleteCropGroup(groupItem.id);
      await onUpdate();
      setSuccess('Культура удалена из группы');
    } catch (err) {
      setError('Ошибка удаления культуры из группы');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ======================
  // Вспомогательные функции
  // ======================
  const getTemplatesInGroup = (groupId: number) => {
    return templateGroups
      .filter(g => g.template_group_id === groupId)
      .map(g => {
        const template = templates.find(t => t.scout_report_template_id === g.scout_report_template_id);
        return {
          id: g.scout_report_template_id,
          name: template?.scout_report_template_name || 'Неизвестный шаблон'
        };
      });
  };

  const getCropsInGroup = (groupId: number) => {
    return cropGroups
      .filter(g => g.crop_group_id === groupId)
      .map(g => {
        const crop = crops.find(c => c.crop_id === g.crop_id);
        return {
          id: g.crop_id,
          name: crop?.crop_name || 'Неизвестная культура'
        };
      });
  };

  const getAvailableTemplatesForGroup = (groupId: number) => {
    const templatesInGroup = new Set(
      templateGroups
        .filter(g => g.template_group_id === groupId)
        .map(g => g.scout_report_template_id)
    );
    return templates.filter(t => !templatesInGroup.has(t.scout_report_template_id));
  };

  const getAvailableCropsForGroup = (groupId: number) => {
    const cropsInGroup = new Set(
      cropGroups
        .filter(g => g.crop_group_id === groupId)
        .map(g => g.crop_id)
    );
    return crops.filter(c => !cropsInGroup.has(c.crop_id));
  };

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Валидация шаблона для диалога
  const validateTemplateForGroup = (template: any) => {
    const templateId = template.scout_report_template_id;
    
    const isInCurrentGroup = templateGroups.some(
      g => g.template_group_id === selectedGroupForAdd && g.scout_report_template_id === templateId
    );
    
    if (isInCurrentGroup) {
      return {
        status: 'in_current_group' as const,
        message: 'Уже в этой группе',
      };
    }
    
    const otherGroup = templateGroups.find(g => g.scout_report_template_id === templateId);
    if (otherGroup) {
      const groupName = templateGroupNames.find(g => g.id === otherGroup.template_group_id)?.template_group_name;
      return {
        status: 'in_other_group' as const,
        message: `Уже в группе "${groupName}"`,
      };
    }
    
    return {
      status: 'available' as const,
    };
  };

  const currentGroupName = selectedGroupForAdd 
    ? templateGroupNames.find(g => g.id === selectedGroupForAdd)?.template_group_name 
    : '';
  
  const currentCropGroupName = selectedGroupForAdd 
    ? cropGroupNames.find(g => g.id === selectedGroupForAdd)?.crop_group_name 
    : '';

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Управление группами
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {/* Уведомления */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <AlertDescription className="text-green-700 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Поиск */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск групп..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'templates' | 'crops')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Группы шаблонов ({templateGroupNames.length})
              </TabsTrigger>
              <TabsTrigger value="crops" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Группы культур ({cropGroupNames.length})
              </TabsTrigger>
            </TabsList>

            {/* TEMPLATE GROUPS TAB */}
            <TabsContent value="templates" className="space-y-4">
              {/* Создание новой группы */}
              <div className="flex gap-2">
                <Input
                  placeholder="Название новой группы"
                  value={newTemplateGroupName}
                  onChange={(e) => setNewTemplateGroupName(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTemplateGroupName()}
                />
                <Button 
                  onClick={handleCreateTemplateGroupName}
                  disabled={isLoading || !newTemplateGroupName.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать
                </Button>
              </div>

              {/* Список групп */}
              <div className="space-y-3 mt-4">
                {filteredTemplateGroups.map((group) => {
                  const templatesInGroup = getTemplatesInGroup(group.id);
                  const availableTemplates = getAvailableTemplatesForGroup(group.id);
                  const isEditing = editingTemplateGroupId === group.id;
                  const isExpanded = expandedGroups.has(group.id);

                  return (
                    <Card key={group.id} className="border-2 border-stone-200 dark:border-stone-700">
                      <CardContent className="p-4">
                        {/* Заголовок группы */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            
                            {isEditing ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={editingTemplateGroupName}
                                  onChange={(e) => setEditingTemplateGroupName(e.target.value)}
                                  className="flex-1"
                                  autoFocus
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateTemplateGroupName(group.id)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateTemplateGroupName(group.id)}
                                  className="text-green-500"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingTemplateGroupId(null);
                                    setEditingTemplateGroupName('');
                                  }}
                                  className="text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-lg">{group.template_group_name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {templatesInGroup.length} шаблонов
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {!isEditing && (
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingTemplateGroupId(group.id);
                                      setEditingTemplateGroupName(group.template_group_name);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Редактировать</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTemplateGroupName(group.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Удалить группу</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        {/* Содержимое группы (раскрывается) */}
                        {isExpanded && (
                          <div className="mt-4 pl-6 space-y-3">
                            {/* Список шаблонов в группе */}
                            <div>
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Шаблоны в группе:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {templatesInGroup.map((item) => (
                                  <Badge
                                    key={item.id}
                                    variant="secondary"
                                    className="flex items-center gap-1 px-2 py-1"
                                  >
                                    <span className="text-sm">{item.name}</span>
                                    <button
                                      onClick={() => handleRemoveTemplateFromGroup(group.id, item.id)}
                                      className="ml-1 hover:text-red-500 transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                                {templatesInGroup.length === 0 && (
                                  <span className="text-sm text-muted-foreground italic">
                                    Нет шаблонов в группе
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Кнопка добавления шаблона */}
                            {availableTemplates.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedGroupForAdd(group.id);
                                  setIsAddTemplateToGroupDialogOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Добавить шаблон
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredTemplateGroups.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>🔍 Группы "{searchQuery}" не найдены</p>
                  </div>
                )}

                {filteredTemplateGroups.length === 0 && !searchQuery && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-lg mb-2">📁 Нет групп шаблонов</p>
                    <p className="text-sm">Создайте первую группу</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* CROP GROUPS TAB - аналогичная структура */}
            <TabsContent value="crops" className="space-y-4">
              {/* Создание новой группы */}
              <div className="flex gap-2">
                <Input
                  placeholder="Название новой группы"
                  value={newCropGroupName}
                  onChange={(e) => setNewCropGroupName(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCropGroupName()}
                />
                <Button 
                  onClick={handleCreateCropGroupName}
                  disabled={isLoading || !newCropGroupName.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать
                </Button>
              </div>

              {/* Список групп */}
              <div className="space-y-3 mt-4">
                {filteredCropGroups.map((group) => {
                  const cropsInGroup = getCropsInGroup(group.id);
                  const availableCrops = getAvailableCropsForGroup(group.id);
                  const isEditing = editingCropGroupId === group.id;
                  const isExpanded = expandedGroups.has(group.id);

                  return (
                    <Card key={group.id} className="border-2 border-stone-200 dark:border-stone-700">
                      <CardContent className="p-4">
                        {/* Заголовок группы */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            
                            {isEditing ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={editingCropGroupName}
                                  onChange={(e) => setEditingCropGroupName(e.target.value)}
                                  className="flex-1"
                                  autoFocus
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateCropGroupName(group.id)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateCropGroupName(group.id)}
                                  className="text-green-500"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCropGroupId(null);
                                    setEditingCropGroupName('');
                                  }}
                                  className="text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-lg">{group.crop_group_name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {cropsInGroup.length} культур
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {!isEditing && (
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCropGroupId(group.id);
                                      setEditingCropGroupName(group.crop_group_name);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Редактировать</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteCropGroupName(group.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Удалить группу</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        {/* Содержимое группы (раскрывается) */}
                        {isExpanded && (
                          <div className="mt-4 pl-6 space-y-3">
                            {/* Список культур в группе */}
                            <div>
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Культуры в группе:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {cropsInGroup.map((item) => (
                                  <Badge
                                    key={item.id}
                                    variant="secondary"
                                    className="flex items-center gap-1 px-2 py-1"
                                  >
                                    <span className="text-sm">{item.name}</span>
                                    <button
                                      onClick={() => handleRemoveCropFromGroup(group.id, item.id)}
                                      className="ml-1 hover:text-red-500 transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                                {cropsInGroup.length === 0 && (
                                  <span className="text-sm text-muted-foreground italic">
                                    Нет культур в группе
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Кнопка добавления культуры */}
                            {availableCrops.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedGroupForAdd(group.id);
                                  setIsAddCropToGroupDialogOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Добавить культуру
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredCropGroups.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>🔍 Группы "{searchQuery}" не найдены</p>
                  </div>
                )}

                {filteredCropGroups.length === 0 && !searchQuery && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="text-lg mb-2">📁 Нет групп культур</p>
                    <p className="text-sm">Создайте первую группу</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Диалоги */}
      <AddItemDialog
        open={isAddTemplateToGroupDialogOpen}
        onOpenChange={setIsAddTemplateToGroupDialogOpen}
        items={selectedGroupForAdd ? getAvailableTemplatesForGroup(selectedGroupForAdd) : []}
        existingItemIds={new Set()}
        onAddItem={handleAddTemplateToGroup}
        title={`Добавить шаблон в группу "${currentGroupName}"`}
        description={`Выберите шаблон для добавления в группу "${currentGroupName}"`}
        searchPlaceholder="Поиск шаблонов..."
        noItemsMessage="Нет доступных шаблонов"
        noResultsMessage="Шаблоны не найдены"
        getId={(item) => item.scout_report_template_id}
        getName={(item) => item.scout_report_template_name}
        validateTemplate={validateTemplateForGroup}
      />

      <AddItemDialog
        open={isAddCropToGroupDialogOpen}
        onOpenChange={setIsAddCropToGroupDialogOpen}
        items={selectedGroupForAdd ? getAvailableCropsForGroup(selectedGroupForAdd) : []}
        validateCrop={validateCropForGroup}
        existingItemIds={new Set()}
        onAddItem={handleAddCropToGroup}
        title={`Добавить культуру в группу "${currentCropGroupName}"`}
        description={`Выберите культуру для добавления в группу "${currentCropGroupName}"`}
        searchPlaceholder="Поиск культур..."
        noItemsMessage="Нет доступных культур"
        noResultsMessage="Культуры не найдены"
        getId={(item) => item.crop_id}
        getName={(item) => item.crop_name}
      />
    </TooltipProvider>
  );
};

export default GroupsManager;