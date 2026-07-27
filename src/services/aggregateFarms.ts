import type { ScoutReportItem, IndicatorsResponse, IndicatorMeasurement } from "../types/scoutingReport"
import type { FarmData } from "../types/scoutingFarmAggregated"
import type { TemplateGroup, CropGroup, TemplateGroupCropGroup, TemplateGroupName } from "../types/groups"

export function aggregateFarms(
  reports: ScoutReportItem[],
  indicators: IndicatorsResponse,
  templateGroups: TemplateGroup[],
  cropGroups: CropGroup[],
  templateGroupCropGroups: TemplateGroupCropGroup[],
  templateGroupNames: TemplateGroupName[]
): FarmData[] {
  
  const farmsMap = new Map<string, FarmData>()

  const getNumericValue = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return null
      const num = Number(trimmed)
      return isNaN(num) ? null : num
    }
    
    if (typeof value === 'number') {
      return isNaN(value) ? null : value
    }
    
    return null
  }

  const roundValue = (value: number): number => {
    return Number(value.toFixed(2))
  }

  // Маппинг: template -> [groups]
  const templateToGroupsMap = new Map<number, number[]>()
  templateGroups.forEach(tg => {
    const arr = templateToGroupsMap.get(tg.scout_report_template_id) || []
    arr.push(tg.template_group_id)
    templateToGroupsMap.set(tg.scout_report_template_id, arr)
  })

  // Маппинг: crop -> [groups]
  const cropToGroupsMap = new Map<number, number[]>()
  cropGroups.forEach(cg => {
    const arr = cropToGroupsMap.get(cg.crop_id) || []
    arr.push(cg.crop_group_id)
    cropToGroupsMap.set(cg.crop_id, arr)
  })

  // Set валидных пар
  const validPairs = new Set<string>()
  templateGroupCropGroups.forEach(tgcg => {
    validPairs.add(`${tgcg.template_group_id}_${tgcg.crop_group_id}`)
  })

  reports.forEach(report => {
    const templateId = report.scout_report_template_id
    const templateName = report.scout_report_template_name
    const cropId = report.crop_id
    const cropName = report.crop_name
    const fieldId = report.field_id
    const fieldName = report.field_name
    const fieldGroupName = report.field_group_name || null

    const farmId = fieldGroupName || `field_${fieldId}`
    const farmName = fieldGroupName || fieldName

    // Получаем группы для шаблона и культуры
    const templateGroupIds = templateToGroupsMap.get(templateId) || []
    const cropGroupIds = cropToGroupsMap.get(cropId) || []

    if (templateGroupIds.length === 0 || cropGroupIds.length === 0) {
      return
    }

    // Ищем подходящую пару групп
    let matchedTemplateGroupId: number | null = null
    // let matchedCropGroupId: number | null = null
    let cropGroupData: IndicatorMeasurement | null = null

    for (const tgId of templateGroupIds) {
      for (const cgId of cropGroupIds) {
        const pairKey = `${tgId}_${cgId}`

        if (!validPairs.has(pairKey)) continue

        const templateGroupData = indicators[tgId.toString()]
        const data = templateGroupData?.[cgId.toString()]

        if (data) {
          matchedTemplateGroupId = tgId
          // matchedCropGroupId = cgId
          cropGroupData = data
          break
        }
      }
      if (cropGroupData) break
    }

    if (!cropGroupData || !matchedTemplateGroupId) {
      return
    }

    // Получаем название группы шаблонов
    const templateGroupName = templateGroupNames.find(
      (g: TemplateGroupName) => g.id === matchedTemplateGroupId
    )?.template_group_name || `Группа ${matchedTemplateGroupId}`

    // Инициализируем хозяйство
    if (!farmsMap.has(farmId)) {
      farmsMap.set(farmId, {
        farm_id: farmId,
        farm_name: farmName,
        stats: { green: 0, orange: 0, red: 0, total: 0 },
        templateGroups: []
      })
    }

    const farm = farmsMap.get(farmId)!

    // Находим или создаем группу шаблонов в хозяйстве
    let templateGroup = farm.templateGroups.find(
      tg => tg.template_group_id === matchedTemplateGroupId
    )
    if (!templateGroup) {
      templateGroup = {
        template_group_id: matchedTemplateGroupId,
        template_group_name: templateGroupName,
        stats: { green: 0, orange: 0, red: 0, total: 0 },
        measurements: []
      }
      farm.templateGroups.push(templateGroup)
    }

    // Обрабатываем измерения
    Object.values(report.scout_report_point).forEach(measurements => {
      measurements.forEach(measurement => {
        const numericValue = getNumericValue(measurement.measurement_value)
        
        if (numericValue === null) {
          return
        }

        const measurementTypeId = measurement.scout_report_measurement_type_id
        const zones = cropGroupData[measurementTypeId.toString()]

        if (!zones || zones.length === 0) return

        const roundedValue = roundValue(numericValue)

        let currentZone: 'green' | 'orange' | 'red' = zones[0].zone
        for (let i = zones.length - 1; i >= 0; i--) {
          if (roundedValue >= zones[i].threshold_value) {
            currentZone = zones[i].zone
            break
          }
        }

        // Обновляем статистику
        farm.stats[currentZone]++
        farm.stats.total++
        templateGroup.stats[currentZone]++
        templateGroup.stats.total++

        // Находим или создаем измерение в группе шаблонов
        let measurementType = templateGroup.measurements.find(
          m => m.measurement_type_id === measurementTypeId
        )

        if (!measurementType) {
          measurementType = {
            measurement_type_id: measurementTypeId,
            human_name: measurement.human_name,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            crops: []
          }
          templateGroup.measurements.push(measurementType)
        }

        measurementType.stats[currentZone]++
        measurementType.stats.total++

        // Находим или создаем культуру в измерении
        let crop = measurementType.crops.find(c => c.crop_id === cropId)

        if (!crop) {
          crop = {
            crop_id: cropId,
            crop_name: cropName,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            fields: []
          }
          measurementType.crops.push(crop)
        }

        crop.stats[currentZone]++
        crop.stats.total++

        // Находим или создаем поле в культуре
        let field = crop.fields.find(f => f.field_id === fieldId)

        if (!field) {
          field = {
            field_id: fieldId,
            field_name: fieldName,
            field_group_name: fieldGroupName,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            reports: []
          }
          crop.fields.push(field)
        }

        field.stats[currentZone]++
        field.stats.total++

        // Добавляем отчет
        field.reports.push({
          field_id: fieldId,
          field_name: fieldName,
          scout_report_id: report.scout_report_id,
          value: roundedValue,
          zone: currentZone,
          report_date: report.report_date,
          measurement_type_id: measurementTypeId,
          measurement_type_name: measurement.human_name,
          template_id: templateId,
          template_name: templateName,
          crop_id: cropId,
          crop_name: cropName
        })
      })
    })
  })

  // Сортируем данные
  for (const farm of farmsMap.values()) {
    farm.templateGroups.sort((a, b) => a.template_group_name.localeCompare(b.template_group_name))
    for (const tg of farm.templateGroups) {
      tg.measurements.sort((a, b) => a.human_name.localeCompare(b.human_name))
      for (const m of tg.measurements) {
        m.crops.sort((a, b) => a.crop_name.localeCompare(b.crop_name))
        for (const c of m.crops) {
          c.fields.sort((a, b) => a.field_name.localeCompare(b.field_name))
        }
      }
    }
  }

  return Array.from(farmsMap.values())
}
