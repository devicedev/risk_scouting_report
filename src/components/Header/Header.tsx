import type { FC } from "react";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SunIcon from "../LiveIcons/SunIcon/SunIcon";
import MoonIcon from "../LiveIcons/MoonIcon/MoonIcon";
import { FileSpreadsheet, FolderTree } from "lucide-react";

interface HeaderProps {
  onSeasonChange: (year: number) => void;
  onViewChange: (view: 'table' | 'zones' | 'groups') => void;
  currentView: 'table' | 'zones' | 'groups';
}

export const Header: FC<HeaderProps> = ({ 
  onSeasonChange, 
  onViewChange, 
  currentView 
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  const urlSeason = Number(searchParams.get("season"));
  const currentYear = new Date().getFullYear();
  const initialSeason = !urlSeason ? currentYear : urlSeason;

  // Генерируем массив годов: текущий и 3 предыдущих
  const years = [
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3
  ];

  useEffect(() => {
    if (!urlSeason) {
      setSearchParams(previousParams => {
        const nextParams = new URLSearchParams(previousParams);
        nextParams.set("season", String(initialSeason));
        return nextParams;
      });
    }
  }, [initialSeason, setSearchParams, urlSeason]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const season = Number(searchParams.get("season")) || initialSeason;

  const handleSeasonChange = (newSeason: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams), season: String(newSeason) });
    onSeasonChange(newSeason);
  };

  const goHub = () => window.location.assign('/hub');

  const downloadExcel = () => {
    const exportUrl = new URL(
      "/api/v1/risc_scouting_report/export.xlsx",
      window.location.origin
    );
    exportUrl.searchParams.set("season", String(season));
    window.location.assign(exportUrl.toString());
  };

  return (
    <header className="flex justify-between items-center p-4 bg-stone-200 dark:bg-stone-900">
      <div className="flex items-center gap-4">
        <Button
          onClick={goHub}
          variant="outline"
          className="cursor-pointer w-22 h-10"
        >
          Главная
        </Button>

        {/* Селектор года */}
        <select
          value={season}
          onChange={(e) => handleSeasonChange(Number(e.target.value))}
          className="px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
        Рисковый отчет 🌿
      </h1>

      {/* Кнопки управления */}
      <div className="gap-2 flex items-center">
        <Button 
          variant="outline" 
          className={`cursor-pointer ${currentView === 'table' ? 'bg-stone-300 dark:bg-stone-600' : ''}`}
          onClick={() => onViewChange('table')}
        >
          Таблица
        </Button>
        <Button
          variant="outline"
          className="cursor-pointer flex items-center gap-2"
          onClick={downloadExcel}
          title="Скачать отчет в Excel"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
        <Button 
          variant="outline" 
          className={`cursor-pointer ${currentView === 'zones' ? 'bg-stone-300 dark:bg-stone-600' : ''}`}
          onClick={() => onViewChange('zones')}
        >
          Зоны
        </Button>
        <Button 
          variant="outline" 
          className={`cursor-pointer flex items-center gap-2 ${currentView === 'groups' ? 'bg-stone-300 dark:bg-stone-600' : ''}`}
          onClick={() => onViewChange('groups')}
        >
          <FolderTree className="h-4 w-4" />
          Группы
        </Button>
        <Button variant="outline" onClick={toggleTheme} className="cursor-pointer ml-2">
          {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </Button>
      </div>
    </header>
  );
};
