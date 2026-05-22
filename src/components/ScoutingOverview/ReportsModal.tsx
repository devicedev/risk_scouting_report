import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ExternalLink, Calendar, Ruler, TrendingUp, Sprout } from "lucide-react"
import type { ReportMeasurement } from "../../types/scoutingAggregated"

interface ReportsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reports: (ReportMeasurement & { measurement_type_name?: string })[]
  title: string
  description?: string
}

const formatDate = (dateString: string) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getRiskColor = (zone: string) => {
  switch (zone) {
    case 'green':
      return 'bg-emerald-500 text-white'
    case 'orange':
      return 'bg-amber-500 text-white'
    case 'red':
      return 'bg-rose-500 text-white'
    default:
      return 'bg-stone-500 text-white'
  }
}

const getRiskLabel = (zone: string) => {
  switch (zone) {
    case 'green':
      return 'Низкий риск'
    case 'orange':
      return 'Средний риск'
    case 'red':
      return 'Высокий риск'
    default:
      return zone
  }
}

const ReportsModal: React.FC<ReportsModalProps> = ({
  open,
  onOpenChange,
  reports,
  title,
  description
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Хедер - фиксированный */}
        <div className="flex-shrink-0 px-6 py-4 border-b">
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Найдено отчетов: {reports.length}
            </p>
          </DialogHeader>
        </div>

        {/* Контент с прокруткой */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-muted-foreground">Нет отчетов для отображения</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report, index) => {
                const uniqueKey = `${report.scout_report_id}-${report.field_id}-${index}`
                
                return (
                  <div
                    key={uniqueKey}
                    className="group relative bg-card border rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden"
                  >
                    {/* Цветная полоска сверху */}
                    <div className={`h-1 ${report.zone === 'green' ? 'bg-emerald-500' : report.zone === 'orange' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                    
                    <div className="p-4">
                      {/* Заголовок и бейдж */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-lg truncate">
                            {report.field_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`https://operations.cropwise.com/fields/${report.field_id}/scout_reports/${report.scout_report_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Отчет № {report.scout_report_id}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getRiskColor(report.zone)}`}>
                          {getRiskLabel(report.zone)}
                        </span>
                      </div>
                      
                      {/* Название культуры */}
                      {report.crop_name && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Sprout className="h-3 w-3" />
                            <span>Культура</span>
                          </div>
                          <p className="text-sm font-medium truncate" title={report.crop_name}>
                            {report.crop_name}
                          </p>
                        </div>
                      )}
                      
                      {/* Основная информация */}
                      <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Ruler className="h-3 w-3" />
                            <span>Тип измерения</span>
                          </div>
                          <p className="text-sm font-medium truncate" title={report.measurement_type_name}>
                            {report.measurement_type_name || 'Измерение'}
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Значение</span>
                          </div>
                          <p className="text-xl font-semibold tabular-nums">
                            {report.value}
                          </p>
                        </div>
                        
                        {report.report_date && (
                          <div className="col-span-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              <span>Дата отчета</span>
                            </div>
                            <p className="text-sm">
                              {formatDate(report.report_date)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReportsModal