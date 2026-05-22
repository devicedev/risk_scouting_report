import { Card, CardContent } from '@/components/ui/card';
import type { TemplateGroupsListProps } from './types';
import type { ScoutReportTemplate } from '@/types/handbooks';

const TemplateGroupsList: React.FC<TemplateGroupsListProps> = ({
  indicators,
  templateGroupNames,
  templateGroups,
  templates,
  cropGroupNames,
  templateGroupCropGroups,
  onSelect,
  isLoading = false,
}) => {
  // Получаем название группы культур по ID
  const getCropGroupName = (cropGroupId: number): string => {
    const group = cropGroupNames.find(g => g.id === cropGroupId);
    return group?.crop_group_name || `Группа культур ${cropGroupId}`;
  };

  // Получаем шаблоны, входящие в группу
  const getTemplatesForGroup = (templateGroupId: number): ScoutReportTemplate[] => {
    const templateIds = templateGroups
      .filter(tg => tg.template_group_id === templateGroupId)
      .map(tg => tg.scout_report_template_id);
    
    return templates.filter(t => templateIds.includes(t.scout_report_template_id));
  };

  // Получаем группы культур, связанные с данной группой шаблонов
  const getCropGroupsForTemplateGroup = (templateGroupId: number): Array<{
    id: number;
    name: string;
    hasThresholds: boolean;
  }> => {
    const linkedCropGroups = templateGroupCropGroups
      .filter(link => link.template_group_id === templateGroupId)
      .map(link => ({
        id: link.crop_group_id,
        name: getCropGroupName(link.crop_group_id),
        hasThresholds: false
      }));
    
    // Проверяем наличие порогов для каждой группы культур
    return linkedCropGroups.map(cg => ({
      ...cg,
      hasThresholds: indicators[templateGroupId]?.[cg.id] !== undefined
    }));
  };

  // Проверяем, есть ли у группы пороговые значения
  const hasThresholds = (groupId: number): boolean => {
    return Object.keys(indicators[groupId] || {}).length > 0;
  };

  // Подсчет количества измерений для группы культур
  const getMeasurementsCount = (templateGroupId: number, cropGroupId: number): number => {
    const measurements = indicators[templateGroupId]?.[cropGroupId];
    return measurements ? Object.keys(measurements).length : 0;
  };

  // Статистика для карточки
  const getGroupStats = (templateGroupId: number) => {
    const templatesCount = getTemplatesForGroup(templateGroupId).length;
    const cropGroupsCount = templateGroupCropGroups.filter(
      link => link.template_group_id === templateGroupId
    ).length;
    
    let totalMeasurements = 0;
    templateGroupCropGroups
      .filter(link => link.template_group_id === templateGroupId)
      .forEach(link => {
        totalMeasurements += getMeasurementsCount(templateGroupId, link.crop_group_id);
      });
    
    return { templatesCount, cropGroupsCount, totalMeasurements };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-3"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/2"></div>
                  <div className="h-10 bg-stone-200 dark:bg-stone-700 rounded"></div>
                  <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templateGroupNames.map((group) => {
          const groupId = group.id;
          const hasData = hasThresholds(groupId);
          const templatesInGroup = getTemplatesForGroup(groupId);
          const cropGroupsList = getCropGroupsForTemplateGroup(groupId);
          const stats = getGroupStats(groupId);
          
          return (
            <Card
              key={groupId}
              className={`cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] flex flex-col
                ${hasData ? 'border-primary/50 bg-primary/5' : 'border-dashed border-stone-300 dark:border-stone-700'}`}
              onClick={() => onSelect(groupId.toString())}
            >
              <CardContent className="p-4 flex-1">
                {/* Заголовок */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg flex-1">
                    {group.template_group_name}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* Статистика */}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      📋 {stats.templatesCount} шаблонов
                    </span>
                    <span className="flex items-center gap-1">
                      🌾 {stats.cropGroupsCount} групп культур
                    </span>
                    <span className="flex items-center gap-1">
                      📏 {stats.totalMeasurements} измерений
                    </span>
                  </div>

                  {/* Шаблоны в группе */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">📋 Шаблоны:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {templatesInGroup.slice(0, 3).map((template) => (
                        <span
                          key={template.scout_report_template_id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          title={template.scout_report_template_name}
                        >
                          {template.scout_report_template_name.length > 25 
                            ? template.scout_report_template_name.slice(0, 22) + '...'
                            : template.scout_report_template_name}
                        </span>
                      ))}
                      {templatesInGroup.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-stone-100 dark:bg-stone-800 text-stone-500">
                          +{templatesInGroup.length - 3}
                        </span>
                      )}
                      {templatesInGroup.length === 0 && (
                        <span className="text-sm text-muted-foreground italic">
                          Нет шаблонов в группе
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Группы культур */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">🌾 Группы культур:</span>
                    </div>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                      {cropGroupsList.map((cropGroup) => (
                        <div key={cropGroup.id} className="flex items-center justify-between text-sm">
                          <span className="text-stone-700 dark:text-stone-300 truncate flex-1">
                            {cropGroup.name}
                          </span>
                          {cropGroup.hasThresholds ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[12px] flex items-center gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                              есть пороги
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-[12px] flex items-center gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-red-500"></span>
                              нет порогов
                            </span>
                          )}
                        </div>
                      ))}
                      {cropGroupsList.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          Нет связанных групп культур
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {templateGroupNames.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          Нет доступных групп шаблонов
        </div>
      )}
    </div>
  );
};

export default TemplateGroupsList;