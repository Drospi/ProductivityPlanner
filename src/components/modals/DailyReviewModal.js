import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import {
  DEFAULT_TELEMETRY_THRESHOLD_MINUTES,
  QUICK_APP_PRESETS,
  QUICK_REPLACEMENT_OPTIONS,
  getLocalDateStr,
  formatDuration,
  shouldRegisterTelemetryInCalendar,
  getDailyTelemetrySummary,
} from '../../utils/telemetry';

export const DailyReviewModal = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const {
    events,
    tasks,
    goals,
    settings,
    telemetryLogs,
    activeMinutesByDate,
    toggleEventCompletion,
    toggleTaskCompletion,
    rescheduleTask,
    rescheduleEvent,
    recordReplacementActivity,
    logAppTelemetry,
    syncTelemetryEntryToCalendar,
    syncAllPendingTelemetryToCalendar,
    updateTelemetryAppName,
    deleteTelemetryEntry,
  } = useAppData();

  // Collapsible states
  const [isTelemetryExpanded, setTelemetryExpanded] = useState(true);
  const [isQuickTelemetryFormOpen, setQuickTelemetryFormOpen] = useState(false);
  const [isUncompletedSectionExpanded, setUncompletedSectionExpanded] = useState(true);
  const [isCompletedSectionExpanded, setCompletedSectionExpanded] = useState(false);

  // Telemetry quick form state
  const [selectedAppName, setSelectedAppName] = useState('YouTube');
  const [selectedAppCategory, setSelectedAppCategory] = useState('Digital');
  const [customAppName, setCustomAppName] = useState('');
  const [selectedAppMinutes, setSelectedAppMinutes] = useState(25);
  const [customMinutesText, setCustomMinutesText] = useState('');

  // State for optional replacement collapsibles per uncompleted item:
  // { [itemId]: { text, category, goalId, actionForOriginal, isSaved, savedTitle, savedGoalName } }
  const [replacements, setReplacements] = useState({});
  const [expandedReplacementIds, setExpandedReplacementIds] = useState({});

  if (!visible) return null;

  const todayStr = getLocalDateStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  const thresholdMins = settings.telemetryThresholdMinutes ?? DEFAULT_TELEMETRY_THRESHOLD_MINUTES;
  const activeMinutesToday = (activeMinutesByDate && activeMinutesByDate[todayStr]) || 0;
  const telemetrySummary = getDailyTelemetrySummary(
    telemetryLogs,
    activeMinutesToday,
    todayStr,
    thresholdMins
  );

  // 1. Actividades programadas para hoy (excluye respaldo y bloques de telemetría)
  const scheduledEventsToday = (events || [])
    .filter((e) => e.date === todayStr && !e.isBackupPlan && !e.isTelemetry)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Planes de respaldo disponibles hoy
  const backupEventsToday = (events || []).filter((e) => e.date === todayStr && e.isBackupPlan);

  // 2. Tareas programadas o con vencimiento hoy
  const scheduledTasksToday = (tasks || []).filter((t) => {
    if (!t || t.status === 'archived') return false;
    if (t.type === 'diaria') return true;
    return t.dueDate === todayStr || t.plannedDate === todayStr;
  });

  // Lista unificada de todo lo planificado hoy
  const allPlannedItems = [
    ...scheduledEventsToday.map((e) => ({
      id: e.id,
      key: `ev_${e.id}`,
      type: 'event',
      title: e.title,
      timeStr: `${e.startTime || ''} - ${e.endTime || ''}`,
      category: e.category || 'General',
      isCompleted: !!e.completed,
      linkedGoalId: e.linkedGoalId,
      rawItem: e,
    })),
    ...scheduledTasksToday.map((t) => {
      const isDaily = t.type === 'diaria';
      const isDone = isDaily
        ? Array.isArray(t.completedDates) && t.completedDates.includes(todayStr)
        : !!t.completed;
      return {
        id: t.id,
        key: `task_${t.id}`,
        type: 'task',
        title: t.title,
        timeStr: isDaily ? 'Hábito diario' : 'Tarea del día',
        category: t.category || 'Tarea',
        isCompleted: isDone,
        linkedGoalId: t.linkedGoalId,
        rawItem: t,
      };
    }),
  ];

  const totalPlanned = allPlannedItems.length;
  const completedItems = allPlannedItems.filter((i) => i.isCompleted);
  const pendingPlanned = allPlannedItems.filter((i) => !i.isCompleted);
  const completedPlanned = completedItems.length;
  const plannedProgressPercent = totalPlanned > 0 ? Math.round((completedPlanned / totalPlanned) * 100) : 0;

  const toggleReplacementCollapsible = (itemId) => {
    setExpandedReplacementIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Manejo de marcar Realizada / No Realizada
  const handleToggleItem = (item, forcedStatus) => {
    if (item.type === 'event') {
      toggleEventCompletion(item.id, forcedStatus);
    } else {
      toggleTaskCompletion(item.id, todayStr);
    }

    if (forcedStatus === false) {
      if (!replacements[item.id]) {
        setReplacements((prev) => ({
          ...prev,
          [item.id]: {
            text: '',
            category: item.category || 'Personal',
            goalId: item.linkedGoalId || null,
            actionForOriginal: 'tomorrow',
            isSaved: false,
          },
        }));
      }
      // Keep it non-intrusive: ensure the uncompleted section is visible, but don't force open the optional form unless user taps it
    } else if (forcedStatus === true) {
      setExpandedReplacementIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Selección rápida de acceso directo ("¿Qué hiciste en su lugar?")
  const handleSelectQuickOption = (item, optionLabel, optionCategory = null) => {
    setReplacements((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || {}),
        text: optionLabel,
        category: optionCategory || prev[item.id]?.category || item.category || 'Personal',
        goalId: prev[item.id]?.goalId !== undefined ? prev[item.id].goalId : item.linkedGoalId || null,
        actionForOriginal: prev[item.id]?.actionForOriginal || 'tomorrow',
      },
    }));
  };

  // Guardar rápido con 1 toque o desde el formulario opcional
  const handleSaveReplacement = async (item, overrideTitle = null, overrideCategory = null) => {
    const repState = replacements[item.id] || {};
    const text = (overrideTitle || repState.text || '').trim();

    if (!text) {
      Alert.alert(
        'Opcional: actividad en su lugar',
        'Elige un acceso rápido o escribe qué hiciste, o simplemente deja cerrado este apartado si prefieres omitirlo.'
      );
      return;
    }

    const goalId = repState.goalId !== undefined ? repState.goalId : item.linkedGoalId || null;
    const linkedGoal = goals.find((g) => g.id === goalId);

    await recordReplacementActivity({
      originalItemId: item.id,
      originalItemType: item.type,
      replacementTitle: text,
      category: overrideCategory || repState.category || item.category || 'Personal',
      linkedGoalId: goalId,
      date: todayStr,
      startTime: item.type === 'event' ? item.rawItem.startTime : '12:00',
      endTime: item.type === 'event' ? item.rawItem.endTime : '13:00',
      actionForOriginal: repState.actionForOriginal || 'tomorrow',
    });

    setReplacements((prev) => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        text,
        isSaved: true,
        savedTitle: text,
        savedGoalName: linkedGoal ? linkedGoal.name : null,
      },
    }));

    setExpandedReplacementIds((prev) => ({ ...prev, [item.id]: false }));
  };

  // Registrar nueva telemetría manual rápida
  const handleLogTelemetryPress = () => {
    const appName = customAppName.trim() || selectedAppName;
    const parsedCustomMins = parseInt(customMinutesText, 10);
    const mins = !isNaN(parsedCustomMins) && parsedCustomMins > 0 ? parsedCustomMins : selectedAppMinutes;

    if (!appName || mins <= 0) {
      Alert.alert('Telemetría', 'Ingresa un nombre de app y minutos válidos.');
      return;
    }

    const result = logAppTelemetry({
      appName,
      minutes: mins,
      category: selectedAppCategory,
      date: todayStr,
      source: 'manual',
    });

    setCustomAppName('');
    setCustomMinutesText('');
    setQuickTelemetryFormOpen(false);

    if (result?.registeredInCalendar) {
      Alert.alert(
        'Registrado en Calendario 📱',
        `Pasaste ${mins} min en "${appName}" (> ${thresholdMins} min), así que se registró automáticamente en tu calendario de hoy.`
      );
    } else {
      Alert.alert(
        'Telemetría guardada',
        `Se registraron ${mins} min en "${appName}". Como no supera los ${thresholdMins} min, no se agregó al calendario.`
      );
    }
  };

  // Mover todos los pendientes a mañana
  const handlePostponeAllRemaining = () => {
    let count = 0;
    pendingPlanned.forEach((item) => {
      if (item.type === 'task') {
        rescheduleTask(item.id, tomorrowStr);
        count++;
      } else if (item.type === 'event') {
        rescheduleEvent(item.id, tomorrowStr);
        count++;
      }
    });

    Alert.alert('Pendientes reprogramados', `Se han pasado ${count} actividades a mañana.`);
  };

  // Cierre final
  const handleFinishDay = () => {
    const syncedCount = telemetrySummary.syncedToCalendarCount;
    const msg =
      syncedCount > 0
        ? `Tu jornada quedó cerrada, con ${syncedCount} bloque(s) de telemetría > ${thresholdMins} min reflejados en tu calendario. ¡Descansa bien!`
        : 'Excelente trabajo hoy. Tu esfuerzo diario quedó registrado y conectado a tus metas. ¡Descansa bien!';
    Alert.alert('¡Día Cerrado con Éxito! 🌙', msg, [{ text: 'Aceptar', onPress: onClose }]);
  };

  // Metas con progreso registrado hoy
  const goalsWithTodayProgress = (goals || [])
    .map((g) => {
      const historyToday = (g.dailyHistory && g.dailyHistory[todayStr]) || 0;
      const eventsTodayCount = (events || []).filter(
        (e) => e.date === todayStr && e.completed && !e.isTelemetry && e.linkedGoalId === g.id
      ).length;
      const tasksTodayCount = (tasks || []).filter((t) => {
        if (t.linkedGoalId !== g.id) return false;
        if (t.type === 'diaria') {
          return Array.isArray(t.completedDates) && t.completedDates.includes(todayStr);
        }
        return t.completed && (t.plannedDate === todayStr || t.dueDate === todayStr);
      }).length;

      const totalToday = Math.max(historyToday, eventsTodayCount + tasksTodayCount);
      return {
        goal: g,
        totalToday,
      };
    })
    .filter((item) => item.totalToday > 0);

  const effectiveQuickMinutes = (() => {
    const parsed = parseInt(customMinutesText, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : selectedAppMinutes;
  })();

  const renderPlannedItemCard = (item) => {
    const repState = replacements[item.id] || {};
    const isCollapsibleOpen = !!expandedReplacementIds[item.id];
    const linkedGoal = item.linkedGoalId ? goals.find((g) => g.id === item.linkedGoalId) : null;

    return (
      <View
        key={item.key}
        style={[
          styles.plannedCard,
          {
            backgroundColor: colors.surface,
            borderColor: item.isCompleted ? colors.success + '66' : colors.surfaceBorder,
          },
        ]}
      >
        {/* Top Bar of item: Badge & Time */}
        <View style={styles.rowBetween}>
          <View style={styles.rowAlign}>
            <Badge label={item.category} category={item.category} />
            {linkedGoal && (
              <View style={[styles.goalPill, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="trophy-outline" size={11} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={[styles.goalPillText, { color: colors.primary }]} numberOfLines={1}>
                  {linkedGoal.name}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.itemTimeText, { color: colors.textSecondary }]}>{item.timeStr}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.itemTitleMain, { color: colors.textPrimary }]}>{item.title}</Text>

        {/* Replacement Confirmation Badge if saved */}
        {repState.isSaved && (
          <View style={[styles.savedRepBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Feather name="check" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.savedRepText, { color: colors.textPrimary }]}>
              En su lugar: <Text style={{ fontWeight: '800' }}>"{repState.savedTitle}"</Text>
              {repState.savedGoalName ? ` (+1 a ${repState.savedGoalName})` : ''}
            </Text>
          </View>
        )}

        {/* Actions: ¿Realizada o No Realizada? */}
        <View style={styles.statusActionRow}>
          <TouchableOpacity
            style={[
              styles.statusBtn,
              item.isCompleted
                ? { backgroundColor: colors.success, borderColor: colors.success }
                : { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
            ]}
            onPress={() => handleToggleItem(item, true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={item.isCompleted ? '#0F1418' : colors.success}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.statusBtnText,
                { color: item.isCompleted ? '#0F1418' : colors.textPrimary },
              ]}
            >
              {item.isCompleted ? 'Realizada ✓' : 'Sí, Realizada'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusBtn,
              !item.isCompleted
                ? { backgroundColor: colors.warning + '22', borderColor: colors.warning }
                : { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
            ]}
            onPress={() => handleToggleItem(item, false)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={!item.isCompleted ? colors.warning : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.statusBtnText,
                { color: !item.isCompleted ? colors.warning : colors.textSecondary },
              ]}
            >
              {!item.isCompleted ? 'No completada' : 'No se hizo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible: Acceso rápido opcional "¿Qué hiciste en su lugar?" */}
        {!item.isCompleted && !repState.isSaved && (
          <View style={[styles.replacementContainer, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleReplacementCollapsible(item.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ expanded: isCollapsibleOpen }}
              accessibilityLabel={`Acceso rápido opcional para ${item.title}: qué hiciste en su lugar`}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.rowAlign}>
                  <Feather name="zap" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.repHeaderTitle, { color: colors.textPrimary }]}>
                    ¿Qué hiciste en su lugar?
                  </Text>
                  <View style={[styles.optionalPill, { backgroundColor: colors.surfaceBorder }]}>
                    <Text style={[styles.optionalPillText, { color: colors.textSecondary }]}>OPCIONAL</Text>
                  </View>
                </View>
                {!isCollapsibleOpen && (
                  <Text style={[styles.collapsedHintText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Acceso rápido: reunión, llamada, descanso, app...
                  </Text>
                )}
              </View>
              <Feather
                name={isCollapsibleOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isCollapsibleOpen && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.repHelperText, { color: colors.textSecondary }]}>
                  Es 100% opcional. Toca un acceso rápido para registrarlo sin esfuerzo o escribe algo breve.
                </Text>

                {/* Quick Access Chips (1-tap presets) */}
                <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
                  ACCESO RÁPIDO EN 1 TOQUE:
                </Text>
                <View style={styles.quickChipsGrid}>
                  {QUICK_REPLACEMENT_OPTIONS.map((opt) => {
                    const isSelected = repState.text === opt.label;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.quickAccessChip,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.surfaceBorder,
                          },
                        ]}
                        onPress={() => handleSelectQuickOption(item, opt.label, opt.category)}
                        activeOpacity={0.75}
                      >
                        <Feather
                          name={opt.icon}
                          size={12}
                          color={isSelected ? colors.primary : colors.textSecondary}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.quickAccessChipText,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Telemetry apps > threshold as quick replacement suggestions */}
                  {telemetrySummary.overThresholdLogs.map((tel) => {
                    const label = `Estuve en ${tel.appName} (${tel.minutes} min)`;
                    const isSelected = repState.text === label;
                    return (
                      <TouchableOpacity
                        key={`rep_tel_${tel.id}`}
                        style={[
                          styles.quickAccessChip,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                            borderColor: isSelected ? colors.primary : '#8B5CF655',
                          },
                        ]}
                        onPress={() => handleSelectQuickOption(item, label, tel.category)}
                        activeOpacity={0.75}
                      >
                        <Feather
                          name="smartphone"
                          size={12}
                          color={isSelected ? colors.primary : '#8B5CF6'}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.quickAccessChipText,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {tel.appName} ({tel.minutes}m)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Backup Plans detected */}
                {backupEventsToday.length > 0 && (
                  <View style={styles.backupOptionsBox}>
                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
                      PLANES DE RESPALDO DE HOY:
                    </Text>
                    {backupEventsToday.map((bEv) => (
                      <TouchableOpacity
                        key={`b_${bEv.id}`}
                        style={[
                          styles.backupBtn,
                          {
                            backgroundColor: repState.text === bEv.title ? colors.primaryLight : colors.surface,
                            borderColor: repState.text === bEv.title ? colors.primary : colors.surfaceBorder,
                          },
                        ]}
                        onPress={() => {
                          setReplacements((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...(prev[item.id] || {}),
                              text: bEv.title,
                              category: bEv.category || 'Personal',
                              goalId: bEv.linkedGoalId || prev[item.id]?.goalId || null,
                            },
                          }));
                        }}
                      >
                        <Ionicons name="flash-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.backupBtnText, { color: colors.textPrimary }]} numberOfLines={1}>
                          Plan B: {bEv.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Optional custom text input */}
                <TextInput
                  style={[
                    styles.repInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="O escribe qué hiciste (opcional)..."
                  placeholderTextColor={colors.textMuted}
                  value={repState.text || ''}
                  onChangeText={(val) =>
                    setReplacements((prev) => ({
                      ...prev,
                      [item.id]: { ...(prev[item.id] || {}), text: val },
                    }))
                  }
                />

                {/* Connect with Goal (optional) */}
                {goals.length > 0 && (
                  <>
                    <Text style={[styles.miniLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                      CONECTAR CON META (OPCIONAL):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalChipsScroll}>
                      <TouchableOpacity
                        style={[
                          styles.goalChip,
                          !repState.goalId
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                        ]}
                        onPress={() =>
                          setReplacements((prev) => ({
                            ...prev,
                            [item.id]: { ...(prev[item.id] || {}), goalId: null },
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.goalChipText,
                            { color: !repState.goalId ? '#0F1418' : colors.textSecondary },
                          ]}
                        >
                          Sin meta
                        </Text>
                      </TouchableOpacity>

                      {goals.map((g) => {
                        const isSel = repState.goalId === g.id;
                        return (
                          <TouchableOpacity
                            key={`chip_${g.id}`}
                            style={[
                              styles.goalChip,
                              isSel
                                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                            ]}
                            onPress={() =>
                              setReplacements((prev) => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), goalId: g.id },
                              }))
                            }
                          >
                            <Ionicons
                              name="trophy"
                              size={12}
                              color={isSel ? '#0F1418' : colors.primary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.goalChipText,
                                { color: isSel ? '#0F1418' : colors.textPrimary },
                              ]}
                            >
                              {g.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {/* Action for Original Item */}
                <Text style={[styles.miniLabel, { color: colors.textSecondary, marginTop: 6 }]}>
                  PENDIENTE ORIGINAL:
                </Text>
                <View style={styles.actionOriginalRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionOriginalBtn,
                      (repState.actionForOriginal || 'tomorrow') === 'tomorrow'
                        ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                    ]}
                    onPress={() =>
                      setReplacements((prev) => ({
                        ...prev,
                        [item.id]: { ...(prev[item.id] || {}), actionForOriginal: 'tomorrow' },
                      }))
                    }
                  >
                    <Feather name="calendar" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionOriginalText, { color: colors.textPrimary }]}>Mover a mañana</Text>
                  </TouchableOpacity>

                  {item.type === 'task' && (
                    <TouchableOpacity
                      style={[
                        styles.actionOriginalBtn,
                        repState.actionForOriginal === 'inbox'
                          ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                          : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                      ]}
                      onPress={() =>
                        setReplacements((prev) => ({
                          ...prev,
                          [item.id]: { ...(prev[item.id] || {}), actionForOriginal: 'inbox' },
                        }))
                      }
                    >
                      <Feather name="inbox" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionOriginalText, { color: colors.textPrimary }]}>A la bandeja</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.actionOriginalBtn,
                      repState.actionForOriginal === 'keep'
                        ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                    ]}
                    onPress={() =>
                      setReplacements((prev) => ({
                        ...prev,
                        [item.id]: { ...(prev[item.id] || {}), actionForOriginal: 'keep' },
                      }))
                    }
                  >
                    <Feather name="check" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionOriginalText, { color: colors.textSecondary }]}>Solo dejar así</Text>
                  </TouchableOpacity>
                </View>

                {/* Save or Skip buttons */}
                <View style={styles.repFooterActions}>
                  <TouchableOpacity
                    style={[
                      styles.skipRepBtn,
                      { borderColor: colors.surfaceBorder, backgroundColor: colors.surface },
                    ]}
                    onPress={() => toggleReplacementCollapsible(item.id)}
                  >
                    <Text style={[styles.skipRepBtnText, { color: colors.textSecondary }]}>Omitir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveRepBtn,
                      {
                        backgroundColor: (repState.text || '').trim() ? colors.primary : colors.surfaceBorder,
                        flex: 1,
                      },
                    ]}
                    onPress={() => handleSaveReplacement(item)}
                  >
                    <Feather
                      name="check-circle"
                      size={16}
                      color={(repState.text || '').trim() ? '#0F1418' : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.saveRepBtnText,
                        { color: (repState.text || '').trim() ? '#0F1418' : colors.textMuted },
                      ]}
                    >
                      Guardar actividad
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.topBar, { borderBottomColor: colors.surfaceBorder }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Cerrar revisión diaria"
            accessibilityRole="button"
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Cierre del Día</Text>
            <Text style={[styles.headerDate, { color: colors.primary }]}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Coach Greeting & Day Overview */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.coachHeader}>
              <View style={[styles.coachIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="moon" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.coachGreeting, { color: colors.textPrimary }]}>
                  Cierre de jornada, {settings.userName ? settings.userName.replace(/^(Elder|Hermana|Hno\.|Hna\.)\s*/i, '') : ''}.
                </Text>
                <Text style={[styles.coachSub, { color: colors.textSecondary }]}>
                  {totalPlanned === 0
                    ? 'No tenías actividades agendadas hoy. Revisa tu telemetría y organiza mañana.'
                    : `Planificaste ${totalPlanned} actividades: ${completedPlanned} realizadas y ${pendingPlanned.length} sin completar.`}
                </Text>
              </View>
            </View>

            {totalPlanned > 0 && (
              <View style={{ marginTop: 14 }}>
                <View style={[styles.rowBetween, { marginBottom: 6 }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                    CUMPLIMIENTO DEL DÍA
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                    {plannedProgressPercent}% ({completedPlanned}/{totalPlanned})
                  </Text>
                </View>
                <ProgressBar progress={plannedProgressPercent} color={colors.primary} height={8} />
              </View>
            )}
          </View>

          {/* SECTION: Telemetría del Día (Uso de Apps > 15 min -> Calendario) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <TouchableOpacity
              style={styles.rowBetween}
              onPress={() => setTelemetryExpanded((prev) => !prev)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ expanded: isTelemetryExpanded }}
            >
              <View style={[styles.rowAlign, { flex: 1, paddingRight: 8 }]}>
                <View style={[styles.telemetryIconBox, { backgroundColor: '#8B5CF622' }]}>
                  <Feather name="activity" size={16} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                    TELEMETRÍA DEL DÍA
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {telemetrySummary.overThresholdLogs.length > 0
                      ? `${telemetrySummary.overThresholdLogs.length} app(s) > ${thresholdMins} min • ${telemetrySummary.syncedToCalendarCount} en calendario`
                      : `Uso en app: ${formatDuration(telemetrySummary.activeMinutesToday)} • Regla > ${thresholdMins} min`}
                  </Text>
                </View>
              </View>
              <Feather
                name={isTelemetryExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isTelemetryExpanded && (
              <View style={{ marginTop: 14 }}>
                {/* KPI Strip */}
                <View style={styles.telemetryKpiRow}>
                  <View style={[styles.telemetryKpiBox, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.telemetryKpiVal, { color: colors.primary }]}>
                      {formatDuration(telemetrySummary.activeMinutesToday)}
                    </Text>
                    <Text style={[styles.telemetryKpiLabel, { color: colors.textSecondary }]}>En este planner</Text>
                  </View>
                  <View style={[styles.telemetryKpiBox, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.telemetryKpiVal, { color: '#8B5CF6' }]}>
                      {formatDuration(telemetrySummary.totalExternalMinutes)}
                    </Text>
                    <Text style={[styles.telemetryKpiLabel, { color: colors.textSecondary }]}>Otras apps hoy</Text>
                  </View>
                  <View style={[styles.telemetryKpiBox, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.telemetryKpiVal, { color: colors.success }]}>
                      {telemetrySummary.syncedToCalendarCount}
                    </Text>
                    <Text style={[styles.telemetryKpiLabel, { color: colors.textSecondary }]}>En calendario</Text>
                  </View>
                </View>

                {/* Pending auto-sync action if any */}
                {telemetrySummary.pendingCalendarSync.length > 0 && (
                  <TouchableOpacity
                    style={[styles.syncTelemetryBtn, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => {
                      const count = syncAllPendingTelemetryToCalendar(todayStr);
                      Alert.alert(
                        'Calendario Actualizado',
                        `Se registraron ${count} bloques de uso (> ${thresholdMins} min) en tu calendario.`
                      );
                    }}
                  >
                    <Feather name="calendar" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.syncTelemetryBtnText}>
                      Registrar {telemetrySummary.pendingCalendarSync.length} app(s) &gt; {thresholdMins} min en calendario
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Telemetry Logs List */}
                {telemetrySummary.logsToday.length === 0 ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginVertical: 8 }}>
                    Aún no hay sesiones de otras apps registradas hoy. Cuando salgas de la app más de {thresholdMins} min o registres un uso, aparecerá aquí.
                  </Text>
                ) : (
                  telemetrySummary.logsToday.map((tel) => {
                    const qualifies = shouldRegisterTelemetryInCalendar(tel.minutes, thresholdMins);
                    const needsLabel = tel.source === 'auto_appstate' && tel.appName === 'App externa detectada';

                    return (
                      <View
                        key={tel.id}
                        style={[
                          styles.telemetryRowCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: tel.registeredInCalendar ? '#8B5CF655' : colors.surfaceBorder,
                          },
                        ]}
                      >
                        <View style={styles.rowBetween}>
                          <View style={[styles.rowAlign, { flex: 1 }]}>
                            <Feather
                              name="smartphone"
                              size={15}
                              color={qualifies ? '#8B5CF6' : colors.textSecondary}
                              style={{ marginRight: 8 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.telemetryAppName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {tel.appName}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                {tel.startTime} - {tel.endTime} • {tel.minutes} min
                                {tel.source === 'auto_appstate' ? ' (auto-detectado)' : ''}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.rowAlign}>
                            {tel.registeredInCalendar ? (
                              <View style={[styles.calSyncedPill, { backgroundColor: '#8B5CF622' }]}>
                                <Feather name="check" size={11} color="#8B5CF6" style={{ marginRight: 3 }} />
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#8B5CF6' }}>Calendario</Text>
                              </View>
                            ) : qualifies ? (
                              <TouchableOpacity
                                style={[styles.calSyncMiniBtn, { backgroundColor: '#8B5CF6' }]}
                                onPress={() => syncTelemetryEntryToCalendar(tel.id)}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>+ Calendario</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={[styles.calSyncedPill, { backgroundColor: colors.surfaceBorder }]}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
                                  ≤ {thresholdMins} min
                                </Text>
                              </View>
                            )}

                            <TouchableOpacity
                              onPress={() => deleteTelemetryEntry(tel.id)}
                              style={{ padding: 6, marginLeft: 4 }}
                              accessibilityLabel={`Eliminar registro de ${tel.appName}`}
                            >
                              <Feather name="trash-2" size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Quick label chips for auto-detected away sessions */}
                        {needsLabel && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>
                              ¿En qué app estuviste? (1 toque para etiquetar):
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              {QUICK_APP_PRESETS.map((preset) => (
                                <TouchableOpacity
                                  key={`lbl_${tel.id}_${preset.id}`}
                                  style={[
                                    styles.miniLabelChip,
                                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                                  ]}
                                  onPress={() => updateTelemetryAppName(tel.id, preset.label, preset.category)}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textPrimary }}>
                                    {preset.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}

                {/* Quick "+ Registrar uso de app" toggle & inline form */}
                <TouchableOpacity
                  style={[
                    styles.addTelemetryToggle,
                    { borderColor: colors.surfaceBorder, backgroundColor: colors.card },
                  ]}
                  onPress={() => setQuickTelemetryFormOpen((prev) => !prev)}
                >
                  <Feather
                    name={isQuickTelemetryFormOpen ? 'minus-circle' : 'plus-circle'}
                    size={15}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    {isQuickTelemetryFormOpen ? 'Cerrar registro de app' : 'Registrar tiempo en una app'}
                  </Text>
                </TouchableOpacity>

                {isQuickTelemetryFormOpen && (
                  <View style={[styles.quickTelemetryBox, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>SELECCIONA APP:</Text>
                    <View style={styles.quickChipsGrid}>
                      {QUICK_APP_PRESETS.map((preset) => {
                        const isSel = selectedAppName === preset.label && !customAppName.trim();
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            style={[
                              styles.quickAccessChip,
                              {
                                backgroundColor: isSel ? '#8B5CF622' : colors.surface,
                                borderColor: isSel ? '#8B5CF6' : colors.surfaceBorder,
                              },
                            ]}
                            onPress={() => {
                              setSelectedAppName(preset.label);
                              setSelectedAppCategory(preset.category);
                              setCustomAppName('');
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#8B5CF6' : colors.textPrimary }}>
                              {preset.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      style={[
                        styles.repInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.surfaceBorder,
                          color: colors.textPrimary,
                          marginBottom: 10,
                        },
                      ]}
                      placeholder="O escribe otra app (ej. X, Spotify, Juegos)..."
                      placeholderTextColor={colors.textMuted}
                      value={customAppName}
                      onChangeText={setCustomAppName}
                    />

                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>TIEMPO EN LA APP:</Text>
                    <View style={styles.durationChipsRow}>
                      {[10, 15, 20, 30, 45, 60].map((mins) => {
                        const isSel = selectedAppMinutes === mins && !customMinutesText.trim();
                        const isOver = shouldRegisterTelemetryInCalendar(mins, thresholdMins);
                        return (
                          <TouchableOpacity
                            key={mins}
                            style={[
                              styles.durationChip,
                              {
                                backgroundColor: isSel ? (isOver ? '#8B5CF6' : colors.primary) : colors.surface,
                                borderColor: isSel ? (isOver ? '#8B5CF6' : colors.primary) : colors.surfaceBorder,
                              },
                            ]}
                            onPress={() => {
                              setSelectedAppMinutes(mins);
                              setCustomMinutesText('');
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: isSel ? '#FFFFFF' : colors.textPrimary,
                              }}
                            >
                              {mins}m
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 11, color: shouldRegisterTelemetryInCalendar(effectiveQuickMinutes, thresholdMins) ? '#8B5CF6' : colors.textSecondary, fontWeight: '600', marginBottom: 10 }}>
                      {shouldRegisterTelemetryInCalendar(effectiveQuickMinutes, thresholdMins)
                        ? `✓ Supera ${thresholdMins} min: se registrará automáticamente en el calendario.`
                        : `• No supera ${thresholdMins} min: solo queda en telemetría sin saturar tu calendario.`}
                    </Text>

                    <TouchableOpacity
                      style={[styles.saveRepBtn, { backgroundColor: '#8B5CF6' }]}
                      onPress={handleLogTelemetryPress}
                    >
                      <Feather name="activity" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={[styles.saveRepBtnText, { color: '#FFFFFF' }]}>Guardar en Telemetría</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Impact on Goals Summary */}
          {goalsWithTodayProgress.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={[styles.rowAlign, { marginBottom: 10 }]}>
                <Ionicons name="trophy" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                  IMPACTO EN TUS METAS HOY
                </Text>
              </View>

              {goalsWithTodayProgress.map(({ goal, totalToday }) => {
                const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                return (
                  <View key={`g_sum_${goal.id}`} style={styles.goalImpactRow}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.goalImpactName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      <View style={[styles.todayTag, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.todayTagText, { color: colors.primary }]}>
                          +{totalToday} hoy
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.rowBetween, { marginTop: 4, marginBottom: 4 }]}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        Progreso semanal: {goal.currentValue}/{goal.targetValue} {goal.unit}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{percent}%</Text>
                    </View>
                    <ProgressBar progress={percent} color={colors.primary} height={5} />
                  </View>
                );
              })}
            </View>
          )}

          {/* Section: Pendientes / No Completadas (Collapsible) */}
          {totalPlanned === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.surfaceBorder }]}>
              <Feather name="calendar" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No tenías actividades agendadas en tu calendario o lista para hoy.
              </Text>
            </View>
          ) : (
            <>
              {/* Uncompleted Items Collapsible Group */}
              {pendingPlanned.length > 0 && (
                <View style={styles.sectionBlock}>
                  <TouchableOpacity
                    style={[styles.groupHeaderCard, { backgroundColor: colors.surface, borderColor: colors.warning + '55' }]}
                    onPress={() => setUncompletedSectionExpanded((prev) => !prev)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isUncompletedSectionExpanded }}
                  >
                    <View style={[styles.rowAlign, { flex: 1 }]}>
                      <Ionicons name="time-outline" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                          SIN COMPLETAR HOY ({pendingPlanned.length})
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                          Si no las completaste, tienes acceso rápido opcional para registrar qué hiciste.
                        </Text>
                      </View>
                    </View>
                    <Feather
                      name={isUncompletedSectionExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isUncompletedSectionExpanded && (
                    <View style={{ marginTop: 10 }}>
                      {pendingPlanned.map((item) => renderPlannedItemCard(item))}
                    </View>
                  )}
                </View>
              )}

              {/* Completed Items Collapsible Group */}
              {completedItems.length > 0 && (
                <View style={styles.sectionBlock}>
                  <TouchableOpacity
                    style={[styles.groupHeaderCard, { backgroundColor: colors.surface, borderColor: colors.success + '55' }]}
                    onPress={() => setCompletedSectionExpanded((prev) => !prev)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isCompletedSectionExpanded }}
                  >
                    <View style={[styles.rowAlign, { flex: 1 }]}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        COMPLETADAS HOY ({completedItems.length})
                      </Text>
                    </View>
                    <Feather
                      name={isCompletedSectionExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isCompletedSectionExpanded && (
                    <View style={{ marginTop: 10 }}>
                      {completedItems.map((item) => renderPlannedItemCard(item))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* Postpone Remaining Button */}
          {pendingPlanned.length > 0 && (
            <TouchableOpacity
              style={[styles.postponeAllBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
              onPress={handlePostponeAllRemaining}
              activeOpacity={0.8}
            >
              <Feather name="arrow-right" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.postponeAllText, { color: colors.textPrimary }]}>
                Pasar los pendientes a mañana ({pendingPlanned.length})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bottom Bar: Complete Review */}
        <View style={[styles.bottomBar, { borderTopColor: colors.surfaceBorder, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.finishDayBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinishDay}
            activeOpacity={0.85}
            accessibilityLabel="Completar cierre del día con calma"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-done" size={20} color="#0F1418" style={{ marginRight: 8 }} />
            <Text style={styles.finishDayBtnText}>Completar Cierre del Día</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerDate: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachGreeting: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  coachSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  telemetryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  telemetryKpiBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  telemetryKpiVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  telemetryKpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  syncTelemetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  syncTelemetryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  telemetryRowCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  telemetryAppName: {
    fontSize: 13,
    fontWeight: '700',
  },
  calSyncedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calSyncMiniBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  miniLabelChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginRight: 6,
  },
  addTelemetryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  quickTelemetryBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  durationChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalImpactRow: {
    marginBottom: 10,
  },
  goalImpactName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  todayTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  todayTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionBlock: {
    marginBottom: 14,
  },
  groupHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  plannedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    maxWidth: 160,
  },
  goalPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemTitleMain: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  statusActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedRepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  savedRepText: {
    fontSize: 12,
    flex: 1,
  },
  replacementContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionalPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  optionalPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  collapsedHintText: {
    fontSize: 11,
    marginTop: 3,
  },
  repHelperText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  quickChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  quickAccessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickAccessChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  backupOptionsBox: {
    marginBottom: 8,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  backupBtnText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  repInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  goalChipsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  goalChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionOriginalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  actionOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionOriginalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  repFooterActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  skipRepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipRepBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveRepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveRepBtnText: {
    color: '#0F1418',
    fontSize: 13,
    fontWeight: '800',
  },
  postponeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 20,
    minHeight: 48,
  },
  postponeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  finishDayBtn: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishDayBtnText: {
    color: '#0F1418',
    fontSize: 15,
    fontWeight: '800',
  },
});
