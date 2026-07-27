import React, { useMemo } from "react"
import Chart from "react-apexcharts/core"
import "apexcharts/area"
import "apexcharts/features/legend"
import type { TemplateData } from "../../types/scoutingAggregated"

interface Props {
  templates: TemplateData[]
}

const ScoutingRiskChart: React.FC<Props> = ({ templates }) => {
  const chartData = useMemo(() => {
    const map: Record<string, {
      green: number
      orange: number
      red: number
      total: number
    }> = {}

    // ✅ Новая структура: template → measurements → crops → farms → fields → reports
    templates.forEach(template => {
      template.measurements?.forEach(measurement => {
        measurement.crops?.forEach(crop => {
          crop.farms?.forEach(farm => {        // ✅ добавляем farms
            farm.fields?.forEach(field => {    // ✅ fields внутри farms
              field.reports?.forEach(report => {
                const date = new Date(report.report_date)
                  .toISOString()
                  .split("T")[0]

                if (!map[date]) {
                  map[date] = {
                    green: 0,
                    orange: 0,
                    red: 0,
                    total: 0
                  }
                }

                if (report.zone === "green") map[date].green++
                else if (report.zone === "orange") map[date].orange++
                else if (report.zone === "red") map[date].red++

                map[date].total++
              })
            })
          })
        })
      })
    })

    const sortedDates = Object.keys(map).sort()

    const series = [
      {
        name: "Низкий риск",
        data: sortedDates.map(d => map[d].green),
      },
      {
        name: "Средний риск",
        data: sortedDates.map(d => map[d].orange),
      },
      {
        name: "Высокий риск",
        data: sortedDates.map(d => map[d].red),
      },
      {
        name: "Всего отчетов",
        data: sortedDates.map(d => map[d].total),
        type: "line" as const, 
      },
    ]

    return {
      categories: sortedDates,
      series,
    }
  }, [templates])

  const chartKey = useMemo(() => {
    return [
      chartData.categories.length,
      ...chartData.series.map(s => s.data.join(","))
    ].join("|")
  }, [chartData])

  const options: ApexCharts.ApexOptions = {
    chart: {
      id: "scouting-risk-chart", 
      type: "area",
      stacked: false,
      toolbar: { show: false },
      animations: { enabled: true },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2, 2, 3],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.6,
        opacityTo: 0.1,
      },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: { colors: "#838383" },
        rotate: -45,
        hideOverlappingLabels: true,
      },
      title: {
        text: "Дата",
        style: { color: "#838383", fontSize: "12px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#838383" },
      },
      title: {
        text: "Количество отчетов",
        style: { color: "#838383", fontSize: "12px" },
      },
    },
    colors: ["#10b981", "#f59e0b", "#ef4444", "#6b7280"],
    legend: {
      position: "top",
      labels: {
        colors: "#838383",
      },
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value: number) => `${value} отчет(ов)`,
      },
    },
    grid: {
      borderColor: "#e5e7eb",
    },
    title: {
      text: "Динамика распределения отчетов по зонам риска",
      align: "center",
      style: {
        color: "#838383",
        fontSize: "14px",
        fontWeight: "normal",
      },
    },
  }

  if (chartData.categories.length === 0) {
    return (
      <div className="bg-stone-100/80 dark:bg-stone-800/60 p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-stone-700 dark:text-stone-300">
          Статистика по рискам
        </h2>

        <div className="flex items-center justify-center min-h-[320px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-stone-600 dark:text-stone-400">
              Нет данных для отображения
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-500 mt-2">
              За выбранный период нет отчетов
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-100/80 dark:bg-stone-800/60 p-6 rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-stone-700 dark:text-stone-300">
        Статистика по рискам
      </h2>

      <Chart
        key={chartKey} 
        options={options}
        series={chartData.series}
        type="area"
        height={400}
      />
    </div>
  )
}

export default ScoutingRiskChart
