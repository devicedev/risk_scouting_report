import { useEffect, useState, useCallback, useMemo } from "react"
import { useQuery } from '@tanstack/react-query'
import { getScoutReports, getIndicators, getAllThresholds, type IndicatorThreshold, deleteTemplateThresholds } from "./api/scoutingReportApi"
import { aggregateTemplates } from "./services/aggregateTemplates"
import { aggregateFarms } from "./services/aggregateFarms"

import type { TemplateData } from "./types/scoutingAggregated"
import type { FarmData } from "./types/scoutingFarmAggregated"
import { ThemeProvider } from "./components/ui/theme-provider";
import { Header } from "./components/Header/Header";
import { useSearchParams } from "react-router-dom";

import { getHandbooks } from "./api/handbooksApi"
import GroupsThresholdsEditor from "./components/GroupsThresholdsEditor/GroupsThresholdsEditor"
import type { GroupsIndicatorsData, NavigationState } from "./components/GroupsThresholdsEditor/types"
import type { Crop, ScoutReportTemplate, ScoutReportMeasurementType } from "./types/handbooks"
import GroupsManager from "./components/GroupsManager/GroupsManager";
import ScoutingTabs from "./components/ScoutingTabs/ScoutingTabs"
import type { TabType } from "./types/handbooks"

import type { 
  TemplateGroupName, 
  TemplateGroup, 
  CropGroupName, 
  CropGroup,
  TemplateGroupCropGroup,
  TemplateGroupCropGroupMeasurement 
} from "./types/groups";
import {
  getTemplateGroupNames,
  getTemplateGroups,
  getCropGroupNames,
  getCropGroups,
  getTemplateGroupCropGroups,
  getTemplateGroupCropGroupMeasurements,
  createTemplateGroupCropGroup,
  deleteTemplateGroupCropGroup,
  createTemplateGroupCropGroupMeasurement,
  deleteTemplateGroupCropGroupMeasurement,
} from "./api/scoutingReportApi";

import { 
  saveAllThresholds
} from "./api/scoutingReportApi";


function App() {
  // UI состояния
  const [crops, setCrops] = useState<Crop[]>([])
  const [reportTemplates, setReportTemplates] = useState<ScoutReportTemplate[]>([])
  const [measurementTypes, setMeasurementTypes] = useState<ScoutReportMeasurementType[]>([])
  
  // Состояния для групп
  const [templateGroupNames, setTemplateGroupNames] = useState<TemplateGroupName[]>([]);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroup[]>([]);
  const [cropGroupNames, setCropGroupNames] = useState<CropGroupName[]>([]);
  const [cropGroups, setCropGroups] = useState<CropGroup[]>([]);
  const [templateGroupCropGroups, setTemplateGroupCropGroups] = useState<TemplateGroupCropGroup[]>([]);
  const [templateGroupCropGroupMeasurements, setTemplateGroupCropGroupMeasurements] = useState<TemplateGroupCropGroupMeasurement[]>([]);
  
  // Данные для группового редактора
  const [groupsThresholdsData, setGroupsThresholdsData] = useState<GroupsIndicatorsData>({});
  const [existingRules, setExistingRules] = useState<IndicatorThreshold[]>([])
  
  const [isSaving, setIsSaving] = useState(false)
  const [isStaticDataLoading, setIsStaticDataLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'table' | 'zones' | 'groups'>('table');

  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const urlSeason = Number(searchParams.get("season")) || currentYear;
  const [season, setSeason] = useState(urlSeason);

  // Состояния для таблицы шаблонов (новая структура с хозяйствами)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [expandedMeasurements, setExpandedMeasurements] = useState<Set<number>>(new Set())
  const [expandedCrops, setExpandedCrops] = useState<Set<number>>(new Set())
  const [expandedFarms, setExpandedFarms] = useState<Set<string>>(new Set())
  const [expandedFields, setExpandedFields] = useState<Set<number>>(new Set())
  
  // Состояния для таблицы хозяйств (новая иерархия: Farm → TemplateGroup → Measurement → Crop → Field)
  const [expandedFarmsFarm, setExpandedFarmsFarm] = useState<Set<string>>(new Set())
  const [expandedFarmTemplateGroups, setExpandedFarmTemplateGroups] = useState<Set<number>>(new Set())  // ✅ новое состояние для групп
  const [expandedFarmMeasurements, setExpandedFarmMeasurements] = useState<Set<number>>(new Set())
  const [expandedFarmCrops, setExpandedFarmCrops] = useState<Set<number>>(new Set())
  const [expandedFarmFields, setExpandedFarmFields] = useState<Set<number>>(new Set())

  const [scoutingActiveTab, setScoutingActiveTab] = useState<TabType>("farms")

  const [groupsNavigation, setGroupsNavigation] = useState<NavigationState>({
    view: 'templateGroups',
    selectedTemplateGroupId: null,
    selectedCropGroupId: null,
    selectedMeasurementId: null,
    selectedTemplateGroupCropGroupId: null
  });

  const [dateRange, setDateRange] = useState({
    start: new Date(season, 0, 1),
    end: new Date(season, 11, 31),
  });

  // React Query для reports
  const { 
    data: reportsData, 
    isLoading: isReportsLoading,
  } = useQuery({
    queryKey: ['scout-reports', season],
    queryFn: () => getScoutReports(season),
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    staleTime: 55000,
    gcTime: 120000,
  });

  // Вычисляемые данные через useMemo
  const templates = useMemo((): TemplateData[] => {
    if (!reportsData) return [];
    
    return aggregateTemplates(
      reportsData.filter(r => r.scout_report_id),
      groupsThresholdsData,
      templateGroups,
      cropGroups,
      templateGroupCropGroups
    );
  }, [reportsData, groupsThresholdsData, templateGroups, cropGroups, templateGroupCropGroups]);

  const farmData = useMemo((): FarmData[] => {
    if (!reportsData) return [];
    
    return aggregateFarms(
      reportsData.filter(r => r.scout_report_id),
      groupsThresholdsData,
      templateGroups,
      cropGroups,
      templateGroupCropGroups,
      templateGroupNames  // ✅ передаем templateGroupNames для названий групп
    );
  }, [reportsData, groupsThresholdsData, templateGroups, cropGroups, templateGroupCropGroups, templateGroupNames]);

  // Обновляем диапазон при смене сезона
  useEffect(() => {
    setDateRange({
      start: new Date(season, 0, 1),
      end: new Date(season, 11, 31),
    });
  }, [season]);

  // Загружаем статические данные (handbooks, groups, thresholds)
  useEffect(() => {
    let isMounted = true;
    
    async function loadStaticData() {
      try {
        setIsStaticDataLoading(true);
        
        const [indicators, handbooks, allRules, groupsData] = await Promise.all([
          getIndicators(),
          getHandbooks(),
          getAllThresholds(),
          Promise.all([
            getTemplateGroupNames(),
            getTemplateGroups(),
            getCropGroupNames(),
            getCropGroups(),
            getTemplateGroupCropGroups(),
            getTemplateGroupCropGroupMeasurements()
          ])
        ]);

        if (!isMounted) return;

        const [
          tGroupNames, 
          tGroups, 
          cGroupNames, 
          cGroups,
          tgcgGroups,
          tgcgMeasurements
        ] = groupsData;

        setTemplateGroupNames(tGroupNames);
        setTemplateGroups(tGroups);
        setCropGroupNames(cGroupNames);
        setCropGroups(cGroups);
        setTemplateGroupCropGroups(tgcgGroups);
        setTemplateGroupCropGroupMeasurements(tgcgMeasurements);

        setExistingRules(allRules);
        setCrops(handbooks.crops || []);
        setReportTemplates(handbooks.scout_report_templates || []);
        setMeasurementTypes(handbooks.scout_report_measurement_types || []);
        setGroupsThresholdsData(indicators);
        
      } catch (error) {
        console.error("Ошибка загрузки статических данных", error);
      } finally {
        if (isMounted) {
          setIsStaticDataLoading(false);
        }
      }
    }

    loadStaticData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Показываем лоадер, пока грузятся И статические данные, И reports
  const isLoading = isStaticDataLoading || isReportsLoading;

  // Обработчики для таблицы шаблонов (новая структура с хозяйствами)
  const handleToggleGroup = useCallback((id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleMeasurement = useCallback((id: number) => {
    setExpandedMeasurements(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleCrop = useCallback((id: number) => {
    setExpandedCrops(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleFarm = useCallback((id: string) => {
    setExpandedFarms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleField = useCallback((id: number) => {
    setExpandedFields(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Обработчики для таблицы хозяйств (новая иерархия)
  const handleToggleFarmFarm = useCallback((id: string) => {
    setExpandedFarmsFarm(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleFarmTemplateGroup = useCallback((id: number) => {
    setExpandedFarmTemplateGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleFarmMeasurement = useCallback((id: number) => {
    setExpandedFarmMeasurements(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleFarmCrop = useCallback((id: number) => {
    setExpandedFarmCrops(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleFarmField = useCallback((id: number) => {
    setExpandedFarmFields(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleSeasonChange = (newSeason: number) => {
    setSeason(newSeason);
    setSearchParams({ ...Object.fromEntries(searchParams), season: String(newSeason) });
  };

  const handleViewChange = (view: 'table' | 'zones' | 'groups') => {
    setCurrentView(view);
  };

  const loadGroupsData = async () => {
    try {
      const [
        tGroupNames, 
        tGroups, 
        cGroupNames, 
        cGroups,
        tgcgGroups,
        tgcgMeasurements
      ] = await Promise.all([
        getTemplateGroupNames(),
        getTemplateGroups(),
        getCropGroupNames(),
        getCropGroups(),
        getTemplateGroupCropGroups(),
        getTemplateGroupCropGroupMeasurements()
      ]);

      setTemplateGroupNames(tGroupNames);
      setTemplateGroups(tGroups);
      setCropGroupNames(cGroupNames);
      setCropGroups(cGroups);
      setTemplateGroupCropGroups(tgcgGroups);
      setTemplateGroupCropGroupMeasurements(tgcgMeasurements);
    } catch (error) {
      console.error("Ошибка загрузки групп", error);
    }
  };

  const handleAddTemplateGroupCropGroup = async (templateGroupId: number, cropGroupId: number) => {
    try {
      const newId = await createTemplateGroupCropGroup(templateGroupId, cropGroupId);
      await loadGroupsData();
      return newId;
    } catch (error) {
      console.error("Ошибка создания связи групп", error);
      throw error;
    }
  };

  const handleRemoveTemplateGroupCropGroup = async (id: number) => {
    try {
      await deleteTemplateGroupCropGroup(id);
      await loadGroupsData();
    } catch (error) {
      console.error("Ошибка удаления связи групп", error);
      throw error;
    }
  };

  const handleAddMeasurementToGroup = async (templateGroupCropGroupId: number, measurementTypeId: number) => {
    try {
      const newId = await createTemplateGroupCropGroupMeasurement(templateGroupCropGroupId, measurementTypeId);
      await loadGroupsData();
      return newId;
    } catch (error) {
      console.error("Ошибка добавления измерения в группу", error);
      throw error;
    }
  };

  const handleRemoveMeasurementFromGroup = async (id: number) => {
    try {
      await deleteTemplateGroupCropGroupMeasurement(id);
      
      const [indicators, allRules] = await Promise.all([
        getIndicators(),
        getAllThresholds()
      ]);
      
      setGroupsThresholdsData(indicators);
      setExistingRules(allRules);
      await loadGroupsData();
      
    } catch (error) {
      console.error("Ошибка удаления измерения из группы", error);
      throw error;
    }
  };

  const handleDeleteTemplateGroup = async (templateGroupId: number) => {
    try {
      setIsSaving(true);
      console.log(`🗑️ Deleting template group ${templateGroupId}...`);
      
      const templateIds = templateGroups
        .filter(tg => tg.template_group_id === templateGroupId)
        .map(tg => tg.scout_report_template_id);
      
      for (const templateId of templateIds) {
        await deleteTemplateThresholds(templateId);
      }
      
      const [indicators, allRules] = await Promise.all([
        getIndicators(),
        getAllThresholds()
      ]);
      
      setExistingRules(allRules);
      setGroupsThresholdsData(indicators);
      await loadGroupsData();
      
    } catch (error) {
      console.error(`❌ Failed to delete template group ${templateGroupId}:`, error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCropGroup = async (templateGroupId: number, cropGroupId: number) => {
    try {
      setIsSaving(true);
      console.log(`🗑️ Deleting crop group ${cropGroupId} from template group ${templateGroupId}...`);
      
      const tgcg = templateGroupCropGroups.find(
        g => g.template_group_id === templateGroupId && g.crop_group_id === cropGroupId
      );
      
      if (!tgcg) {
        console.error('Template group crop group not found');
        return;
      }
      
      await deleteTemplateGroupCropGroup(tgcg.id);
      await loadGroupsData();
      
      const [indicators, allRules] = await Promise.all([
        getIndicators(),
        getAllThresholds()
      ]);
      
      setExistingRules(allRules);
      setGroupsThresholdsData(indicators);
      
      console.log(`✅ Crop group ${cropGroupId} deleted successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to delete crop group ${cropGroupId}:`, error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGroupsThresholds = async (updatedIndicators: GroupsIndicatorsData) => {
    try {
      setIsSaving(true);
      console.log("Saving groups thresholds:", updatedIndicators);
      
      await saveAllThresholds(
        groupsThresholdsData, 
        updatedIndicators, 
        existingRules,
        templateGroupCropGroups,
        templateGroupCropGroupMeasurements
      );
      
      setGroupsThresholdsData(updatedIndicators);
      
      const updatedRules = await getAllThresholds();
      setExistingRules(updatedRules);
      
      console.log("Groups thresholds saved successfully");
      
    } catch (error) {
      console.error("Error saving groups thresholds:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Показываем лоадер пока загружаются И статика, И reports
  if (isLoading) {
    return (
      <ThemeProvider>
        <Header 
          onSeasonChange={handleSeasonChange} 
          onViewChange={handleViewChange}
          currentView={currentView}
        />
        <div className="p-4 max-w-7xl mx-auto mt-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-400" />
            <div className="text-lg text-gray-700 dark:text-gray-300">Загрузка данных...</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Пожалуйста, подождите</div>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Header 
        onSeasonChange={handleSeasonChange} 
        onViewChange={handleViewChange}
        currentView={currentView}
      />
      <div className="p-4 max-w-7xl mx-auto mt-8">
        {currentView === 'table' && (
          <ScoutingTabs
            templates={templates}
            farmData={farmData}
            templateGroups={templateGroups}
            templateGroupNames={templateGroupNames}
            cropGroups={cropGroups}
            cropGroupNames={cropGroupNames}
            season={season}
            dateRange={dateRange}
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
            // Состояния для таблицы шаблонов (с хозяйствами)
            expandedGroups={expandedGroups}
            expandedMeasurements={expandedMeasurements}
            expandedCrops={expandedCrops}
            expandedFarms={expandedFarms}
            expandedFields={expandedFields}
            onToggleGroup={handleToggleGroup}
            onToggleMeasurement={handleToggleMeasurement}
            onToggleCrop={handleToggleCrop}
            onToggleFarm={handleToggleFarm}
            onToggleField={handleToggleField}
            // Состояния для таблицы хозяйств (новая иерархия)
            expandedFarmsFarm={expandedFarmsFarm}
            expandedFarmTemplateGroups={expandedFarmTemplateGroups}
            expandedFarmMeasurements={expandedFarmMeasurements}
            expandedFarmCrops={expandedFarmCrops}
            expandedFarmFields={expandedFarmFields}
            onToggleFarmFarm={handleToggleFarmFarm}
            onToggleFarmTemplateGroup={handleToggleFarmTemplateGroup}
            onToggleFarmMeasurement={handleToggleFarmMeasurement}
            onToggleFarmCrop={handleToggleFarmCrop}
            onToggleFarmField={handleToggleFarmField}
            activeTab={scoutingActiveTab}
            onActiveTabChange={setScoutingActiveTab}
          />
        )}
        
        {currentView === 'zones' && (
          <GroupsThresholdsEditor
            indicators={groupsThresholdsData}
            handbooks={{
              crops,
              scout_report_templates: reportTemplates,
              scout_report_measurement_types: measurementTypes
            }}
            templateGroupNames={templateGroupNames}
            templateGroups={templateGroups}
            cropGroupNames={cropGroupNames}
            cropGroups={cropGroups}
            templateGroupCropGroups={templateGroupCropGroups}
            templateGroupCropGroupMeasurements={templateGroupCropGroupMeasurements}
            onAddTemplateGroupCropGroup={handleAddTemplateGroupCropGroup}
            onRemoveTemplateGroupCropGroup={handleRemoveTemplateGroupCropGroup}
            onAddMeasurementToGroup={handleAddMeasurementToGroup}
            onRemoveMeasurementFromGroup={handleRemoveMeasurementFromGroup}
            onSave={handleSaveGroupsThresholds}
            onDeleteTemplateGroup={handleDeleteTemplateGroup}
            onDeleteCropGroup={handleDeleteCropGroup}
            isSaving={isSaving}
            navigation={groupsNavigation}
            onNavigationChange={setGroupsNavigation}
          />
        )}
        
        {currentView === 'groups' && (
          <GroupsManager
            templates={reportTemplates}
            crops={crops}
            templateGroupCropGroups={templateGroupCropGroups} 
            templateGroupNames={templateGroupNames}
            templateGroups={templateGroups}
            cropGroupNames={cropGroupNames}
            cropGroups={cropGroups}
            onUpdate={loadGroupsData}
            onClose={() => setCurrentView('table')}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default App