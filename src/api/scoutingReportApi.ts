import type { ScoutReportItem, IndicatorsResponse } from "../types/scoutingReport"
import type { IndicatorsData, ThresholdValue } from "../components/ThresholdsEditor/types"
import type { 
  TemplateGroupName, 
  TemplateGroup, 
  TemplateGroupWithNames,
  CropGroupName, 
  CropGroup, 
  CropGroupWithNames 
} from "../types/groups";

interface ScoutReportsResponse {
  count: number
  data: ScoutReportItem[]
}

export interface IndicatorThreshold {
  id?: number;
  scout_report_template_id: number;
  template_group_crop_group_measurement_id: number;
  crop_id: number;
  scout_report_measurement_type_id: number;
  threshold_value: number;
  indicator_zone: string;
}

// Расширим тип ThresholdValue, чтобы включить ID
export interface ThresholdValueWithId extends ThresholdValue {
  id?: number; // ID правила из БД
}

interface ThresholdApiZone extends ThresholdValueWithId {
  template_group_crop_group_measurement_id: number;
}

type ThresholdsApiResponse = Record<
  string,
  Record<string, Record<string, ThresholdApiZone[]>>
>;

export async function getScoutReports(season: number): Promise<ScoutReportItem[]> {
  const res = await fetch(`/api/v1/risc_scouting_report?season=${season}`)

  if (!res.ok) {
    throw new Error("Failed to load scouting reports")
  }

  const json: ScoutReportsResponse = await res.json()
  return json.data
}

export async function getIndicators(): Promise<IndicatorsResponse> {
  const res = await fetch(`/api/v1/risc_scouting_report/indicators/`)

  if (!res.ok) {
    throw new Error("Failed to load indicators")
  }

  return res.json()
}

// Получаем все правила в плоском виде с ID
export async function getAllThresholds(): Promise<IndicatorThreshold[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/indicators/`)
  
  if (!res.ok) {
    throw new Error("Failed to load thresholds")
  }
  
  const data: ThresholdsApiResponse = await res.json()
  const flatList: IndicatorThreshold[] = []
  
  Object.entries(data).forEach(([templateId, templateData]) => {
    Object.entries(templateData).forEach(([cropId, cropData]) => {
      Object.entries(cropData).forEach(([measurementId, zones]) => {
        zones.forEach(zone => {
          flatList.push({
            id: zone.id,
            // !!! ВАЖНО: берем реальное значение из ответа, а не 0
            template_group_crop_group_measurement_id: zone.template_group_crop_group_measurement_id,
            scout_report_template_id: Number(templateId),
            crop_id: Number(cropId),
            scout_report_measurement_type_id: Number(measurementId),
            threshold_value: zone.threshold_value,
            indicator_zone: zone.zone
          })
        })
      })
    })
  })
  
  return flatList
}

// Преобразуем наши данные с учетом ID

export function flattenIndicatorsWithIds(
  indicators: IndicatorsData, 
  _existingRules: IndicatorThreshold[],
  templateGroupCropGroups: TemplateGroupCropGroup[], // Добавить
  templateGroupCropGroupMeasurements: TemplateGroupCropGroupMeasurement[] // Добавить
): IndicatorThreshold[] {
  console.log('🔄 INPUT indicators:', JSON.stringify(indicators, null, 2));
  
  // Создаем маппинги для быстрого поиска
  const tgcgMap = new Map(
    templateGroupCropGroups.map(tgcg => 
      [`${tgcg.template_group_id}_${tgcg.crop_group_id}`, tgcg.id]
    )
  );
  
  const measurementMap = new Map(
    templateGroupCropGroupMeasurements.map(m => 
      [`${m.template_group_crop_group_id}_${m.scout_report_measurement_type_id}`, m.id]
    )
  );
  
  const flatList: IndicatorThreshold[] = [];

  Object.entries(indicators).forEach(([templateId, templateData]) => {
    Object.entries(templateData).forEach(([cropId, cropData]) => {
      Object.entries(cropData).forEach(([measurementId, zones]) => {
        
        // Находим правильный template_group_crop_group_measurement_id!
        const tgcgId = tgcgMap.get(`${templateId}_${cropId}`);
        if (!tgcgId) {
          console.warn(`No template_group_crop_group found for ${templateId}_${cropId}`);
          return;
        }
        
        const realMeasurementId = measurementMap.get(`${tgcgId}_${measurementId}`);
        if (!realMeasurementId) {
          console.warn(`No measurement found for ${tgcgId}_${measurementId}`);
          return;
        }
        
        zones.forEach((zone: ThresholdValueWithId) => {
          flatList.push({
            id: zone.id,
            template_group_crop_group_measurement_id: realMeasurementId, // <-- НЕ 0!
            scout_report_template_id: Number(templateId),
            crop_id: Number(cropId),
            scout_report_measurement_type_id: Number(measurementId),
            threshold_value: zone.threshold_value,
            indicator_zone: zone.zone
          });
        });
      });
    });
  });

  return flatList;
}

// Создание нового правила
export async function createIndicatorThreshold(rule: IndicatorThreshold): Promise<number> {
  const res = await fetch(`/api/v1/risc_scouting_report/indicators/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Create rule failed:', {
      status: res.status,
      statusText: res.statusText,
      error: errorData,
      rule
    });
    throw new Error(errorData.error || `Failed to create indicator threshold (${res.status})`);
  }

  const result = await res.json();
  return result.id;
}

// Обновление существующего правила
export async function updateIndicatorThreshold(id: number, rule: IndicatorThreshold): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/indicators/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Update rule failed:', {
      id,
      status: res.status,
      statusText: res.statusText,
      error: errorData,
      rule
    });
    throw new Error(errorData.error || `Failed to update indicator threshold (${res.status})`);
  }
}

// Удаление правила
export async function deleteIndicatorThreshold(id: number): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/indicators/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('Delete rule failed:', {
      id,
      status: res.status,
      statusText: res.statusText,
      error: errorData
    });
    throw new Error(errorData.error || `Failed to delete indicator threshold (${res.status})`);
  }
}

// Находим изменения между старыми и новыми данными
// export function findChanges(
//   oldRules: IndicatorThreshold[], 
//   newRules: IndicatorThreshold[]
// ): {
//   toCreate: IndicatorThreshold[],
//   toUpdate: { id: number; data: IndicatorThreshold }[],
//   toDelete: number[]
// } {
//   const toCreate: IndicatorThreshold[] = [];
//   const toUpdate: { id: number; data: IndicatorThreshold }[] = [];
//   const toDelete: number[] = [];

//   // Создаем карты для быстрого поиска
//   // const oldMap = new Map(oldRules.map(rule => [rule.id, rule]));
  
//   // Для новых правил создаем ключ по уникальным полям (без id)
//   const newKeyMap = new Map(
//     newRules.map(rule => [
//       `${rule.scout_report_template_id}_${rule.crop_id}_${rule.scout_report_measurement_type_id}_${rule.threshold_value}`,
//       rule
//     ])
//   );

//   // Создаем карту старых правил по их уникальному ключу
//   const oldKeyMap = new Map(
//     oldRules.map(rule => [
//       `${rule.scout_report_template_id}_${rule.crop_id}_${rule.scout_report_measurement_type_id}_${rule.threshold_value}`,
//       rule
//     ])
//   );

//   console.log('Old rules:', oldRules);
//   console.log('New rules:', newRules);

//   // Ищем новые и измененные записи
//   newRules.forEach(newRule => {
//     const key = `${newRule.scout_report_template_id}_${newRule.crop_id}_${newRule.scout_report_measurement_type_id}_${newRule.threshold_value}`;
//     const existingRule = oldKeyMap.get(key);

//     if (!existingRule) {
//       // Совсем новое правило
//       console.log('New rule to create:', newRule);
//       toCreate.push(newRule);
//     } else if (existingRule.id) {
//       // Правило существует, проверяем, изменилась ли зона
//       if (existingRule.indicator_zone !== newRule.indicator_zone) {
//         console.log('Rule to update:', { id: existingRule.id, data: newRule });
//         toUpdate.push({ id: existingRule.id, data: newRule });
//       } else {
//         console.log('Rule unchanged:', existingRule.id);
//       }
//     }
//   });

//   // Ищем удаленные записи
//   oldRules.forEach(oldRule => {
//     if (!oldRule.id) return; // Пропускаем правила без id

//     const key = `${oldRule.scout_report_template_id}_${oldRule.crop_id}_${oldRule.scout_report_measurement_type_id}_${oldRule.threshold_value}`;
//     const stillExists = newKeyMap.has(key);

//     if (!stillExists) {
//       console.log('Rule to delete:', oldRule.id);
//       toDelete.push(oldRule.id);
//     }
//   });

//   return { toCreate, toUpdate, toDelete };
// }
export function findChanges(
  oldRules: IndicatorThreshold[], 
  newRules: IndicatorThreshold[]
): {
  toCreate: IndicatorThreshold[],
  toUpdate: { id: number; data: IndicatorThreshold }[],
  toDelete: number[]
} {
  console.log('🔍 findChanges START');
  console.log('📜 oldRules:', JSON.stringify(oldRules, null, 2));
  console.log('📜 newRules:', JSON.stringify(newRules, null, 2));
  
  const toCreate: IndicatorThreshold[] = [];
  const toUpdate: { id: number; data: IndicatorThreshold }[] = [];
  const toDelete: number[] = [];

  // Создаем карту старых правил по ID
  const oldById = new Map(oldRules.map(rule => [rule.id, rule]));
  console.log('🗺️ oldById:', Array.from(oldById.entries()).map(([id, rule]) => ({ id, zone: rule.indicator_zone })));

  // Создаем карту новых правил по ID
  const newById = new Map(newRules.map(rule => [rule.id, rule]));
  console.log('🗺️ newById:', Array.from(newById.entries()).map(([id, rule]) => ({ id, zone: rule.indicator_zone })));

  // Ищем изменения по ID
  newRules.forEach(newRule => {
    if (!newRule.id) {
      console.log('➕ New rule without ID:', newRule);
      toCreate.push(newRule);
      return;
    }

    const oldRule = oldById.get(newRule.id);
    
    if (!oldRule) {
      console.log('➕ New rule with new ID:', newRule);
      toCreate.push(newRule);
    } else {
      // Правило существует, проверяем все поля
      if (oldRule.threshold_value !== newRule.threshold_value ||
          oldRule.indicator_zone !== newRule.indicator_zone ||
          oldRule.template_group_crop_group_measurement_id !== newRule.template_group_crop_group_measurement_id) {
        
        console.log('✏️ Rule to update:', { 
          id: newRule.id, 
          old: { zone: oldRule.indicator_zone, value: oldRule.threshold_value },
          new: { zone: newRule.indicator_zone, value: newRule.threshold_value }
        });
        toUpdate.push({ id: newRule.id, data: newRule });
      } else {
        console.log('⏸️ Rule unchanged:', newRule.id);
      }
    }
  });

  // Ищем удаленные записи
  oldRules.forEach(oldRule => {
    if (!oldRule.id) return;
    
    if (!newById.has(oldRule.id)) {
      console.log('🗑️ Rule to delete:', oldRule.id);
      toDelete.push(oldRule.id);
    }
  });

  console.log('📊 findChanges RESULT:', { toCreate, toUpdate, toDelete });
  return { toCreate, toUpdate, toDelete };
}

// Сохраняем все изменения
export async function saveAllThresholds(
  _oldData: IndicatorsData, 
  newData: IndicatorsData,
  existingRules: IndicatorThreshold[],
  templateGroupCropGroups: TemplateGroupCropGroup[], // Добавить
  templateGroupCropGroupMeasurements: TemplateGroupCropGroupMeasurement[] // Добавить
): Promise<void> {
  // Преобразуем данные в плоский список с ID, используя реальные маппинги
  const oldRules = existingRules;
  
  const newRules = flattenIndicatorsWithIds(
    newData, 
    existingRules,
    templateGroupCropGroups,
    templateGroupCropGroupMeasurements
  );
  
  const changes = findChanges(oldRules, newRules);
  
  console.log('Changes to save:', changes);

  // Выполняем все операции последовательно для надежности
  const results = [];
  
  // Сначала удаляем (чтобы освободить ключи, если нужно)
  for (const id of changes.toDelete) {
    try {
      await deleteIndicatorThreshold(id);
      results.push({ type: 'delete', success: true, id });
      console.log(`Deleted rule ${id}`);
    } catch (error) {
      console.error(`Failed to delete rule ${id}:`, error);
      throw error;
    }
  }

  // Потом обновляем существующие
  for (const { id, data } of changes.toUpdate) {
    try {
      await updateIndicatorThreshold(id, data);
      results.push({ type: 'update', success: true, id });
      console.log(`Updated rule ${id}`);
    } catch (error) {
      console.error(`Failed to update rule ${id}:`, error);
      throw error;
    }
  }

  // В конце создаем новые
  for (const item of changes.toCreate) {
    try {
      const newId = await createIndicatorThreshold(item);
      results.push({ type: 'create', success: true, id: newId });
      console.log(`Created rule for template ${item.scout_report_template_id}, crop ${item.crop_id}, measurement ${item.scout_report_measurement_type_id}`);
    } catch (error) {
      console.error('Failed to create rule:', item, error);
      throw error;
    }
  }

  console.log('All changes saved:', results);
}

export async function deleteTemplateThresholds(templateId: number): Promise<void> {
  // Получаем все актуальные правила
  const allRules = await getAllThresholds();
  
  // Фильтруем правила для этого шаблона
  const rulesToDelete = allRules.filter(rule => rule.scout_report_template_id === templateId);
  
  console.log(`🗑️ Found ${rulesToDelete.length} rules to delete for template ${templateId}`);
  
  // Удаляем каждое правило
  for (const rule of rulesToDelete) {
    if (rule.id) {
      await deleteIndicatorThreshold(rule.id);
    }
  }
  
  console.log(`✅ Deleted ${rulesToDelete.length} rules for template ${templateId}`);
}

export async function deleteCropThresholds(templateId: number, cropId: number): Promise<void> {
  // Получаем все актуальные правила
  const allRules = await getAllThresholds();
  
  // Фильтруем правила для этого шаблона и культуры
  const rulesToDelete = allRules.filter(
    rule => rule.scout_report_template_id === templateId && rule.crop_id === cropId
  );
  
  console.log(`🗑️ Found ${rulesToDelete.length} rules to delete for template ${templateId}, crop ${cropId}`);
  
  // Удаляем каждое правило
  for (const rule of rulesToDelete) {
    if (rule.id) {
      await deleteIndicatorThreshold(rule.id);
    }
  }
  
  console.log(`✅ Deleted ${rulesToDelete.length} rules for template ${templateId}, crop ${cropId}`);
}

// ======================
// TEMPLATE GROUP NAMES API
// ======================

// Получить все названия групп шаблонов
export async function getTemplateGroupNames(): Promise<TemplateGroupName[]> {
  const res = await fetch(`/api/v1/scouting_report/template_group_names/`);

  if (!res.ok) {
    throw new Error("Failed to load template group names");
  }

  return res.json();
}

// Получить название группы шаблонов по ID
export async function getTemplateGroupNameById(id: number): Promise<TemplateGroupName> {
  const res = await fetch(`/api/v1/scouting_report/template_group_names/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load template group name with id ${id}`);
  }

  return res.json();
}

// Создать новое название группы шаблонов
export async function createTemplateGroupName(name: string): Promise<number> {
  const res = await fetch(`/api/v1/scouting_report/template_group_names/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template_group_name: name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create template group name");
  }

  const result = await res.json();
  return result.id;
}

// Обновить название группы шаблонов
export async function updateTemplateGroupName(id: number, name: string): Promise<void> {
  const res = await fetch(`/api/v1/scouting_report/template_group_names/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template_group_name: name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update template group name");
  }
}

// Удалить название группы шаблонов
export async function deleteTemplateGroupName(id: number): Promise<void> {
  const res = await fetch(`/api/v1/scouting_report/template_group_names/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete template group name");
  }
}

// ======================
// TEMPLATE GROUPS API
// ======================

// Получить все группы шаблонов
export async function getTemplateGroups(): Promise<TemplateGroup[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_groups/`);

  if (!res.ok) {
    throw new Error("Failed to load template groups");
  }

  return res.json();
}

// Получить группу шаблонов по ID
export async function getTemplateGroupById(id: number): Promise<TemplateGroup> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_groups/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load template group with id ${id}`);
  }

  return res.json();
}

// Получить все группы шаблонов с названиями (для отображения)
export async function getTemplateGroupsWithNames(
  templateNames: Map<number, string>
): Promise<TemplateGroupWithNames[]> {
  const [groups, groupNames] = await Promise.all([
    getTemplateGroups(),
    getTemplateGroupNames()
  ]);

  const groupNameMap = new Map(groupNames.map(gn => [gn.id, gn.template_group_name]));

  return groups.map(group => ({
    ...group,
    template_group_name: groupNameMap.get(group.template_group_id) || 'Неизвестная группа',
    scout_report_template_name: templateNames.get(group.scout_report_template_id) || 'Неизвестный шаблон'
  }));
}

// Создать новую группу шаблонов
export async function createTemplateGroup(
  templateGroupId: number,
  scoutReportTemplateId: number
): Promise<number> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_groups/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_group_id: templateGroupId,
      scout_report_template_id: scoutReportTemplateId
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create template group");
  }

  const result = await res.json();
  return result.id;
}

// Обновить группу шаблонов
export async function updateTemplateGroup(
  id: number,
  templateGroupId: number,
  scoutReportTemplateId: number
): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_groups/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_group_id: templateGroupId,
      scout_report_template_id: scoutReportTemplateId
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update template group");
  }
}

// Удалить группу шаблонов
export async function deleteTemplateGroup(id: number): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_groups/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete template group");
  }
}

// ======================
// CROP GROUP NAMES API
// ======================

// Получить все названия групп культур
export async function getCropGroupNames(): Promise<CropGroupName[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_group_names/`);

  if (!res.ok) {
    throw new Error("Failed to load crop group names");
  }

  return res.json();
}

// Получить название группы культур по ID
export async function getCropGroupNameById(id: number): Promise<CropGroupName> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_group_names/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load crop group name with id ${id}`);
  }

  return res.json();
}

// Создать новое название группы культур
export async function createCropGroupName(name: string): Promise<number> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_group_names/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ crop_group_name: name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create crop group name");
  }

  const result = await res.json();
  return result.id;
}

// Обновить название группы культур
export async function updateCropGroupName(id: number, name: string): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_group_names/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ crop_group_name: name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update crop group name");
  }
}

// Удалить название группы культур
export async function deleteCropGroupName(id: number): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_group_names/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete crop group name");
  }
}

// ======================
// CROP GROUPS API
// ======================

// Получить все группы культур
export async function getCropGroups(): Promise<CropGroup[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_groups/`);

  if (!res.ok) {
    throw new Error("Failed to load crop groups");
  }

  return res.json();
}

// Получить группу культур по ID
export async function getCropGroupById(id: number): Promise<CropGroup> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_groups/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load crop group with id ${id}`);
  }

  return res.json();
}

// Получить все группы культур с названиями (для отображения)
export async function getCropGroupsWithNames(
  cropNames: Map<number, string>
): Promise<CropGroupWithNames[]> {
  const [groups, groupNames] = await Promise.all([
    getCropGroups(),
    getCropGroupNames()
  ]);

  const groupNameMap = new Map(groupNames.map(gn => [gn.id, gn.crop_group_name]));

  return groups.map(group => ({
    ...group,
    crop_group_name: groupNameMap.get(group.crop_group_id) || 'Неизвестная группа',
    crop_name: cropNames.get(group.crop_id) || 'Неизвестная культура'
  }));
}

// Создать новую группу культур
export async function createCropGroup(
  cropGroupId: number,
  cropId: number
): Promise<number> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_groups/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      crop_group_id: cropGroupId,
      crop_id: cropId
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create crop group");
  }

  const result = await res.json();
  return result.id;
}

// Обновить группу культур
export async function updateCropGroup(
  id: number,
  cropGroupId: number,
  cropId: number
): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_groups/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      crop_group_id: cropGroupId,
      crop_id: cropId
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update crop group");
  }
}

// Удалить группу культур
export async function deleteCropGroup(id: number): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/crop_groups/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete crop group");
  }
}

// ======================
// Вспомогательные функции для работы с группами
// ======================

// Получить все шаблоны в группе
export async function getTemplatesInGroup(groupId: number): Promise<number[]> {
  const groups = await getTemplateGroups();
  return groups
    .filter(g => g.template_group_id === groupId)
    .map(g => g.scout_report_template_id);
}

// Получить все культуры в группе
export async function getCropsInGroup(groupId: number): Promise<number[]> {
  const groups = await getCropGroups();
  return groups
    .filter(g => g.crop_group_id === groupId)
    .map(g => g.crop_id);
}

// Проверить, есть ли шаблон в группе
export async function isTemplateInGroup(
  templateId: number,
  groupId: number
): Promise<boolean> {
  const groups = await getTemplateGroups();
  return groups.some(g => 
    g.scout_report_template_id === templateId && 
    g.template_group_id === groupId
  );
}

// Проверить, есть ли культура в группе
export async function isCropInGroup(
  cropId: number,
  groupId: number
): Promise<boolean> {
  const groups = await getCropGroups();
  return groups.some(g => 
    g.crop_id === cropId && 
    g.crop_group_id === groupId
  );
}

// Получить группы для конкретного шаблона
export async function getGroupsForTemplate(templateId: number): Promise<TemplateGroup[]> {
  const groups = await getTemplateGroups();
  return groups.filter(g => g.scout_report_template_id === templateId);
}

// Получить группы для конкретной культуры
export async function getGroupsForCrop(cropId: number): Promise<CropGroup[]> {
  const groups = await getCropGroups();
  return groups.filter(g => g.crop_id === cropId);
}

// api/scoutingReportApi.ts
// Добавим в конец файла

import type { 
  TemplateGroupCropGroup,
  TemplateGroupCropGroupMeasurement,
  TemplateGroupCropGroupWithDetails 
} from "../types/groups";

// ======================
// TEMPLATE GROUP CROP GROUPS API
// ======================

// Получить все связи групп шаблонов с группами культур
export async function getTemplateGroupCropGroups(): Promise<TemplateGroupCropGroup[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_groups/`);

  if (!res.ok) {
    throw new Error("Failed to load template group crop groups");
  }

  return res.json();
}

// Получить связь по ID
export async function getTemplateGroupCropGroupById(id: number): Promise<TemplateGroupCropGroup> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_groups/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load template group crop group with id ${id}`);
  }

  return res.json();
}

// Получить связи по ID группы шаблонов
export async function getTemplateGroupCropGroupsByTemplateGroupId(templateGroupId: number): Promise<TemplateGroupCropGroup[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_groups/?template_group_id=${templateGroupId}`);

  if (!res.ok) {
    throw new Error(`Failed to load template group crop groups for template group ${templateGroupId}`);
  }

  return res.json();
}

// Получить связи по ID группы культур
export async function getTemplateGroupCropGroupsByCropGroupId(cropGroupId: number): Promise<TemplateGroupCropGroup[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_groups/?crop_group_id=${cropGroupId}`);

  if (!res.ok) {
    throw new Error(`Failed to load template group crop groups for crop group ${cropGroupId}`);
  }

  return res.json();
}

// Создать новую связь группы шаблонов с группой культур
export async function createTemplateGroupCropGroup(
  templateGroupId: number,
  cropGroupId: number
): Promise<number> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_groups/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_group_id: templateGroupId,
      crop_group_id: cropGroupId
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create template group crop group");
  }

  const result = await res.json();
  return result.id;
}

// Удалить связь группы шаблонов с группой культур
export async function deleteTemplateGroupCropGroup(id: number): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_groups/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete template group crop group");
  }
}

// ======================
// TEMPLATE GROUP CROP GROUP MEASUREMENTS API
// ======================

// Получить все измерения для связей групп
export async function getTemplateGroupCropGroupMeasurements(): Promise<TemplateGroupCropGroupMeasurement[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_group_measurements/`);

  if (!res.ok) {
    throw new Error("Failed to load template group crop group measurements");
  }

  return res.json();
}

// Получить измерение по ID
export async function getTemplateGroupCropGroupMeasurementById(id: number): Promise<TemplateGroupCropGroupMeasurement> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_group_measurements/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load template group crop group measurement with id ${id}`);
  }

  return res.json();
}

// Получить измерения по ID связки групп
export async function getMeasurementsByTemplateGroupCropGroupId(tgcgId: number): Promise<TemplateGroupCropGroupMeasurement[]> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_group_measurements/?template_group_crop_group_id=${tgcgId}`);

  if (!res.ok) {
    throw new Error(`Failed to load measurements for template group crop group ${tgcgId}`);
  }

  return res.json();
}

// Создать новое измерение для связки групп
export async function createTemplateGroupCropGroupMeasurement(
  templateGroupCropGroupId: number,
  measurementTypeId: number
): Promise<number> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_group_measurements/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_group_crop_group_id: templateGroupCropGroupId,
      scout_report_measurement_type_id: measurementTypeId
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create template group crop group measurement");
  }

  const result = await res.json();
  return result.id;
}

// Удалить измерение из связки групп
export async function deleteTemplateGroupCropGroupMeasurement(id: number): Promise<void> {
  const res = await fetch(`/api/v1/risc_scouting_report/template_group_crop_group_measurements/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete template group crop group measurement");
  }
}

// ======================
// Вспомогательные функции
// ======================

// Получить все данные для отображения на фронте
export async function getTemplateGroupCropGroupsWithDetails(
  templateGroupNames: TemplateGroupName[],
  cropGroupNames: CropGroupName[]
): Promise<TemplateGroupCropGroupWithDetails[]> {
  const [groups, measurements] = await Promise.all([
    getTemplateGroupCropGroups(),
    getTemplateGroupCropGroupMeasurements()
  ]);

  const templateGroupNameMap = new Map(templateGroupNames.map(tg => [tg.id, tg.template_group_name]));
  const cropGroupNameMap = new Map(cropGroupNames.map(cg => [cg.id, cg.crop_group_name]));

  return groups.map(group => ({
    ...group,
    template_group_name: templateGroupNameMap.get(group.template_group_id) || 'Неизвестная группа',
    crop_group_name: cropGroupNameMap.get(group.crop_group_id) || 'Неизвестная группа',
    measurements: measurements.filter(m => m.template_group_crop_group_id === group.id)
  }));
}

// Получить ID связки групп по IDs групп
export async function getTemplateGroupCropGroupId(
  templateGroupId: number,
  cropGroupId: number
): Promise<number | null> {
  const groups = await getTemplateGroupCropGroups();
  const found = groups.find(
    g => g.template_group_id === templateGroupId && g.crop_group_id === cropGroupId
  );
  return found?.id || null;
}
