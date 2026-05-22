import React, { useState, useMemo } from "react"
import type { FarmData, FarmReportMeasurement, FarmTemplateGroupData, FarmMeasurementTypeData, FarmCropData, FarmFieldData } from "../../types/scoutingFarmAggregated"
import ReportsModal from "../ScoutingOverview/ReportsModal"

interface Props {
  farms: FarmData[];
  expandedFarms: Set<string>;
  expandedTemplateGroups: Set<number>;
  expandedMeasurements: Set<number>;
  expandedCrops: Set<number>;
  expandedFields: Set<number>;
  onToggleFarm: (id: string) => void;
  onToggleTemplateGroup: (id: number) => void;
  onToggleMeasurement: (id: number) => void;
  onToggleCrop: (id: number) => void;
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
      onClick={(e) => {
        e.stopPropagation()
        onBadgeClick(zoneType, label)
      }}
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

const ScoutingFarmTable: React.FC<Props> = ({ 
  farms, 
  expandedFarms,
  expandedTemplateGroups,
  expandedMeasurements,
  expandedCrops,
  expandedFields,
  onToggleFarm,
  onToggleTemplateGroup,
  onToggleMeasurement,
  onToggleCrop,
  onToggleField,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalReports, setModalReports] = useState<FarmReportMeasurement[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [modalDescription, setModalDescription] = useState('')

  // Универсальная функция для сбора отчетов по фильтрам
  const getReportsByFilters = (filters: {
    farmId?: string
    templateGroupId?: number
    measurementTypeId?: number
    cropId?: number
    fieldId?: number
    zoneType?: 'green' | 'orange' | 'red'
  }) => {
    const reports: FarmReportMeasurement[] = []
    
    farms.forEach(farm => {
      if (filters.farmId && farm.farm_id !== filters.farmId) return
      
      farm.templateGroups?.forEach(templateGroup => {
        if (filters.templateGroupId && templateGroup.template_group_id !== filters.templateGroupId) return
        
        templateGroup.measurements?.forEach(measurement => {
          if (filters.measurementTypeId && measurement.measurement_type_id !== filters.measurementTypeId) return
          
          measurement.crops?.forEach(crop => {
            if (filters.cropId && crop.crop_id !== filters.cropId) return
            
            crop.fields?.forEach(field => {
              if (filters.fieldId && field.field_id !== filters.fieldId) return
              
              field.reports?.forEach(report => {
                if (filters.zoneType && report.zone !== filters.zoneType) return
                reports.push(report)
              })
            })
          })
        })
      })
    })
    
    return reports
  }

  // Обработчики для бейджей
  const handleFarmBadgeClick = (farm: FarmData, zoneType: 'green' | 'orange' | 'red', label: string) => {
    const reports = getReportsByFilters({ farmId: farm.farm_id, zoneType })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${farm.farm_name} - ${zoneLabel}`)
    setModalDescription(`Список отчетов ${label} риск в хозяйстве "${farm.farm_name}"`)
    setModalOpen(true)
  }

  const handleTemplateGroupBadgeClick = (
    farm: FarmData,
    templateGroup: FarmTemplateGroupData,
    zoneType: 'green' | 'orange' | 'red',
    label: string
  ) => {
    const reports = getReportsByFilters({ 
      farmId: farm.farm_id, 
      templateGroupId: templateGroup.template_group_id, 
      zoneType 
    })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${farm.farm_name} - ${templateGroup.template_group_name} - ${zoneLabel}`)
    setModalDescription(`Список отчетов ${label} риск в группе "${templateGroup.template_group_name}"`)
    setModalOpen(true)
  }

  const handleMeasurementBadgeClick = (
    farm: FarmData,
    templateGroup: FarmTemplateGroupData,
    measurement: FarmMeasurementTypeData,
    zoneType: 'green' | 'orange' | 'red',
    label: string
  ) => {
    const reports = getReportsByFilters({ 
      farmId: farm.farm_id, 
      templateGroupId: templateGroup.template_group_id,
      measurementTypeId: measurement.measurement_type_id,
      zoneType 
    })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${farm.farm_name} - ${templateGroup.template_group_name} - ${measurement.human_name} - ${zoneLabel}`)
    setModalDescription(`Список отчетов по измерению "${measurement.human_name}" с ${label} риском`)
    setModalOpen(true)
  }

  const handleCropBadgeClick = (
    farm: FarmData,
    templateGroup: FarmTemplateGroupData,
    measurement: FarmMeasurementTypeData,
    crop: FarmCropData,
    zoneType: 'green' | 'orange' | 'red',
    label: string
  ) => {
    const reports = getReportsByFilters({ 
      farmId: farm.farm_id, 
      templateGroupId: templateGroup.template_group_id,
      measurementTypeId: measurement.measurement_type_id,
      cropId: crop.crop_id,
      zoneType 
    })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${farm.farm_name} - ${templateGroup.template_group_name} - ${measurement.human_name} - ${crop.crop_name} - ${zoneLabel}`)
    setModalDescription(`Список отчетов по культуре "${crop.crop_name}" с ${label} риском`)
    setModalOpen(true)
  }

  const handleFieldBadgeClick = (
    farm: FarmData,
    templateGroup: FarmTemplateGroupData,
    measurement: FarmMeasurementTypeData,
    crop: FarmCropData,
    field: FarmFieldData,
    zoneType: 'green' | 'orange' | 'red',
    label: string
  ) => {
    const reports = getReportsByFilters({ 
      farmId: farm.farm_id, 
      templateGroupId: templateGroup.template_group_id,
      measurementTypeId: measurement.measurement_type_id,
      cropId: crop.crop_id,
      fieldId: field.field_id,
      zoneType 
    })
    const zoneLabel = zoneType === 'green' ? 'Низкий риск' : zoneType === 'orange' ? 'Средний риск' : 'Высокий риск'
    
    setModalReports(reports)
    setModalTitle(`${farm.farm_name} - ${templateGroup.template_group_name} - ${measurement.human_name} - ${crop.crop_name} - ${field.field_name} - ${zoneLabel}`)
    setModalDescription(`Список отчетов по полю "${field.field_name}" с ${label} риском`)
    setModalOpen(true)
  }

  // Внутри компонента ScoutingFarmTable, перед return

// Статистика для футера (уникальные значения)
const footerStats = useMemo(() => {
  const templateGroupsSet = new Set<number>()
  const measurementsSet = new Set<number>()
  const cropsSet = new Set<number>()
  const fieldsSet = new Set<number>()
  
  farms.forEach(farm => {
    farm.templateGroups?.forEach(templateGroup => {
      templateGroupsSet.add(templateGroup.template_group_id)
      
      templateGroup.measurements?.forEach(measurement => {
        measurementsSet.add(measurement.measurement_type_id)
        
        measurement.crops?.forEach(crop => {
          cropsSet.add(crop.crop_id)
          
          crop.fields?.forEach(field => {
            fieldsSet.add(field.field_id)
          })
        })
      })
    })
  })
  
  return {
    farms: farms.length,
    templateGroups: templateGroupsSet.size,
    measurements: measurementsSet.size,
    crops: cropsSet.size,
    fields: fieldsSet.size
  }
}, [farms])

  return (
    <>
      <div className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/20 dark:shadow-stone-950/30 overflow-hidden">
        
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800 border-b border-stone-200 dark:border-stone-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Анализ рисков по хозяйствам
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
                  Хозяйство / Группа / Измерение / Культура / Поле
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
              {farms.map((farm, farmIndex) => (
                <React.Fragment key={farm.farm_id}>
                  {/* FARM ROW */}
                  <tr className={`
                    group hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-all duration-200
                    ${farmIndex === 0 ? 'bg-white dark:bg-stone-950' : 'bg-white dark:bg-stone-950'}
                  `}>
                    <td className="px-4">
                      <button
                        onClick={() => onToggleFarm(farm.farm_id)}
                        className="p-1 rounded-md transition-all duration-200 
                                 hover:bg-stone-200 dark:hover:bg-stone-800
                                 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                      >
                        <div className={`transition-transform duration-200 ${
                          expandedFarms.has(farm.farm_id) ? "rotate-90" : ""
                        }`}>
                          <ChevronRight />
                        </div>
                      </button>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="font-semibold text-stone-900 dark:text-stone-100 text-lg">
                          {farm.farm_name}
                        </span>
                        <RiskBar {...farm.stats} />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <ZoneBadge 
                          value={farm.stats.green} 
                          total={farm.stats.total}
                          color="text-emerald-600 dark:text-emerald-400" 
                          label="низкий"
                          icon="✅"
                          zoneType="green"
                          onBadgeClick={(zoneType, label) => handleFarmBadgeClick(farm, zoneType, label)}
                        />
                        <ZoneBadge 
                          value={farm.stats.orange} 
                          total={farm.stats.total}
                          color="text-amber-600 dark:text-amber-400" 
                          label="средний"
                          icon="⚠️"
                          zoneType="orange"
                          onBadgeClick={(zoneType, label) => handleFarmBadgeClick(farm, zoneType, label)}
                        />
                        <ZoneBadge 
                          value={farm.stats.red} 
                          total={farm.stats.total}
                          color="text-rose-600 dark:text-rose-400" 
                          label="высокий"
                          icon="❌"
                          zoneType="red"
                          onBadgeClick={(zoneType, label) => handleFarmBadgeClick(farm, zoneType, label)}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                        {farm.stats.total}
                      </span>
                    </td>
                  </tr>

                  {/* TEMPLATE GROUPS внутри хозяйства */}
                  {expandedFarms.has(farm.farm_id) && farm.templateGroups?.map((templateGroup) => (
                    <React.Fragment key={templateGroup.template_group_id}>
                      <tr className="bg-stone-50/60 dark:bg-stone-900/30 border-l-2 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-900/50 transition-colors">
                        <td className="px-4 pl-8">
                          <button
                            onClick={() => onToggleTemplateGroup(templateGroup.template_group_id)}
                            className="p-1 rounded-md transition-all duration-200 
                                     hover:bg-stone-200 dark:hover:bg-stone-800
                                     text-stone-400"
                          >
                            <div className={`transition-transform duration-200 ${
                              expandedTemplateGroups.has(templateGroup.template_group_id) ? "rotate-90" : ""
                            }`}>
                              <ChevronRight />
                            </div>
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-stone-700 dark:text-stone-300 font-medium">
                            {templateGroup.template_group_name}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CompactZoneBadge 
                              value={templateGroup.stats.green} 
                              total={templateGroup.stats.total}
                              color="text-emerald-600 dark:text-emerald-400"
                              icon="✅"
                              zoneType="green"
                              onBadgeClick={(zoneType, label) => handleTemplateGroupBadgeClick(farm, templateGroup, zoneType, label)}
                            />
                            <CompactZoneBadge 
                              value={templateGroup.stats.orange} 
                              total={templateGroup.stats.total}
                              color="text-amber-600 dark:text-amber-400"
                              icon="⚠️"
                              zoneType="orange"
                              onBadgeClick={(zoneType, label) => handleTemplateGroupBadgeClick(farm, templateGroup, zoneType, label)}
                            />
                            <CompactZoneBadge 
                              value={templateGroup.stats.red} 
                              total={templateGroup.stats.total}
                              color="text-rose-600 dark:text-rose-400"
                              icon="❌"
                              zoneType="red"
                              onBadgeClick={(zoneType, label) => handleTemplateGroupBadgeClick(farm, templateGroup, zoneType, label)}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                            {templateGroup.stats.total}
                          </span>
                        </td>
                      </tr>

                      {/* MEASUREMENTS внутри группы */}
                      {expandedTemplateGroups.has(templateGroup.template_group_id) && templateGroup.measurements?.map((measurement) => (
                        <React.Fragment key={measurement.measurement_type_id}>
                          <tr className="bg-stone-100/50 dark:bg-stone-900/50 border-l-2 border-stone-300 dark:border-stone-600 hover:bg-stone-200/50 dark:hover:bg-stone-900/70 transition-colors">
                            <td className="px-4 pl-12">
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
                              <span className="text-stone-700 dark:text-stone-300">
                                {measurement.human_name}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CompactZoneBadge 
                                  value={measurement.stats.green} 
                                  total={measurement.stats.total}
                                  color="text-emerald-600 dark:text-emerald-400"
                                  icon="✅"
                                  zoneType="green"
                                  onBadgeClick={(zoneType, label) => handleMeasurementBadgeClick(farm, templateGroup, measurement, zoneType, label)}
                                />
                                <CompactZoneBadge 
                                  value={measurement.stats.orange} 
                                  total={measurement.stats.total}
                                  color="text-amber-600 dark:text-amber-400"
                                  icon="⚠️"
                                  zoneType="orange"
                                  onBadgeClick={(zoneType, label) => handleMeasurementBadgeClick(farm, templateGroup, measurement, zoneType, label)}
                                />
                                <CompactZoneBadge 
                                  value={measurement.stats.red} 
                                  total={measurement.stats.total}
                                  color="text-rose-600 dark:text-rose-400"
                                  icon="❌"
                                  zoneType="red"
                                  onBadgeClick={(zoneType, label) => handleMeasurementBadgeClick(farm, templateGroup, measurement, zoneType, label)}
                                />
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <span className="text-base font-semibold tabular-nums text-stone-700 dark:text-stone-300">
                                {measurement.stats.total}
                              </span>
                            </td>
                          </tr>

                          {/* CROPS внутри измерения */}
                          {expandedMeasurements.has(measurement.measurement_type_id) && measurement.crops?.map((crop) => (
                            <React.Fragment key={crop.crop_id}>
                              <tr className="bg-stone-150/50 dark:bg-stone-800/30 border-l-2 border-stone-400 dark:border-stone-500 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors">
                                <td className="px-4 pl-16">
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
                                      onBadgeClick={(zoneType, label) => handleCropBadgeClick(farm, templateGroup, measurement, crop, zoneType, label)}
                                    />
                                    <CompactZoneBadge 
                                      value={crop.stats.orange} 
                                      total={crop.stats.total}
                                      color="text-amber-600 dark:text-amber-400"
                                      icon="⚠️"
                                      zoneType="orange"
                                      onBadgeClick={(zoneType, label) => handleCropBadgeClick(farm, templateGroup, measurement, crop, zoneType, label)}
                                    />
                                    <CompactZoneBadge 
                                      value={crop.stats.red} 
                                      total={crop.stats.total}
                                      color="text-rose-600 dark:text-rose-400"
                                      icon="❌"
                                      zoneType="red"
                                      onBadgeClick={(zoneType, label) => handleCropBadgeClick(farm, templateGroup, measurement, crop, zoneType, label)}
                                    />
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-semibold tabular-nums text-stone-600 dark:text-stone-400">
                                    {crop.stats.total}
                                  </span>
                                </td>
                              </tr>

                              {/* FIELDS внутри культуры */}
                              {expandedCrops.has(crop.crop_id) && crop.fields?.map((field) => (
                                <React.Fragment key={field.field_id}>
                                  <tr className="bg-stone-200/50 dark:bg-stone-700/20 border-l-2 border-stone-400 dark:border-stone-500 hover:bg-stone-200/70 dark:hover:bg-stone-700/30 transition-colors">
                                    <td className="px-4 pl-20">
                                      <button
                                        onClick={() => onToggleField(field.field_id)}
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
                                          onBadgeClick={(zoneType, label) => handleFieldBadgeClick(farm, templateGroup, measurement, crop, field, zoneType, label)}
                                        />
                                        <CompactZoneBadge 
                                          value={field.stats.orange} 
                                          total={field.stats.total}
                                          color="text-amber-600 dark:text-amber-400"
                                          icon="⚠️"
                                          zoneType="orange"
                                          onBadgeClick={(zoneType, label) => handleFieldBadgeClick(farm, templateGroup, measurement, crop, field, zoneType, label)}
                                        />
                                        <CompactZoneBadge 
                                          value={field.stats.red} 
                                          total={field.stats.total}
                                          color="text-rose-600 dark:text-rose-400"
                                          icon="❌"
                                          zoneType="red"
                                          onBadgeClick={(zoneType, label) => handleFieldBadgeClick(farm, templateGroup, measurement, crop, field, zoneType, label)}
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
                                          {field.reports.map((report) => (
                                            <div
                                              key={`${report.scout_report_id}-${report.measurement_type_id}`}
                                              className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                                            >
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <h4 className="font-medium text-stone-900 dark:text-stone-100">
                                                    {report.field_name}
                                                  </h4>
                                                  <a
                                                    href={`https://operations.cropwise.com/fields/${report.field_id}/scout_reports/${report.scout_report_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                                                  >
                                                    Отчет № {report.scout_report_id}
                                                  </a>
                                                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                                    Шаблон: {report.template_name}
                                                  </p>
                                                </div>
                                                <span className={`
                                                  px-2.5 py-1 text-xs font-medium rounded-full text-white shadow-sm
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
            </tbody>
          </table>
        </div>

        <div className="border-t border-stone-200 dark:border-stone-800 px-6 py-4 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-4">
              <span>Показаны</span>
              <span>🏢 {footerStats.farms} хозяйств</span>
              <span>📋 {footerStats.templateGroups} групп шаблонов</span>
              <span>📏 {footerStats.measurements} измерений</span>
              <span>🌾 {footerStats.crops} культур</span>
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

export default ScoutingFarmTable