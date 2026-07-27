import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import TemplateGroupsList from './TemplateGroupsList';
import CropGroupsList from './CropGroupsList';
import MeasurementsList from './MeasurementsList';
import ZonesEditor from './ZonesEditor';
import AddItemDialog, { type AddItemDialogProps } from '../ThresholdsEditor/AddItemDialog';
import type { ThresholdValue } from './types';
import type { GroupsThresholdsEditorProps, NavigationState, DialogType } from './types';
import type { ScoutReportMeasurementType } from '@/types/handbooks';
import type { TemplateGroupName, CropGroupName } from '@/types/groups';
import type { ThresholdValueWithId } from '@/api/scoutingReportApi';

type DialogContentProps<T> = Omit<AddItemDialogProps<T>, 'open' | 'onOpenChange'>;

const GroupsThresholdsEditor: React.FC<GroupsThresholdsEditorProps> = ({
  indicators,
  handbooks,
  templateGroupNames,
  templateGroups,
  cropGroupNames,
  cropGroups,
  templateGroupCropGroups,
  templateGroupCropGroupMeasurements,
  onAddTemplateGroupCropGroup,
  onAddMeasurementToGroup,
  onDeleteTemplateGroup,
  onDeleteCropGroup,
  onRemoveMeasurementFromGroup,
  onSave,
  isSaving = false,
  navigation: externalNavigation,
  onNavigationChange,
}) => {
  // Внутреннее состояние навигации на случай, если внешнее не передано
  const [internalNavigation, setInternalNavigation] = useState<NavigationState>({
    view: 'templateGroups',
    selectedTemplateGroupId: null,
    selectedCropGroupId: null,
    selectedMeasurementId: null,
    selectedTemplateGroupCropGroupId: null
  });

  // Используем внешнее состояние, если оно передано, иначе внутреннее
  const navigation = externalNavigation ?? internalNavigation;
  
  // Функция для обновления навигации
  const setNavigation = useCallback((newNavigation: NavigationState | ((prev: NavigationState) => NavigationState)) => {
    if (onNavigationChange) {
      if (typeof newNavigation === 'function') {
        onNavigationChange(newNavigation(navigation));
      } else {
        onNavigationChange(newNavigation);
      }
    } else {
      if (typeof newNavigation === 'function') {
        setInternalNavigation(newNavigation);
      } else {
        setInternalNavigation(newNavigation);
      }
    }
  }, [navigation, onNavigationChange]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('templateGroup');
  const [editedIndicators, setEditedIndicators] = useState(indicators);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  
  const lastSavedRef = useRef(indicators);

  useEffect(() => {
    setEditedIndicators(indicators);
    lastSavedRef.current = indicators;
  }, [indicators]);

  useEffect(() => {
    if (!onSave || editedIndicators === lastSavedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      setIsLocalSaving(true);
      onSave(editedIndicators)
        .then(() => {
          lastSavedRef.current = editedIndicators;
        })
        .catch(error => console.error('Auto-save failed:', error))
        .finally(() => setIsLocalSaving(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [editedIndicators, onSave]);

  const getTemplateGroupCropGroupId = useCallback((templateGroupId: number, cropGroupId: number): number | null => {
    const found = templateGroupCropGroups.find(
      tgcg => tgcg.template_group_id === templateGroupId && tgcg.crop_group_id === cropGroupId
    );
    return found?.id || null;
  }, [templateGroupCropGroups]);

  const currentTemplateGroup = useMemo(() => 
    templateGroupNames.find(g => g.id === Number(navigation.selectedTemplateGroupId)),
    [templateGroupNames, navigation.selectedTemplateGroupId]
  );

  const currentCropGroup = useMemo(() => 
    cropGroupNames.find(g => g.id === Number(navigation.selectedCropGroupId)),
    [cropGroupNames, navigation.selectedCropGroupId]
  );

  const currentMeasurement = useMemo(() => 
    handbooks.scout_report_measurement_types.find(
      m => m.scout_report_measurement_type_id === Number(navigation.selectedMeasurementId)
    ),
    [handbooks.scout_report_measurement_types, navigation.selectedMeasurementId]
  );

  const availableCropGroups = useMemo(() => {
    if (!navigation.selectedTemplateGroupId) return cropGroupNames;
    
    const templateGroupId = Number(navigation.selectedTemplateGroupId);
    const existingIds = new Set(
      templateGroupCropGroups
        .filter(tgcg => tgcg.template_group_id === templateGroupId)
        .map(tgcg => tgcg.crop_group_id)
    );
    
    return cropGroupNames.filter(group => !existingIds.has(group.id));
  }, [cropGroupNames, templateGroupCropGroups, navigation.selectedTemplateGroupId]);

  const availableMeasurements = useMemo(() => {
    if (!navigation.selectedTemplateGroupCropGroupId) return handbooks.scout_report_measurement_types;
    
    const tgcgId = Number(navigation.selectedTemplateGroupCropGroupId);
    const existingIds = new Set(
      templateGroupCropGroupMeasurements
        .filter(m => m.template_group_crop_group_id === tgcgId)
        .map(m => m.scout_report_measurement_type_id)
    );
    
    return handbooks.scout_report_measurement_types.filter(
      m => !existingIds.has(m.scout_report_measurement_type_id)
    );
  }, [handbooks.scout_report_measurement_types, templateGroupCropGroupMeasurements, navigation.selectedTemplateGroupCropGroupId]);

  const currentZones = useMemo((): ThresholdValue[] => {
    if (!navigation.selectedTemplateGroupId || !navigation.selectedCropGroupId || !navigation.selectedMeasurementId) {
      return [];
    }
    
    const templateGroupId = Number(navigation.selectedTemplateGroupId);
    const cropGroupId = Number(navigation.selectedCropGroupId);
    const measurementId = Number(navigation.selectedMeasurementId);
    
    return editedIndicators[templateGroupId]?.[cropGroupId]?.[measurementId] || [];
  }, [editedIndicators, navigation]);

  // Функции для валидации групп культур
  const getCropsInGroup = useCallback((groupId: number) => {
    return cropGroups
      .filter(cg => cg.crop_group_id === groupId)
      .map(cg => {
        const crop = handbooks.crops.find(c => c.crop_id === cg.crop_id);
        return {
          id: cg.crop_id,
          name: crop?.crop_name || `Культура ${cg.crop_id}`
        };
      });
  }, [cropGroups, handbooks.crops]);

  const validateCropGroup = useCallback((item: CropGroupName) => {
    const templateGroupId = Number(navigation.selectedTemplateGroupId);
    if (!templateGroupId) return { isValid: true };
    
    const existingGroupIds = templateGroupCropGroups
      .filter(tgcg => tgcg.template_group_id === templateGroupId)
      .map(tgcg => tgcg.crop_group_id);
    
    const existingCrops = new Set<number>();
    existingGroupIds.forEach(groupId => {
      cropGroups
        .filter(cg => cg.crop_group_id === groupId)
        .forEach(cg => existingCrops.add(cg.crop_id));
    });
    
    const newGroupCrops = cropGroups
      .filter(cg => cg.crop_group_id === item.id)
      .map(cg => cg.crop_id);
    
    const conflictingCrops = newGroupCrops.filter(cropId => existingCrops.has(cropId));
    
    if (conflictingCrops.length > 0) {
      const conflictCrops = conflictingCrops.map(cropId => {
        const crop = handbooks.crops.find(c => c.crop_id === cropId);
        const existingGroupId = existingGroupIds.find(groupId => 
          cropGroups.some(cg => cg.crop_group_id === groupId && cg.crop_id === cropId)
        );
        const existingGroup = cropGroupNames.find(g => g.id === existingGroupId);
        
        return {
          id: cropId,
          name: crop?.crop_name || `Культура ${cropId}`,
          groupName: existingGroup?.crop_group_name || 'неизвестной группе'
        };
      });
      
      return {
        isValid: false,
        conflictCrops,
        errorMessage: `Группа содержит культуры, которые уже есть в других группах`
      };
    }
    
    return { isValid: true };
  }, [navigation.selectedTemplateGroupId, templateGroupCropGroups, cropGroups, handbooks.crops, cropGroupNames]);

  // Обработчики навигации - используем setNavigation
  const handleTemplateGroupSelect = useCallback((templateGroupId: string) => {
    setNavigation({
      view: 'cropGroups',
      selectedTemplateGroupId: templateGroupId,
      selectedCropGroupId: null,
      selectedMeasurementId: null,
      selectedTemplateGroupCropGroupId: null
    });
  }, [setNavigation]);

  const handleCropGroupSelect = useCallback((cropGroupId: string) => {
    const templateGroupIdNum = Number(navigation.selectedTemplateGroupId);
    const cropGroupIdNum = Number(cropGroupId);
    const tgcgId = getTemplateGroupCropGroupId(templateGroupIdNum, cropGroupIdNum);
    
    setNavigation({
      view: 'measurements',
      selectedTemplateGroupId: navigation.selectedTemplateGroupId,
      selectedCropGroupId: cropGroupId,
      selectedTemplateGroupCropGroupId: tgcgId?.toString() || null,
      selectedMeasurementId: null
    });
  }, [navigation.selectedTemplateGroupId, getTemplateGroupCropGroupId, setNavigation]);

  const handleMeasurementSelect = useCallback((measurementId: string) => {
    setNavigation({
      ...navigation,
      view: 'zones',
      selectedMeasurementId: measurementId
    });
  }, [navigation, setNavigation]);

  const handleBack = useCallback(() => {
    switch (navigation.view) {
      case 'cropGroups':
        setNavigation({ 
          view: 'templateGroups', 
          selectedTemplateGroupId: null, 
          selectedCropGroupId: null, 
          selectedMeasurementId: null,
          selectedTemplateGroupCropGroupId: null
        });
        break;
      case 'measurements':
        setNavigation({
          view: 'cropGroups',
          selectedTemplateGroupId: navigation.selectedTemplateGroupId,
          selectedCropGroupId: null,
          selectedMeasurementId: null,
          selectedTemplateGroupCropGroupId: null
        });
        break;
      case 'zones':
        setNavigation({
          ...navigation,
          view: 'measurements',
          selectedMeasurementId: null
        });
        break;
    }
  }, [navigation, setNavigation]);

  const handleAddTemplateGroup = useCallback((templateGroup: TemplateGroupName) => {
    const templateGroupId = templateGroup.id.toString();
    
    setEditedIndicators(prev => ({
      ...prev,
      [templateGroupId]: {}
    }));

    setNavigation({
      view: 'cropGroups',
      selectedTemplateGroupId: templateGroupId,
      selectedCropGroupId: null,
      selectedMeasurementId: null,
      selectedTemplateGroupCropGroupId: null
    });
  }, [setNavigation]);

  const handleAddCropGroup = useCallback(async (cropGroup: CropGroupName) => {
    if (!navigation.selectedTemplateGroupId) return;
    
    const templateGroupIdNum = Number(navigation.selectedTemplateGroupId);
    const cropGroupIdNum = cropGroup.id;
    
    try {
      await onAddTemplateGroupCropGroup?.(templateGroupIdNum, cropGroupIdNum);
      
      setEditedIndicators(prev => {
        const updated = { ...prev };
        if (!updated[templateGroupIdNum]) {
          updated[templateGroupIdNum] = {};
        }
        return updated;
      });
    } catch (error) {
      console.error('Failed to add crop group:', error);
    }
  }, [navigation.selectedTemplateGroupId, onAddTemplateGroupCropGroup]);

  const handleAddMeasurement = useCallback(async (measurement: ScoutReportMeasurementType) => {
    if (!navigation.selectedTemplateGroupCropGroupId) return;
    
    const tgcgId = Number(navigation.selectedTemplateGroupCropGroupId);
    const measurementId = measurement.scout_report_measurement_type_id;
    
    try {
      await onAddMeasurementToGroup?.(tgcgId, measurementId);
    } catch (error) {
      console.error('Failed to add measurement:', error);
    }
  }, [navigation.selectedTemplateGroupCropGroupId, onAddMeasurementToGroup]);

  const handleZonesChange = useCallback((zones: ThresholdValueWithId[]) => {
    if (!navigation.selectedTemplateGroupId || !navigation.selectedCropGroupId || !navigation.selectedMeasurementId) return;
    
    const templateGroupId = Number(navigation.selectedTemplateGroupId);
    const cropGroupId = Number(navigation.selectedCropGroupId);
    const measurementId = Number(navigation.selectedMeasurementId);
    
    setEditedIndicators(prev => {
      const updated = { ...prev };
      
      if (!updated[templateGroupId]) {
        updated[templateGroupId] = {};
      }
      if (!updated[templateGroupId][cropGroupId]) {
        updated[templateGroupId][cropGroupId] = {};
      }
      
      updated[templateGroupId][cropGroupId][measurementId] = zones;
      
      return updated;
    });
  }, [navigation]);

  const handleZonesAutoSave = useCallback(async (zones: ThresholdValueWithId[]) => {
    if (!navigation.selectedTemplateGroupId || !navigation.selectedCropGroupId || !navigation.selectedMeasurementId) return;

    const templateGroupId = Number(navigation.selectedTemplateGroupId);
    const cropGroupId = Number(navigation.selectedCropGroupId);
    const measurementId = Number(navigation.selectedMeasurementId);

    setEditedIndicators(prev => {
      const updated = {
        ...prev,
        [templateGroupId]: {
          ...(prev[templateGroupId] || {}),
          [cropGroupId]: {
            ...(prev[templateGroupId]?.[cropGroupId] || {}),
            [measurementId]: zones
          }
        }
      };
      return updated;
    });

    if (onSave) {
      setIsLocalSaving(true);
      try {
        await onSave({
          ...editedIndicators,
          [templateGroupId]: {
            ...(editedIndicators[templateGroupId] || {}),
            [cropGroupId]: {
              ...(editedIndicators[templateGroupId]?.[cropGroupId] || {}),
              [measurementId]: zones
            }
          }
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsLocalSaving(false);
      }
    }
  }, [navigation, onSave, editedIndicators]);

  const openDialog = useCallback((type: DialogType) => {
    setDialogType(type);
    setIsDialogOpen(true);
  }, []);

  const savingInProgress = isSaving || isLocalSaving;

  // Диалоговые пропсы
  const dialogProps = useMemo(() => {
    switch (dialogType) {
      case 'templateGroup':
        return {
          items: templateGroupNames,
          existingItemIds: new Set(Object.keys(editedIndicators)),
          onAddItem: handleAddTemplateGroup,
          title: 'Добавить группу шаблонов',
          description: 'Выберите группу шаблонов для добавления пороговых значений',
          searchPlaceholder: 'Поиск групп шаблонов...',
          noItemsMessage: 'Нет доступных групп шаблонов',
          noResultsMessage: 'Группы не найдены',
          getId: (item: TemplateGroupName) => item.id,
          getName: (item: TemplateGroupName) => item.template_group_name
        };
      
      case 'cropGroup':
        return {
          items: availableCropGroups,
          existingItemIds: new Set<string>(),
          onAddItem: handleAddCropGroup,
          title: 'Добавить группу культур',
          description: 'Выберите группу культур для добавления к текущей группе шаблонов',
          searchPlaceholder: 'Поиск групп культур...',
          noItemsMessage: 'Нет доступных групп культур',
          noResultsMessage: 'Группы не найдены',
          getId: (item: CropGroupName) => item.id,
          getName: (item: CropGroupName) => item.crop_group_name,
          isCropGroupDialog: true,
          validateCropGroup,
          getCropsInGroup,
          existingCropGroupIds: templateGroupCropGroups
            .filter(tgcg => tgcg.template_group_id === Number(navigation.selectedTemplateGroupId))
            .map(tgcg => tgcg.crop_group_id),
        };
      
      case 'measurement':
        return {
          items: availableMeasurements,
          existingItemIds: new Set<string>(),
          onAddItem: handleAddMeasurement,
          title: 'Добавить измерение',
          description: 'Выберите измерение для добавления к текущей паре групп',
          searchPlaceholder: 'Поиск измерений...',
          noItemsMessage: 'Нет доступных измерений',
          noResultsMessage: 'Измерения не найдены',
          getId: (item: ScoutReportMeasurementType) => item.scout_report_measurement_type_id,
          getName: (item: ScoutReportMeasurementType) => item.human_name
        };
      
      default:
        return null;
    }
  }, [dialogType, templateGroupNames, editedIndicators, availableCropGroups, availableMeasurements, 
      handleAddTemplateGroup, handleAddCropGroup, handleAddMeasurement, validateCropGroup, getCropsInGroup,
      templateGroupCropGroups, navigation.selectedTemplateGroupId]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {navigation.view !== 'templateGroups' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              disabled={savingInProgress}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle>Редактор пороговых значений для групп</CardTitle>
        </div>
        {navigation.view === 'cropGroups' && (
          <Button 
            onClick={() => openDialog('cropGroup')}
            disabled={savingInProgress}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить группу культур
          </Button>
        )}
        {navigation.view === 'measurements' && (
          <Button 
            onClick={() => openDialog('measurement')}
            disabled={savingInProgress}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить измерение
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
          <span>Группы шаблонов</span>
          {currentTemplateGroup && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>{currentTemplateGroup.template_group_name}</span>
            </>
          )}
          {currentCropGroup && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>{currentCropGroup.crop_group_name}</span>
            </>
          )}
          {currentMeasurement && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>{currentMeasurement.human_name}</span>
            </>
          )}
        </div>

        {navigation.view === 'templateGroups' && (
          <TemplateGroupsList
            indicators={editedIndicators}
            templateGroupNames={templateGroupNames}
            templateGroups={templateGroups}
            templates={handbooks.scout_report_templates}
            cropGroupNames={cropGroupNames}                    
            templateGroupCropGroups={templateGroupCropGroups}
            onSelect={handleTemplateGroupSelect}
            onDelete={onDeleteTemplateGroup}
            onAdd={() => openDialog('templateGroup')}
          />
        )}

        {navigation.view === 'cropGroups' && navigation.selectedTemplateGroupId && (
          <CropGroupsList
            indicators={editedIndicators}
            templateGroupId={navigation.selectedTemplateGroupId}
            cropGroupNames={cropGroupNames}
            cropGroups={cropGroups}
            crops={handbooks.crops}
            measurements={handbooks.scout_report_measurement_types}
            templateGroupCropGroups={templateGroupCropGroups}
            templateGroupCropGroupMeasurements={templateGroupCropGroupMeasurements}
            onSelect={handleCropGroupSelect}
            onDelete={onDeleteCropGroup}
            onAdd={() => openDialog('cropGroup')}
          />
        )}

        {navigation.view === 'measurements' && 
         navigation.selectedTemplateGroupId && 
         navigation.selectedCropGroupId && (
          <MeasurementsList
            indicators={editedIndicators}
            templateGroupId={navigation.selectedTemplateGroupId}
            cropGroupId={navigation.selectedCropGroupId}
            measurements={handbooks.scout_report_measurement_types}
            templateGroupCropGroupMeasurements={templateGroupCropGroupMeasurements}
            templateGroupCropGroups={templateGroupCropGroups}
            onSelect={handleMeasurementSelect}
            onDelete={onRemoveMeasurementFromGroup}
            onAdd={() => openDialog('measurement')}
          />
        )}

        {navigation.view === 'zones' && 
         navigation.selectedTemplateGroupId && 
         navigation.selectedCropGroupId && 
         navigation.selectedMeasurementId && (
          <ZonesEditor
            key={`${navigation.selectedTemplateGroupId}:${navigation.selectedCropGroupId}:${navigation.selectedMeasurementId}`}
            zones={currentZones}
            measurementName={currentMeasurement?.human_name || ''}
            onChange={handleZonesChange}
            onAutoSave={handleZonesAutoSave}
            disabled={savingInProgress}
            isSaving={savingInProgress}
          />
        )}
      </CardContent>

      {dialogProps && dialogType === 'templateGroup' && (
        <AddItemDialog<TemplateGroupName>
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          {...(dialogProps as DialogContentProps<TemplateGroupName>)}
        />
      )}
      {dialogProps && dialogType === 'cropGroup' && (
        <AddItemDialog<CropGroupName>
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          {...(dialogProps as DialogContentProps<CropGroupName>)}
        />
      )}
      {dialogProps && dialogType === 'measurement' && (
        <AddItemDialog<ScoutReportMeasurementType>
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          {...(dialogProps as DialogContentProps<ScoutReportMeasurementType>)}
        />
      )}
    </Card>
  );
};

export default GroupsThresholdsEditor;
