import type { ScoutReportItem, IndicatorsResponse } from "../types/scoutingReport"
import type { TemplateData } from "../types/scoutingAggregated"
import type { TemplateGroup, CropGroup, TemplateGroupCropGroup } from "../types/groups"


export function aggregateTemplates(
  reports: ScoutReportItem[],
  indicators: IndicatorsResponse,
  templateGroups: TemplateGroup[],
  cropGroups: CropGroup[],
  templateGroupCropGroups: TemplateGroupCropGroup[]
): TemplateData[] {

  const templatesMap: Record<number, TemplateData> = {}

  // Функция для безопасного получения числового значения
  const getNumericValue = (value: any): number | null => {
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
    const farmId = report.field_group_name || 'no_farm'  // используем field_group_name как ID
    const farmName = report.field_group_name || 'Без хозяйства'

    // Пропускаем, если нет field_group_name
    if (!report.field_group_name) {
      return
    }

    // Получаем группы
    const templateGroupIds = templateToGroupsMap.get(templateId) || []
    const cropGroupIds = cropToGroupsMap.get(cropId) || []

    if (templateGroupIds.length === 0 || cropGroupIds.length === 0) {
      return
    }

    // Ищем подходящую пару групп
    let cropGroupData: any = null

    for (const tgId of templateGroupIds) {
      for (const cgId of cropGroupIds) {
        const pairKey = `${tgId}_${cgId}`

        if (!validPairs.has(pairKey)) continue

        const templateGroupData = indicators[tgId.toString()]
        const data = templateGroupData?.[cgId.toString()]

        if (data) {
          cropGroupData = data
          break
        }
      }
      if (cropGroupData) break
    }

    if (!cropGroupData) {
      return
    }

    // 1. Создаем или получаем шаблон
    if (!templatesMap[templateId]) {
      templatesMap[templateId] = {
        template_id: templateId,
        template_name: templateName,
        stats: { green: 0, orange: 0, red: 0, total: 0 },
        measurements: []
      }
    }

    const template = templatesMap[templateId]

    // Обрабатываем каждую точку отчета
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

        // Определяем зону по порогам
        let currentZone: 'green' | 'orange' | 'red' = zones[0].zone
        for (let i = zones.length - 1; i >= 0; i--) {
          if (roundedValue >= zones[i].threshold_value) {
            currentZone = zones[i].zone
            break
          }
        }

        // 2. Обновляем статистику шаблона
        template.stats[currentZone]++
        template.stats.total++

        // 3. Находим или создаем измерение на уровне шаблона
        let measurementType = template.measurements.find(
          m => m.measurement_type_id === measurementTypeId
        )

        if (!measurementType) {
          measurementType = {
            measurement_type_id: measurementTypeId,
            human_name: measurement.human_name,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            crops: []
          }
          template.measurements.push(measurementType)
        }

        // Обновляем статистику измерения
        measurementType.stats[currentZone]++
        measurementType.stats.total++

        // 4. Находим или создаем культуру внутри измерения
        let crop = measurementType.crops.find(c => c.crop_id === cropId)

        if (!crop) {
          crop = {
            crop_id: cropId,
            crop_name: cropName,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            farms: []
          }
          measurementType.crops.push(crop)
        }

        // Обновляем статистику культуры
        crop.stats[currentZone]++
        crop.stats.total++

        // 5. Находим или создаем хозяйство внутри культуры
        let farm = crop.farms.find(f => f.farm_id === farmId)

        if (!farm) {
          farm = {
            farm_id: farmId,
            farm_name: farmName,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            fields: []
          }
          crop.farms.push(farm)
        }

        // Обновляем статистику хозяйства
        farm.stats[currentZone]++
        farm.stats.total++

        // 6. Находим или создаем поле внутри хозяйства
        let field = farm.fields.find(f => f.field_id === report.field_id)

        if (!field) {
          field = {
            field_id: report.field_id,
            field_name: report.field_name,
            stats: { green: 0, orange: 0, red: 0, total: 0 },
            reports: []
          }
          farm.fields.push(field)
        }

        // Обновляем статистику поля
        field.stats[currentZone]++
        field.stats.total++

        // 7. Добавляем отчет в поле
        field.reports.push({
          field_id: report.field_id,
          field_name: report.field_name,
          scout_report_id: report.scout_report_id,
          value: roundedValue,
          zone: currentZone,
          report_date: report.report_date,
          measurement_type_id: measurementTypeId,
          measurement_type_name: measurement.human_name,
          crop_name: cropName
        })
      })
    })
  })

  return Object.values(templatesMap)
}