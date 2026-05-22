import React, { useMemo, useState } from "react"
import { motion } from "framer-motion"
import type { TemplateData, ReportMeasurement } from "../../types/scoutingAggregated"
import ReportsModal from "./ReportsModal"

interface Props {
  templates: TemplateData[]
}

const COLORS: Record<string, string> = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-rose-500",
}

const LABELS: Record<string, string> = {
  green: "Низкий риск",
  orange: "Средний риск",
  red: "Высокий риск",
}

const ICONS: Record<string, string> = {
  green: "✅",
  orange: "⚠️",
  red: "❌",
}

type RiskType = "green" | "orange" | "red" | "total"

const ScoutingOverview: React.FC<Props> = ({ templates }) => {
  const [selectedRisk, setSelectedRisk] = useState<RiskType | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Пересчитываем статистику из структуры: template → measurements → crops → farms → fields → reports
  const stats = useMemo(() => {
    const result: Record<string, number> = {
      green: 0,
      orange: 0,
      red: 0,
      total: 0,
    }

    templates.forEach((template) => {
      result.green += template.stats.green
      result.orange += template.stats.orange
      result.red += template.stats.red
      result.total += template.stats.total
    })

    return result
  }, [templates])

  const getPercentage = (value: number) => {
    return stats.total ? Math.round((value / stats.total) * 100) : 0
  }

  // Собираем отчеты из структуры: template → measurements → crops → farms → fields → reports
  const getFilteredReports = () => {
    const allReports: (ReportMeasurement & { measurement_type_name?: string })[] = []
    
    templates.forEach((template) => {
      template.measurements?.forEach((measurement) => {
        measurement.crops?.forEach((crop) => {
          crop.farms?.forEach((farm) => {
            farm.fields?.forEach((field) => {
              field.reports?.forEach((report) => {
                allReports.push({
                  ...report,
                  measurement_type_name: measurement.human_name
                })
              })
            })
          })
        })
      })
    })

    if (selectedRisk === "total") {
      return allReports
    }

    if (selectedRisk) {
      return allReports.filter(report => report.zone === selectedRisk)
    }

    return []
  }

  const handleCardClick = (riskType: RiskType) => {
    setSelectedRisk(riskType)
    setIsModalOpen(true)
  }

  const filteredReports = getFilteredReports()
  
  const modalTitle = selectedRisk === "total" 
    ? "Все отчеты" 
    : selectedRisk 
      ? LABELS[selectedRisk] 
      : "Отчеты"
  
  const modalDescription = selectedRisk === "total"
    ? "Полный список всех отчетов по всем зонам риска"
    : selectedRisk
      ? `Список отчетов с ${LABELS[selectedRisk].toLowerCase()}`
      : "Список отчетов"

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(["green", "orange", "red"] as const).map((key) => {
          const value = stats[key]
          const percentage = getPercentage(value)

          return (
            <div
              key={key}
              onClick={() => handleCardClick(key)}
              className="relative p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl shadow hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{ICONS[key]}</span>
                  <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    {LABELS[key]}
                  </span>
                </div>
                <span className="text-sm font-semibold text-stone-900 dark:text-white">
                  {value}
                </span>
              </div>

              <div className="w-full h-2 bg-stone-300 dark:bg-stone-700 rounded-full overflow-hidden">
                <motion.div
                  className={`${COLORS[key]} h-2 rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400 text-right">
                {percentage}%
              </div>
            </div>
          )
        })}

        {/* Total блок */}
        <div
          onClick={() => handleCardClick("total")}
          className="relative p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl shadow col-span-1 flex flex-col justify-center text-center cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-sm font-medium text-stone-600 dark:text-stone-300 mb-1">
            Всего отчетов
          </span>
          <span className="text-lg font-semibold text-stone-900 dark:text-white">
            {stats.total}
          </span>
        </div>
      </div>

      <ReportsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        reports={filteredReports}
        title={modalTitle}
        description={modalDescription}
      />
    </>
  )
}

export default ScoutingOverview