export interface FarmReportMeasurement {
  field_id: number
  field_name: string
  scout_report_id: number
  value: number
  zone: 'green' | 'orange' | 'red'
  report_date: string
  measurement_type_id: number
  measurement_type_name: string
  template_id: number
  template_name: string
  crop_id: number
  crop_name: string
}

// Данные по полю (на уровне культуры)
export interface FarmFieldData {
  field_id: number
  field_name: string
  field_group_name: string | null
  stats: { green: number; orange: number; red: number; total: number }
  reports: FarmReportMeasurement[]
}

// Данные по культуре (на уровне измерения)
export interface FarmCropData {
  crop_id: number
  crop_name: string
  stats: { green: number; orange: number; red: number; total: number }
  fields: FarmFieldData[]
}

// Данные по измерению (на уровне группы шаблонов)
export interface FarmMeasurementTypeData {
  measurement_type_id: number
  human_name: string
  stats: { green: number; orange: number; red: number; total: number }
  crops: FarmCropData[]
}

// Данные по группе шаблонов (на уровне хозяйства)
export interface FarmTemplateGroupData {
  template_group_id: number
  template_group_name: string
  stats: { green: number; orange: number; red: number; total: number }
  measurements: FarmMeasurementTypeData[]
}

// Данные по хозяйству
export interface FarmData {
  farm_id: string
  farm_name: string
  stats: { green: number; orange: number; red: number; total: number }
  templateGroups: FarmTemplateGroupData[]
}