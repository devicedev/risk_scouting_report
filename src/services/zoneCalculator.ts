import type { ScoutReportItem, IndicatorsResponse } from "../types/scoutingReport"

export interface ZoneStats {
  green: number
  orange: number
  red: number
  total: number
}

// Считает статистику зон для шаблона
export function calculateZones(
  reports: ScoutReportItem[],
  indicators: IndicatorsResponse
): ZoneStats {
  const stats: ZoneStats = { green: 0, orange: 0, red: 0, total: 0 }

  reports.forEach(report => {
    const templateId = String(report.scout_report_template_id)
    const cropIndicators = indicators[templateId]?.[report.crop_id]
    if (!cropIndicators) return

    Object.values(report.scout_report_point).forEach(measurements => {
      measurements.forEach(measurement => {
        if (measurement.measurement_value === null) return
        const measurementTypeId = String(measurement.scout_report_measurement_type_id)
        const zones = cropIndicators[measurementTypeId]
        if (!zones) return

        // Определяем зону по threshold
        let currentZone = zones[0].zone
        for (const z of zones) {
          if (measurement.measurement_value >= z.threshold_value) {
            currentZone = z.zone
          }
        }

        stats[currentZone]++
        stats.total++
      })
    })
  })

  return stats
}

// Преобразует отчеты в строки для DetailTable
export function getDetailedItems(
  reports: ScoutReportItem[],
  indicators: IndicatorsResponse
): (ScoutReportItem & {
  zone: 'green' | 'orange' | 'red'
  measurement_type_id: number
  value: number
})[] {
  const result: (ScoutReportItem & { zone: 'green' | 'orange' | 'red'; measurement_type_id: number; value: number })[] = []

  reports.forEach(report => {
    const templateId = String(report.scout_report_template_id)
    const cropIndicators = indicators[templateId]?.[report.crop_id]
    if (!cropIndicators) return

    Object.values(report.scout_report_point).forEach(measurements => {
      measurements.forEach(measurement => {
        if (measurement.measurement_value === null || report.scout_report_id === null) return

        const measurementTypeId = String(measurement.scout_report_measurement_type_id)
        const zones = cropIndicators[measurementTypeId]
        if (!zones) return

        let currentZone: 'green' | 'orange' | 'red' = zones[0].zone
        for (const z of zones) {
          if (measurement.measurement_value >= z.threshold_value) {
            currentZone = z.zone
          }
        }

        result.push({
          ...report,
          zone: currentZone,
          measurement_type_id: measurement.scout_report_measurement_type_id,
          value: measurement.measurement_value
        })
      })
    })
  })

  return result
}
