import React, { useMemo } from "react"
import { motion } from "framer-motion"
import ScoutingTemplateTableNested from "../Table/ScoutingTemplateTableNested"
import ScoutingFarmTable from "../Table/ScoutingFarmTable"
import ScoutingOverview from "../ScoutingOverview/ScoutingOverview"
import DateRangeSlider from "../DateRangeSlider/DateRangeSlider"
import type { TemplateData, MeasurementTypeData, CropData, FieldData, FarmData as TemplateFarmData } from "../../types/scoutingAggregated"
import type { FarmData, FarmTemplateGroupData, FarmCropData, FarmMeasurementTypeData, FarmFieldData } from "../../types/scoutingFarmAggregated"
import type { TemplateGroupName, TemplateGroup, CropGroup, CropGroupName } from "../../types/groups"
import ScoutingRiskChart from "../ScoutingRiskChart/ScoutingRiskChart"
import type { TabType } from "@/types/handbooks"

interface ScoutingTabsProps {
  templates: TemplateData[]
  farmData: FarmData[]
  templateGroups: TemplateGroup[]
  templateGroupNames: TemplateGroupName[]
  cropGroups: CropGroup[]
  cropGroupNames: CropGroupName[]
  season: number
  dateRange: { start: Date; end: Date }
  onDateRangeChange: (start: Date, end: Date) => void
  // Состояния для раскрытия в таблице шаблонов (новая структура с farms)
  expandedGroups: Set<number>
  expandedMeasurements: Set<number>
  expandedCrops: Set<number>
  expandedFarms: Set<string>
  expandedFields: Set<number>
  onToggleGroup: (id: number) => void
  onToggleMeasurement: (id: number) => void
  onToggleCrop: (id: number) => void
  onToggleFarm: (id: string) => void
  onToggleField: (id: number) => void
  // Состояния для раскрытия в таблице хозяйств (новая иерархия)
  expandedFarmsFarm: Set<string>
  expandedFarmTemplateGroups: Set<number>
  expandedFarmMeasurements: Set<number>
  expandedFarmCrops: Set<number>
  expandedFarmFields: Set<number>
  onToggleFarmFarm: (id: string) => void
  onToggleFarmTemplateGroup: (id: number) => void
  onToggleFarmMeasurement: (id: number) => void
  onToggleFarmCrop: (id: number) => void
  onToggleFarmField: (id: number) => void
  activeTab: TabType
  onActiveTabChange: (tab: TabType) => void
}

const ScoutingTabs: React.FC<ScoutingTabsProps> = ({
  templates,
  farmData,
  templateGroups,
  templateGroupNames,
  cropGroups,
  cropGroupNames,
  season,
  dateRange,
  onDateRangeChange,
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
  expandedFarmsFarm,
  expandedFarmTemplateGroups,
  expandedFarmMeasurements,
  expandedFarmCrops,
  expandedFarmFields,
  onToggleFarmFarm,
  onToggleFarmTemplateGroup,
  onToggleFarmMeasurement,
  onToggleFarmCrop,
  onToggleFarmField,
  activeTab,
  onActiveTabChange,
}) => {

  const tabs = useMemo(
    () => [
      { label: "По шаблонам", value: "templates" as TabType },
      { label: "По хозяйствам", value: "farms" as TabType },
      { label: "Статистика", value: "stats" as TabType },
    ],
    []
  )

  const activeIndex = tabs.findIndex((t) => t.value === activeTab)

  // Фильтруем шаблоны по дате с новой иерархией
  const filteredTemplates = useMemo((): TemplateData[] => {
    if (!templates.length) return []

    return templates
      .map(template => {
        const filteredTemplate: TemplateData = {
          template_id: template.template_id,
          template_name: template.template_name,
          stats: { green: 0, orange: 0, red: 0, total: 0 },
          measurements: []
        }

        filteredTemplate.measurements = template.measurements
          .map(measurement => {
            const filteredMeasurement: MeasurementTypeData = {
              measurement_type_id: measurement.measurement_type_id,
              human_name: measurement.human_name,
              stats: { green: 0, orange: 0, red: 0, total: 0 },
              crops: []
            }

            filteredMeasurement.crops = measurement.crops
              .map(crop => {
                const filteredCrop: CropData = {
                  crop_id: crop.crop_id,
                  crop_name: crop.crop_name,
                  stats: { green: 0, orange: 0, red: 0, total: 0 },
                  farms: []
                }

                filteredCrop.farms = crop.farms
                  .map(farm => {
                    const filteredFarm: TemplateFarmData = {
                      farm_id: farm.farm_id,
                      farm_name: farm.farm_name,
                      stats: { green: 0, orange: 0, red: 0, total: 0 },
                      fields: []
                    }

                    filteredFarm.fields = farm.fields
                      .map(field => {
                        const filteredField: FieldData = {
                          field_id: field.field_id,
                          field_name: field.field_name,
                          stats: { green: 0, orange: 0, red: 0, total: 0 },
                          reports: []
                        }

                        filteredField.reports = field.reports.filter(report => {
                          const reportDate = new Date(report.report_date)
                          return reportDate >= dateRange.start && reportDate <= dateRange.end
                        })

                        filteredField.stats = {
                          green: filteredField.reports.filter(r => r.zone === 'green').length,
                          orange: filteredField.reports.filter(r => r.zone === 'orange').length,
                          red: filteredField.reports.filter(r => r.zone === 'red').length,
                          total: filteredField.reports.length
                        }

                        return filteredField
                      })
                      .filter(field => field.reports.length > 0)

                    filteredFarm.stats = {
                      green: filteredFarm.fields.reduce((sum, f) => sum + f.stats.green, 0),
                      orange: filteredFarm.fields.reduce((sum, f) => sum + f.stats.orange, 0),
                      red: filteredFarm.fields.reduce((sum, f) => sum + f.stats.red, 0),
                      total: filteredFarm.fields.reduce((sum, f) => sum + f.stats.total, 0)
                    }

                    return filteredFarm
                  })
                  .filter(farm => farm.fields.length > 0)

                filteredCrop.stats = {
                  green: filteredCrop.farms.reduce((sum, f) => sum + f.stats.green, 0),
                  orange: filteredCrop.farms.reduce((sum, f) => sum + f.stats.orange, 0),
                  red: filteredCrop.farms.reduce((sum, f) => sum + f.stats.red, 0),
                  total: filteredCrop.farms.reduce((sum, f) => sum + f.stats.total, 0)
                }

                return filteredCrop
              })
              .filter(crop => crop.farms.length > 0)

            filteredMeasurement.stats = {
              green: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.green, 0),
              orange: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.orange, 0),
              red: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.red, 0),
              total: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.total, 0)
            }

            return filteredMeasurement
          })
          .filter(measurement => measurement.crops.length > 0)

        filteredTemplate.stats = {
          green: filteredTemplate.measurements.reduce((sum, m) => sum + m.stats.green, 0),
          orange: filteredTemplate.measurements.reduce((sum, m) => sum + m.stats.orange, 0),
          red: filteredTemplate.measurements.reduce((sum, m) => sum + m.stats.red, 0),
          total: filteredTemplate.measurements.reduce((sum, m) => sum + m.stats.total, 0)
        }

        return filteredTemplate
      })
      .filter(template => template.measurements.length > 0)
  }, [templates, dateRange])

  // Фильтруем данные по хозяйствам по дате (новая иерархия)
  const filteredFarmData = useMemo((): FarmData[] => {
    if (!farmData.length) return []
    
    const result: FarmData[] = []
    
    for (const farm of farmData) {
      const filteredFarm: FarmData = {
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        stats: { green: 0, orange: 0, red: 0, total: 0 },
        templateGroups: []
      }
      
      for (const templateGroup of farm.templateGroups) {
        const filteredTemplateGroup: FarmTemplateGroupData = {
          template_group_id: templateGroup.template_group_id,
          template_group_name: templateGroup.template_group_name,
          stats: { green: 0, orange: 0, red: 0, total: 0 },
          measurements: []
        }
        
        for (const measurement of templateGroup.measurements) {
          const filteredMeasurement: FarmMeasurementTypeData = {
            measurement_type_id: measurement.measurement_type_id,
            human_name: measurement.human_name,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            crops: []
          }
          
          for (const crop of measurement.crops) {
            const filteredCrop: FarmCropData = {
              crop_id: crop.crop_id,
              crop_name: crop.crop_name,
              stats: { green: 0, orange: 0, red: 0, total: 0 },
              fields: []
            }
            
            for (const field of crop.fields) {
              const filteredReports = field.reports.filter(report => {
                const reportDate = new Date(report.report_date)
                return reportDate >= dateRange.start && reportDate <= dateRange.end
              })
              
              if (filteredReports.length > 0) {
                const filteredField: FarmFieldData = {
                  field_id: field.field_id,
                  field_name: field.field_name,
                  field_group_name: field.field_group_name,
                  stats: {
                    green: filteredReports.filter(r => r.zone === 'green').length,
                    orange: filteredReports.filter(r => r.zone === 'orange').length,
                    red: filteredReports.filter(r => r.zone === 'red').length,
                    total: filteredReports.length
                  },
                  reports: filteredReports
                }
                filteredCrop.fields.push(filteredField)
              }
            }
            
            if (filteredCrop.fields.length > 0) {
              filteredCrop.stats = {
                green: filteredCrop.fields.reduce((sum, f) => sum + f.stats.green, 0),
                orange: filteredCrop.fields.reduce((sum, f) => sum + f.stats.orange, 0),
                red: filteredCrop.fields.reduce((sum, f) => sum + f.stats.red, 0),
                total: filteredCrop.fields.reduce((sum, f) => sum + f.stats.total, 0)
              }
              filteredMeasurement.crops.push(filteredCrop)
            }
          }
          
          if (filteredMeasurement.crops.length > 0) {
            filteredMeasurement.stats = {
              green: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.green, 0),
              orange: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.orange, 0),
              red: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.red, 0),
              total: filteredMeasurement.crops.reduce((sum, c) => sum + c.stats.total, 0)
            }
            filteredTemplateGroup.measurements.push(filteredMeasurement)
          }
        }
        
        if (filteredTemplateGroup.measurements.length > 0) {
          filteredTemplateGroup.stats = {
            green: filteredTemplateGroup.measurements.reduce((sum, m) => sum + m.stats.green, 0),
            orange: filteredTemplateGroup.measurements.reduce((sum, m) => sum + m.stats.orange, 0),
            red: filteredTemplateGroup.measurements.reduce((sum, m) => sum + m.stats.red, 0),
            total: filteredTemplateGroup.measurements.reduce((sum, m) => sum + m.stats.total, 0)
          }
          filteredFarm.templateGroups.push(filteredTemplateGroup)
        }
      }
      
      if (filteredFarm.templateGroups.length > 0) {
        filteredFarm.stats = {
          green: filteredFarm.templateGroups.reduce((sum, tg) => sum + tg.stats.green, 0),
          orange: filteredFarm.templateGroups.reduce((sum, tg) => sum + tg.stats.orange, 0),
          red: filteredFarm.templateGroups.reduce((sum, tg) => sum + tg.stats.red, 0),
          total: filteredFarm.templateGroups.reduce((sum, tg) => sum + tg.stats.total, 0)
        }
        result.push(filteredFarm)
      }
    }
    
    return result
  }, [farmData, dateRange])

  return (
    <div className="w-full space-y-8">
      {/* ====== Date Range Slider ====== */}
      <DateRangeSlider
        start={dateRange.start}
        end={dateRange.end}
        min={new Date(season, 0, 1)}
        max={new Date(season, 11, 31)}
        onChange={onDateRangeChange}
      />

      {/* ====== Overview всегда сверху ====== */}
      <ScoutingOverview templates={filteredTemplates} />

      {/* ====== Toggle Header ====== */}
      <div className="flex justify-center">
        <div className="relative inline-flex rounded-xl bg-stone-200 dark:bg-stone-800 p-1 shadow-inner w-full max-w-lg">
          <motion.div
            className="absolute top-1 bottom-1 rounded-lg bg-stone-500 shadow-md"
            layout
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              width: `calc(${100 / tabs.length}% - 0.5rem)`,
              left: `calc(${activeIndex * (100 / tabs.length)}% + 0.25rem)`,
            }}
          />

          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onActiveTabChange(tab.value)}
              className={`relative z-10 flex-1 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                activeTab === tab.value
                  ? "text-white"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
              }`}
              style={{ padding: "0.5rem 1rem" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ====== Контент ====== */}
      <div className="transition-opacity duration-300">
        {activeTab === "templates" && (
          <ScoutingTemplateTableNested
            templates={filteredTemplates}
            templateGroups={templateGroups}
            templateGroupNames={templateGroupNames}
            cropGroups={cropGroups}
            cropGroupNames={cropGroupNames}
            expandedGroups={expandedGroups}
            expandedMeasurements={expandedMeasurements}
            expandedCrops={expandedCrops}
            expandedFarms={expandedFarms}
            expandedFields={expandedFields}
            onToggleGroup={onToggleGroup}
            onToggleMeasurement={onToggleMeasurement}
            onToggleCrop={onToggleCrop}
            onToggleFarm={onToggleFarm}
            onToggleField={onToggleField}
          />
        )}

        {activeTab === "farms" && (
          <ScoutingFarmTable
            farms={filteredFarmData}
            expandedFarms={expandedFarmsFarm}
            expandedTemplateGroups={expandedFarmTemplateGroups}
            expandedMeasurements={expandedFarmMeasurements}
            expandedCrops={expandedFarmCrops}
            expandedFields={expandedFarmFields}
            onToggleFarm={onToggleFarmFarm}
            onToggleTemplateGroup={onToggleFarmTemplateGroup}
            onToggleMeasurement={onToggleFarmMeasurement}
            onToggleCrop={onToggleFarmCrop}
            onToggleField={onToggleFarmField}
          />
        )}

        {activeTab === "stats" && (
          <ScoutingRiskChart templates={filteredTemplates} />
        )}
      </div>
    </div>
  )
}

export default ScoutingTabs