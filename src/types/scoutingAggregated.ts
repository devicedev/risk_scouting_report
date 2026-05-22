// export interface ReportMeasurement {
//   field_id: number
//   field_name: string
//   scout_report_id: number
//   value: number
//   zone: 'green' | 'orange' | 'red'
//   report_date: string
// }

// export interface FieldData {
//   field_id: number
//   field_name: string
//   stats: { green: number; orange: number; red: number; total: number }
//   reports: ReportMeasurement[]
// }

// export interface CropData {
//   crop_id: number
//   crop_name: string
//   stats: { green: number; orange: number; red: number; total: number }
//   fields: FieldData[]
// }

// export interface MeasurementTypeData {
//   measurement_type_id: number
//   human_name: string
//   stats: { green: number; orange: number; red: number; total: number }
//   crops: CropData[]
// }

// export interface TemplateData {
//   template_id: number
//   template_name: string
//   stats: { green: number; orange: number; red: number; total: number }
//   measurements: MeasurementTypeData[]
// }

export interface ReportMeasurement {
  field_id: number
  field_name: string
  scout_report_id: number
  value: number
  zone: 'green' | 'orange' | 'red'
  report_date: string
  measurement_type_id: number
  measurement_type_name: string
  crop_name: string
}

export interface FieldData {
  field_id: number
  field_name: string
  stats: { green: number; orange: number; red: number; total: number }
  reports: ReportMeasurement[]
}

export interface FarmData {
  farm_id: string  // field_group_name будет использоваться как идентификатор
  farm_name: string  // field_group_name
  stats: { green: number; orange: number; red: number; total: number }
  fields: FieldData[]
}

export interface CropData {
  crop_id: number
  crop_name: string
  stats: { green: number; orange: number; red: number; total: number }
  farms: FarmData[]
}

export interface MeasurementTypeData {
  measurement_type_id: number
  human_name: string
  stats: { green: number; orange: number; red: number; total: number }
  crops: CropData[]
}

export interface TemplateData {
  template_id: number
  template_name: string
  stats: { green: number; orange: number; red: number; total: number }
  measurements: MeasurementTypeData[]
}