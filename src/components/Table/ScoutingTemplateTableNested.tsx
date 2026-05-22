import ReportsModal from "../ScoutingOverview/ReportsModal"
import React, { useMemo, useState } from "react"
import type { TemplateData, ReportMeasurement } from "../../types/scoutingAggregated"
import type { TemplateGroupName, TemplateGroup, CropGroup, CropGroupName } from "../../types/groups"

interface Props {
  templates: TemplateData[];
  templateGroups: TemplateGroup[];
  templateGroupNames: TemplateGroupName[];
  cropGroups: CropGroup[];
  cropGroupNames: CropGroupName[];
  expandedGroups: Set<number>;
  expandedMeasurements: Set<number>;
  expandedCrops: Set<number>;
  expandedFarms: Set<string>;
  expandedFields: Set<number>;
  onToggleGroup: (id: number) => void;
  onToggleMeasurement: (id: number) => void;
  onToggleCrop: (id: number) => void;
  onToggleFarm: (id: string) => void;
  onToggleField: (id: number) => void;
}

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

interface ZoneBadgeProps {
  value: number
  total: number
  color: string
  label: string
  icon: string
  zoneType: 'green' | 'orange' | 'red'
  onBadgeClick: (zoneType: 'green' | 'orange' | 'red', label: string) => void
}

const ZoneBadge = ({ value, total, color, label, icon, zoneType, onBadgeClick }: ZoneBadgeProps) => {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
  
  return (
    <div 
      onClick={() => onBadgeClick(zoneType, label)}
      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-all cursor-pointer hover:scale-105 active:scale-95"
    >
      <span className="text-base">{icon}</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
          <span className="text-xs text-stone-400 dark:text-stone-500">{label}</span>
        </div>
        <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400">{percentage}%</span>
      </div>
    </div>
  )
}

interface CompactZoneBadgeProps {
  value: number
  total: number
  color: string
  icon: string
  zoneType: 'green' | 'orange' | 'red'
  onBadgeClick: (zoneType: 'green' | 'orange' | 'red', label: string) => void
}

const CompactZoneBadge = ({ value, total, color, icon, zoneType, onBadgeClick }: CompactZoneBadgeProps) => {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
  const label = zoneType === 'green' ? 'Низкий' : zoneType === 'orange' ? 'Средний' : 'Высокий'
  
  return (
    <div 
      onClick={() => onBadgeClick(zoneType, label)}
      className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800/30 rounded-md px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
    >
      <span className="text-sm">{icon}</span>
      <span className={`text-sm font-medium tabular-nums ${color}`}>{value}</span>
      <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">({percentage}%)</span>
    </div>
  )
}

const RiskBar = ({ green, orange, red, total }: { green: number; orange: number; red: number; total: number }) => {
  if (!total) return null

  const gPercent = (green / total) * 100
  const oPercent = (orange / total) * 100
  const rPercent = (red / total) * 100

  return (
    <div className="relative group w-full max-w-md">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-800 shadow-inner">
        <div 
          style={{ width: `${gPercent}%` }} 
          className="bg-gradient-to-r from-emerald-400 to-emerald-500 group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300"
        />
        <div 
          style={{ width: `${oPercent}%` }} 
          className="bg-gradient-to-r from-amber-400 to-amber-500 group-hover:from-amber-500 group-hover:to-amber-600 transition-all duration-300"
        />
        <div 
          style={{ width: `${rPercent}%` }} 
          className="bg-gradient-to-r from-rose-400 to-rose-500 group-hover:from-rose-500 group-hover:to-rose-600 transition-all duration-300"
        />
      </div>
    </div>
  )
}

// Унифицированные интерфейсы для фильтрации
interface ReportFilters {
  groupId?: number
  measurementTypeId?: number
  cropId?: number
  farmId?: string
  fieldId?: number
  zoneType?: 'green' | 'orange' | 'red'
}

const ScoutingTemplateTableNested: React.FC<Props> = ({ 
  templates, 
  templateGroups, 
  templateGroupNames,
  cropGroups,
  cropGroupNames,
  expandedGroups,
  expandedMeasurements,
  expandedCrops,
  expandedFarms,
  expandedFields,
  onToggleGroup,
  onToggleMeasurement,
  onToggleCrop,
  onToggleFarm,
  onToggleField,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalReports, setModalReports] = useState<(ReportMeasurement & { measurement_type_name?: string })[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [modalDescription, setModalDescription] = useState('')

  // 🚀 Унифицированная функция для получения отчетов по любым фильтрам
// Унифицированная функция для получения отчетов по любым фильтрам
// Унифицированная функция для получения отчетов по любым фильтрам
const getReportsByFilters = useMemo(() => {
  return (filters: ReportFilters) => {
    const reports: (ReportMeasurement & { measurement_type_name?: string })[] = []
    
    // Получаем ID шаблонов для группы (если указана)
    let templateIds: number[] | null = null
    if (filters.groupId !== undefined) {
      templateIds = templateGroups
        .filter((tg: TemplateGroup) => tg.template_group_id === filters.groupId)
        .map((tg: TemplateGroup) => tg.scout_report_template_id)
    }
    
    templates.forEach(template => {
      // Фильтр по группе
      if (templateIds && !templateIds.includes(template.template_id)) return
      
      template.measurements?.forEach(measurement => {
        // Фильтр по измерению - на уровне измерения, потому что у отчета нет measurement_type_id
        if (filters.measurementTypeId !== undefined && measurement.measurement_type_id !== filters.measurementTypeId) return
        
        measurement.crops?.forEach(crop => {
          // Фильтр по культуре
          if (filters.cropId !== undefined && crop.crop_id !== filters.cropId) return
          
          crop.farms?.forEach(farm => {
            // Фильтр по хозяйству
            if (filters.farmId !== undefined && farm.farm_id !== filters.farmId) return
            
            farm.fields?.forEach(field => {
              // Фильтр по полю
              if (filters.fieldId !== undefined && field.field_id !== filters.fieldId) return
              
              field.reports?.forEach((report: ReportMeasurement) => {
                // Фильтр по зоне
                if (filters.zoneType !== undefined && report.zone !== filters.zoneType) return
                
                reports.push({
                  ...report,
                  measurement_type_name: measurement.human_name
                })
              })
            })
          })
        })
      })
    })
    
    return reports
  }
}, [templates, templateGroups])

  // Обработчик для клика на бейдж группы
  const handleGroupBadgeClick = (groupId: number, groupName: string, zoneType: 'green' | 'orange' | 'red', label: string) => {
    const reports = getReportsByFilters({ groupId, zoneType })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${groupName} - ${zoneLabel}`)
    setModalDescription(`Список отчетов ${label} риск в группе "${groupName}"`)
    setModalOpen(true)
  }

  // Обработчик для клика на бейдж измерения
  const handleMeasurementBadgeClick = (
    groupId: number,
    groupName: string,
    measurementName: string,
    zoneType: 'green' | 'orange' | 'red',
    label: string,
    measurementTypeId: number
  ) => {
    const reports = getReportsByFilters({ groupId, measurementTypeId, zoneType })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${groupName} - ${measurementName} - ${zoneLabel}`)
    setModalDescription(`Список отчетов по измерению "${measurementName}" с ${label} риском в группе "${groupName}"`)
    setModalOpen(true)
  }

  // Обработчик для клика на бейдж культуры
  const handleCropBadgeClick = (
    groupId: number,
    groupName: string,
    measurementName: string,
    cropName: string,
    zoneType: 'green' | 'orange' | 'red',
    label: string,
    measurementTypeId: number,
    cropId: number
  ) => {
    const reports = getReportsByFilters({ groupId, measurementTypeId, cropId, zoneType })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${groupName} - ${measurementName} - ${cropName} - ${zoneLabel}`)
    setModalDescription(`Список отчетов по культуре "${cropName}" измерения "${measurementName}" с ${label} риском`)
    setModalOpen(true)
  }

  // Обработчик для клика на бейдж хозяйства
  const handleFarmBadgeClick = (
    groupId: number,
    groupName: string,
    measurementName: string,
    cropName: string,
    farmName: string,
    zoneType: 'green' | 'orange' | 'red',
    label: string,
    measurementTypeId: number,
    cropId: number,
    farmId: string
  ) => {
    const reports = getReportsByFilters({ groupId, measurementTypeId, cropId, farmId, zoneType })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${groupName} - ${measurementName} - ${cropName} - ${farmName} - ${zoneLabel}`)
    setModalDescription(`Список отчетов по хозяйству "${farmName}" с ${label} риском`)
    setModalOpen(true)
  }

  // Обработчик для клика на бейдж поля (с фильтрацией по измерению и зоне)
    const handleFieldBadgeClick = (
      fieldName: string,
      zoneType: 'green' | 'orange' | 'red',
      label: string,
      fieldId: number,
      measurementTypeId: number,
      measurementName: string
    ) => {
      // Используем унифицированную функцию getReportsByFilters с правильными параметрами
      const reports = getReportsByFilters({ 
        fieldId, 
        measurementTypeId, 
        zoneType 
      })
      
      // Добавляем measurement_type_name к каждому отчету
      const reportsWithMeasurementName = reports.map(report => ({
        ...report,
        measurement_type_name: measurementName
      }))
      
      setModalReports(reportsWithMeasurementName)
      setModalTitle(`Поле "${fieldName}" - ${measurementName}`)
      setModalDescription(`Список отчетов по полю "${fieldName}" для измерения "${measurementName}" с ${label} риском`)
      setModalOpen(true)
    }

  // Агрегируем данные по группам шаблонов, измерениям, культурам, хозяйствам и полям
  const aggregatedData = useMemo(() => {
    if (!templates || !templateGroups || !templateGroupNames) {
      return []
    }

    // Группируем шаблоны по группам
    const templateGroupsMap = new Map<number, TemplateData[]>()
    
    templates.forEach(template => {
      const groupId = templateGroups.find((tg: TemplateGroup) => tg.scout_report_template_id === template.template_id)?.template_group_id || 0
      if (!templateGroupsMap.has(groupId)) {
        templateGroupsMap.set(groupId, [])
      }
      templateGroupsMap.get(groupId)!.push(template)
    })
    
    // Собираем данные по иерархии: Группа -> Измерения -> Культуры -> Хозяйства -> Поля -> Отчеты
    const result: Array<{
      id: number
      name: string
      stats: { green: number; orange: number; red: number; total: number }
      measurements: Map<number, {
        measurement_type_id: number
        human_name: string
        stats: { green: number; orange: number; red: number; total: number }
        crops: Map<number, {
          crop_id: number
          crop_name: string
          stats: { green: number; orange: number; red: number; total: number }
          farms: Map<string, {
            farm_id: string
            farm_name: string
            stats: { green: number; orange: number; red: number; total: number }
            fields: Map<number, {
              field_id: number
              field_name: string
              stats: { green: number; orange: number; red: number; total: number }
              reports: ReportMeasurement[]
            }>
          }>
        }>
      }>
    }> = []
    
    for (const [groupId, groupTemplates] of templateGroupsMap) {
      const groupName = groupId === 0 ? 'Без группы' : templateGroupNames.find((g: TemplateGroupName) => g.id === groupId)?.template_group_name || 'Неизвестная группа'
      
      const groupStats = { green: 0, orange: 0, red: 0, total: 0 }
      const measurementsMap = new Map()
      
      groupTemplates.forEach(template => {
        groupStats.green += template.stats.green
        groupStats.orange += template.stats.orange
        groupStats.red += template.stats.red
        groupStats.total += template.stats.total
        
        template.measurements?.forEach(measurement => {
          if (!measurementsMap.has(measurement.measurement_type_id)) {
            measurementsMap.set(measurement.measurement_type_id, {
              measurement_type_id: measurement.measurement_type_id,
              human_name: measurement.human_name,
              stats: { green: 0, orange: 0, red: 0, total: 0 },
              crops: new Map()
            })
          }
          
          const measurementData = measurementsMap.get(measurement.measurement_type_id)
          
          measurementData.stats.green += measurement.stats.green
          measurementData.stats.orange += measurement.stats.orange
          measurementData.stats.red += measurement.stats.red
          measurementData.stats.total += measurement.stats.total
          
          measurement.crops?.forEach(crop => {
            if (!measurementData.crops.has(crop.crop_id)) {
              measurementData.crops.set(crop.crop_id, {
                crop_id: crop.crop_id,
                crop_name: crop.crop_name,
                stats: { green: 0, orange: 0, red: 0, total: 0 },
                farms: new Map()
              })
            }
            
            const cropData = measurementData.crops.get(crop.crop_id)
            
            cropData.stats.green += crop.stats.green
            cropData.stats.orange += crop.stats.orange
            cropData.stats.red += crop.stats.red
            cropData.stats.total += crop.stats.total
            
            crop.farms?.forEach(farm => {
              if (!cropData.farms.has(farm.farm_id)) {
                cropData.farms.set(farm.farm_id, {
                  farm_id: farm.farm_id,
                  farm_name: farm.farm_name,
                  stats: { green: 0, orange: 0, red: 0, total: 0 },
                  fields: new Map()
                })
              }
              
              const farmData = cropData.farms.get(farm.farm_id)
              
              farmData.stats.green += farm.stats.green
              farmData.stats.orange += farm.stats.orange
              farmData.stats.red += farm.stats.red
              farmData.stats.total += farm.stats.total
              
              farm.fields?.forEach(field => {
                if (!farmData.fields.has(field.field_id)) {
                  farmData.fields.set(field.field_id, {
                    field_id: field.field_id,
                    field_name: field.field_name,
                    stats: { green: 0, orange: 0, red: 0, total: 0 },
                    reports: []
                  })
                }
                
                const fieldData = farmData.fields.get(field.field_id)
                
                fieldData.stats.green += field.stats.green
                fieldData.stats.orange += field.stats.orange
                fieldData.stats.red += field.stats.red
                fieldData.stats.total += field.stats.total
                
                field.reports?.forEach((report: ReportMeasurement) => {
                  const reportExists = fieldData.reports.some(
                    (r: ReportMeasurement) => r.scout_report_id === report.scout_report_id
                  )
                  if (!reportExists) {
                    fieldData.reports.push(report)
                  }
                })
              })
            })
          })
        })
      })
      
      result.push({
        id: groupId,
        name: groupName,
        stats: groupStats,
        measurements: measurementsMap
      })
    }
    
    return result
  }, [templates, templateGroups, templateGroupNames])

  // Получаем название группы культур для культуры
  const getCropGroupName = (cropId: number) => {
    const groupId = cropGroups.find((cg: CropGroup) => cg.crop_id === cropId)?.crop_group_id
    if (!groupId) return null
    return cropGroupNames.find((gn: CropGroupName) => gn.id === groupId)?.crop_group_name
  }

  // Статистика для футера (уникальные значения)
const footerStats = useMemo(() => {
  const measurementsSet = new Set<number>()
  const cropsSet = new Set<number>()
  const farmsSet = new Set<string>()
  const fieldsSet = new Set<number>()
  
  aggregatedData.forEach(group => {
    group.measurements.forEach(measurement => {
      measurementsSet.add(measurement.measurement_type_id)
      
      measurement.crops.forEach(crop => {
        cropsSet.add(crop.crop_id)
        
        crop.farms.forEach(farm => {
          farmsSet.add(farm.farm_id)
          
          farm.fields.forEach(field => {
            fieldsSet.add(field.field_id)
          })
        })
      })
    })
  })
  
  return {
    groups: aggregatedData.length,
    measurements: measurementsSet.size,
    crops: cropsSet.size,
    farms: farmsSet.size,
    fields: fieldsSet.size
  }
}, [aggregatedData])

  return (
    <>
      <div className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/20 dark:shadow-stone-950/30 overflow-hidden">
        
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800 border-b border-stone-200 dark:border-stone-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Анализ рисков по группам шаблонов
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                Распределение отчетов по зонам риска (зеленая ✅, оранжевая ⚠️, красная ❌)
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-stone-600 dark:text-stone-400">Низкий риск</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-stone-600 dark:text-stone-400">Средний риск</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-stone-600 dark:text-stone-400">Высокий риск</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[800px] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Группа шаблонов / Измерение / Культура / Хозяйство / Поле
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Распределение по зонам
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Всего отчетов
                </th>
               </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {aggregatedData.map((group, groupIndex) => (
                <React.Fragment key={group.id}>
                  {/* GROUP ROW */}
                  <tr className={`
                    group hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-all duration-200
                    ${groupIndex === 0 ? 'bg-white dark:bg-stone-950' : 'bg-white dark:bg-stone-950'}
                  `}>
                    <td className="px-4">
                      <button
                        onClick={() => onToggleGroup(group.id)}
                        className="p-1 rounded-md transition-all duration-200 
                                 hover:bg-stone-200 dark:hover:bg-stone-800
                                 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                      >
                        <div className={`transition-transform duration-200 ${
                          expandedGroups.has(group.id) ? "rotate-90" : ""
                        }`}>
                          <ChevronRight />
                        </div>
                      </button>
                     </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="font-semibold text-stone-900 dark:text-stone-100 text-lg">
                          {group.name}
                        </span>
                        <RiskBar {...group.stats} />
                      </div>
                     </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <ZoneBadge 
                          value={group.stats.green} 
                          total={group.stats.total}
                          color="text-emerald-600 dark:text-emerald-400" 
                          label="низкий"
                          icon="✅"
                          zoneType="green"
                          onBadgeClick={(zoneType, label) => handleGroupBadgeClick(group.id, group.name, zoneType, label)}
                        />
                        <ZoneBadge 
                          value={group.stats.orange} 
                          total={group.stats.total}
                          color="text-amber-600 dark:text-amber-400" 
                          label="средний"
                          icon="⚠️"
                          zoneType="orange"
                          onBadgeClick={(zoneType, label) => handleGroupBadgeClick(group.id, group.name, zoneType, label)}
                        />
                        <ZoneBadge 
                          value={group.stats.red} 
                          total={group.stats.total}
                          color="text-rose-600 dark:text-rose-400" 
                          label="высокий"
                          icon="❌"
                          zoneType="red"
                          onBadgeClick={(zoneType, label) => handleGroupBadgeClick(group.id, group.name, zoneType, label)}
                        />
                      </div>
                     </td>

                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                        {group.stats.total}
                      </span>
                     </td>
                   </tr>

                  {/* MEASUREMENTS внутри группы */}
                  {expandedGroups.has(group.id) && Array.from(group.measurements.values()).map((measurement) => (
                    <React.Fragment key={measurement.measurement_type_id}>
                      <tr className="bg-stone-50/60 dark:bg-stone-900/30 border-l-2 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-4 pl-8">
                          <button
                            onClick={() => onToggleMeasurement(measurement.measurement_type_id)}
                            className="p-1 rounded-md transition-all duration-200 
                                     hover:bg-stone-200 dark:hover:bg-stone-800
                                     text-stone-400"
                          >
                            <div className={`transition-transform duration-200 ${
                              expandedMeasurements.has(measurement.measurement_type_id) ? "rotate-90" : ""
                            }`}>
                              <ChevronRight />
                            </div>
                          </button>
                         </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-700 dark:text-stone-300 font-medium">
                              {measurement.human_name}
                            </span>
                          </div>
                         </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CompactZoneBadge 
                              value={measurement.stats.green} 
                              total={measurement.stats.total}
                              color="text-emerald-600 dark:text-emerald-400"
                              icon="✅"
                              zoneType="green"
                              onBadgeClick={(zoneType, label) => handleMeasurementBadgeClick(
                                group.id, 
                                group.name, 
                                measurement.human_name,
                                zoneType, 
                                label, 
                                measurement.measurement_type_id
                              )}
                            />
                            <CompactZoneBadge 
                              value={measurement.stats.orange} 
                              total={measurement.stats.total}
                              color="text-amber-600 dark:text-amber-400"
                              icon="⚠️"
                              zoneType="orange"
                              onBadgeClick={(zoneType, label) => handleMeasurementBadgeClick(
                                group.id, 
                                group.name, 
                                measurement.human_name,
                                zoneType, 
                                label, 
                                measurement.measurement_type_id
                              )}
                            />
                            <CompactZoneBadge 
                              value={measurement.stats.red} 
                              total={measurement.stats.total}
                              color="text-rose-600 dark:text-rose-400"
                              icon="❌"
                              zoneType="red"
                              onBadgeClick={(zoneType, label) => handleMeasurementBadgeClick(
                                group.id, 
                                group.name, 
                                measurement.human_name,
                                zoneType, 
                                label, 
                                measurement.measurement_type_id
                              )}
                            />
                          </div>
                         </td>

                        <td className="px-4 py-3 text-right">
                          <span className="text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                            {measurement.stats.total}
                          </span>
                         </td>
                       </tr>

                      {/* CROPS внутри измерения */}
                      {expandedMeasurements.has(measurement.measurement_type_id) && Array.from(measurement.crops.values()).map((crop) => (
                        <React.Fragment key={crop.crop_id}>
                          <tr className="bg-stone-100/50 dark:bg-stone-900/50 border-l-2 border-stone-300 dark:border-stone-600 hover:bg-stone-200/50 dark:hover:bg-stone-900/70 transition-colors">
                            <td className="px-4 pl-12">
                              <button
                                onClick={() => onToggleCrop(crop.crop_id)}
                                className="p-1 rounded-md transition-all duration-200 
                                         hover:bg-stone-200 dark:hover:bg-stone-800
                                         text-stone-400"
                              >
                                <div className={`transition-transform duration-200 ${
                                  expandedCrops.has(crop.crop_id) ? "rotate-90" : ""
                                }`}>
                                  <ChevronRight />
                                </div>
                              </button>
                             </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-stone-200 dark:bg-stone-700 rounded-full flex items-center justify-center text-xs font-medium text-stone-600 dark:text-stone-400">
                                  {crop.crop_name.charAt(0)}
                                </div>
                                <span className="text-stone-700 dark:text-stone-300">
                                  {crop.crop_name}
                                </span>
                                {getCropGroupName(crop.crop_id) && (
                                  <span className="text-xs text-stone-400 dark:text-stone-500 ml-2">
                                    ({getCropGroupName(crop.crop_id)})
                                  </span>
                                )}
                              </div>
                             </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CompactZoneBadge 
                                  value={crop.stats.green} 
                                  total={crop.stats.total}
                                  color="text-emerald-600 dark:text-emerald-400"
                                  icon="✅"
                                  zoneType="green"
                                  onBadgeClick={(zoneType, label) => handleCropBadgeClick(
                                    group.id, 
                                    group.name, 
                                    measurement.human_name,
                                    crop.crop_name,
                                    zoneType, 
                                    label, 
                                    measurement.measurement_type_id,
                                    crop.crop_id
                                  )}
                                />
                                <CompactZoneBadge 
                                  value={crop.stats.orange} 
                                  total={crop.stats.total}
                                  color="text-amber-600 dark:text-amber-400"
                                  icon="⚠️"
                                  zoneType="orange"
                                  onBadgeClick={(zoneType, label) => handleCropBadgeClick(
                                    group.id, 
                                    group.name, 
                                    measurement.human_name,
                                    crop.crop_name,
                                    zoneType, 
                                    label, 
                                    measurement.measurement_type_id,
                                    crop.crop_id
                                  )}
                                />
                                <CompactZoneBadge 
                                  value={crop.stats.red} 
                                  total={crop.stats.total}
                                  color="text-rose-600 dark:text-rose-400"
                                  icon="❌"
                                  zoneType="red"
                                  onBadgeClick={(zoneType, label) => handleCropBadgeClick(
                                    group.id, 
                                    group.name, 
                                    measurement.human_name,
                                    crop.crop_name,
                                    zoneType, 
                                    label, 
                                    measurement.measurement_type_id,
                                    crop.crop_id
                                  )}
                                />
                              </div>
                             </td>

                            <td className="px-4 py-3 text-right">
                              <span className="text-base font-semibold tabular-nums text-stone-700 dark:text-stone-300">
                                {crop.stats.total}
                              </span>
                             </td>
                           </tr>

                          {/* FARMS внутри культуры */}
                          {expandedCrops.has(crop.crop_id) && Array.from(crop.farms.values()).map((farm) => (
                            <React.Fragment key={farm.farm_id}>
                              <tr className="bg-stone-150/50 dark:bg-stone-800/30 border-l-2 border-stone-400 dark:border-stone-500 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors">
                                <td className="px-4 pl-16">
                                  <button
                                    onClick={() => onToggleFarm(farm.farm_id)}
                                    className="p-1 rounded-md transition-all duration-200 
                                             hover:bg-stone-200 dark:hover:bg-stone-800
                                             text-stone-400"
                                  >
                                    <div className={`transition-transform duration-200 ${
                                      expandedFarms.has(farm.farm_id) ? "rotate-90" : ""
                                    }`}>
                                      <ChevronRight />
                                    </div>
                                  </button>
                                 </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-stone-700 dark:text-stone-300">
                                      🏢 {farm.farm_name}
                                    </span>
                                  </div>
                                 </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <CompactZoneBadge 
                                      value={farm.stats.green} 
                                      total={farm.stats.total}
                                      color="text-emerald-600 dark:text-emerald-400"
                                      icon="✅"
                                      zoneType="green"
                                      onBadgeClick={(zoneType, label) => handleFarmBadgeClick(
                                        group.id,
                                        group.name,
                                        measurement.human_name,
                                        crop.crop_name,
                                        farm.farm_name,
                                        zoneType,
                                        label,
                                        measurement.measurement_type_id,
                                        crop.crop_id,
                                        farm.farm_id
                                      )}
                                    />
                                    <CompactZoneBadge 
                                      value={farm.stats.orange} 
                                      total={farm.stats.total}
                                      color="text-amber-600 dark:text-amber-400"
                                      icon="⚠️"
                                      zoneType="orange"
                                      onBadgeClick={(zoneType, label) => handleFarmBadgeClick(
                                        group.id,
                                        group.name,
                                        measurement.human_name,
                                        crop.crop_name,
                                        farm.farm_name,
                                        zoneType,
                                        label,
                                        measurement.measurement_type_id,
                                        crop.crop_id,
                                        farm.farm_id
                                      )}
                                    />
                                    <CompactZoneBadge 
                                      value={farm.stats.red} 
                                      total={farm.stats.total}
                                      color="text-rose-600 dark:text-rose-400"
                                      icon="❌"
                                      zoneType="red"
                                      onBadgeClick={(zoneType, label) => handleFarmBadgeClick(
                                        group.id,
                                        group.name,
                                        measurement.human_name,
                                        crop.crop_name,
                                        farm.farm_name,
                                        zoneType,
                                        label,
                                        measurement.measurement_type_id,
                                        crop.crop_id,
                                        farm.farm_id
                                      )}
                                    />
                                  </div>
                                  </td>

                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-semibold tabular-nums text-stone-600 dark:text-stone-400">
                                    {farm.stats.total}
                                  </span>
                                  </td>
                                </tr>

                              {/* FIELDS внутри хозяйства */}
                              {expandedFarms.has(farm.farm_id) && Array.from(farm.fields.values()).map((field) => (
                                <React.Fragment key={field.field_id}>
                                  <tr 
                                    className="bg-stone-200/50 dark:bg-stone-700/20 border-l-2 border-stone-400 dark:border-stone-500 hover:bg-stone-200/70 dark:hover:bg-stone-700/30 transition-colors" 
                                    
                                  >
                                    <td className="px-4 pl-20">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onToggleField(field.field_id)
                                        }}
                                        className="p-1 rounded-md transition-all duration-200 
                                                 hover:bg-stone-200 dark:hover:bg-stone-800
                                                 text-stone-400"
                                      >
                                        <div className={`transition-transform duration-200 ${
                                          expandedFields.has(field.field_id) ? "rotate-90" : ""
                                        }`}>
                                          <ChevronRight />
                                        </div>
                                      </button>
                                      </td>

                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-stone-700 dark:text-stone-300">
                                          📍 {field.field_name}
                                        </span>
                                      </div>
                                      </td>

                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <CompactZoneBadge 
                                          value={field.stats.green} 
                                          total={field.stats.total}
                                          color="text-emerald-600 dark:text-emerald-400"
                                          icon="✅"
                                          zoneType="green"
                                          onBadgeClick={(zoneType, label) => handleFieldBadgeClick(
                                            field.field_name,
                                            zoneType,
                                            label,
                                            field.field_id,
                                            measurement.measurement_type_id,
                                            measurement.human_name
                                          )}
                                        />
                                        <CompactZoneBadge 
                                          value={field.stats.orange} 
                                          total={field.stats.total}
                                          color="text-amber-600 dark:text-amber-400"
                                          icon="⚠️"
                                          zoneType="orange"
                                          onBadgeClick={(zoneType, label) => handleFieldBadgeClick(
                                            field.field_name,
                                            zoneType,
                                            label,
                                            field.field_id,
                                            measurement.measurement_type_id,
                                            measurement.human_name
                                          )}
                                        />
                                        <CompactZoneBadge 
                                          value={field.stats.red} 
                                          total={field.stats.total}
                                          color="text-rose-600 dark:text-rose-400"
                                          icon="❌"
                                          zoneType="red"
                                          onBadgeClick={(zoneType, label) => handleFieldBadgeClick(
                                            field.field_name,
                                            zoneType,
                                            label,
                                            field.field_id,
                                            measurement.measurement_type_id,
                                            measurement.human_name
                                          )}
                                        />
                                      </div>
                                      </td>

                                    <td className="px-4 py-3 text-right">
                                      <span className="text-sm font-semibold tabular-nums text-stone-600 dark:text-stone-400">
                                        {field.stats.total}
                                      </span>
                                      </td>
                                    </tr>

                                  {/* REPORTS внутри поля */}
                                  {expandedFields.has(field.field_id) && (
                                    <tr>
                                      <td colSpan={4} className="px-4 py-3 bg-stone-150/30 dark:bg-stone-800/20">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                          {field.reports.map((report: ReportMeasurement) => (
                                            <div
                                              key={report.scout_report_id}
                                              className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                                            >
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <a
                                                    href={`https://operations.cropwise.com/fields/${report.field_id}/scout_reports/${report.scout_report_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm inline-block truncate max-w-[200px]"
                                                  >
                                                    Отчет № {report.scout_report_id}
                                                  </a>
                                                </div>
                                                <span className={`
                                                  px-2.5 py-1 text-xs font-medium rounded-full text-white shadow-sm ml-2 shrink-0
                                                  ${report.zone === 'green' ? 'bg-emerald-500' :
                                                    report.zone === 'orange' ? 'bg-amber-500' : 'bg-rose-500'}
                                                `}>
                                                  {report.zone === 'green' ? 'Низкий' :
                                                   report.zone === 'orange' ? 'Средний' : 'Высокий'}
                                                </span>
                                              </div>
                                              <div className="mt-3 flex items-center justify-between">
                                                <span className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                                                  {report.value}
                                                </span>
                                                <span className="text-xs text-stone-400">значение</span>
                                              </div>
                                              {report.report_date && (
                                                <div className="mt-2 text-xs text-stone-400">
                                                  {new Date(report.report_date).toLocaleDateString('ru-RU')}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                          {field.reports.length === 0 && (
                                            <div className="col-span-full text-center py-8 text-stone-400 dark:text-stone-500">
                                              Нет отчетов для этого поля
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
              {aggregatedData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400 dark:text-stone-500">
                    Нет данных для отображения
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-stone-200 dark:border-stone-800 px-6 py-4 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-4">
              <span>Показаны</span>
              <span>📋 {footerStats.groups} групп шаблонов</span>
              <span>📏 {footerStats.measurements} измерений</span>
              <span>🌾 {footerStats.crops} культур</span>
              <span>🏢 {footerStats.farms} хозяйств</span>
              <span>📍 {footerStats.fields} полей</span>
            </div>
          </div>
        </div>
      </div>

      <ReportsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        reports={modalReports}
        title={modalTitle}
        description={modalDescription}
      />
    </>
  )
}

export default ScoutingTemplateTableNested