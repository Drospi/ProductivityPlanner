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

export const DailyReviewModal = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const {
    events,
    tasks,
    goals,
    settings,
    toggleEventCompletion,
    toggleTaskCompletion,
    rescheduleTask,
    rescheduleEvent,
    recordReplacementActivity,
  } = useAppData();

  // State for replacement forms per item: { [itemId]: { text, goalId, actionForOriginal, isSaved, savedTitle, savedGoalName } }
  const [replacements, setReplacements] = useState({});
  const [activeFormItemId, setActiveFormItemId] = useState(null);

  if (!visible) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 1. Actividades programadas para hoy (eventos regulares)
  const scheduledEventsToday = (events || [])
    .filter((e) => e.date === todayStr && !e.isBackupPlan)
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
  const completedPlanned = allPlannedItems.filter((i) => i.isCompleted).length;
  const pendingPlanned = allPlannedItems.filter((i) => !i.isCompleted);
  const plannedProgressPercent = totalPlanned > 0 ? Math.round((completedPlanned / totalPlanned) * 100) : 0;

  // Manejo de marcar Realizada / No Realizada
  const handleToggleItem = (item, forcedStatus) => {
    if (item.type === 'event') {
      toggleEventCompletion(item.id, forcedStatus);
    } else {
      toggleTaskCompletion(item.id, todayStr);
    }

    if (forcedStatus === false) {
      setActiveFormItemId(item.id);
      if (!replacements[item.id]) {
        setReplacements((prev) => ({
          ...prev,
          [item.id]: {
            text: '',
            goalId: item.linkedGoalId || null,
            actionForOriginal: 'tomorrow',
            isSaved: false,
          },
        }));
      }
    } else if (forcedStatus === true) {
      if (activeFormItemId === item.id) {
        setActiveFormItemId(null);
      }
    }
  };

  // Guardar actividad de reemplazo conectada a metas
  const handleSaveReplacement = async (item) => {
    const repState = replacements[item.id] || {};
    const text = (repState.text || '').trim();

    if (!text) {
      Alert.alert('Actividad en su lugar', 'Por favor escribe qué hiciste o selecciona un plan de respaldo.');
      return;
    }

    const linkedGoal = goals.find((g) => g.id === repState.goalId);

    await recordReplacementActivity({
      originalItemId: item.id,
      originalItemType: item.type,
      replacementTitle: text,
      category: item.category || 'Personal',
      linkedGoalId: repState.goalId || null,
      date: todayStr,
      startTime: item.type === 'event' ? item.rawItem.startTime : '12:00',
      endTime: item.type === 'event' ? item.rawItem.endTime : '13:00',
      actionForOriginal: repState.actionForOriginal || 'tomorrow',
    });

    setReplacements((prev) => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        isSaved: true,
        savedTitle: text,
        savedGoalName: linkedGoal ? linkedGoal.name : null,
      },
    }));

    setActiveFormItemId(null);

    Alert.alert(
      '¡Actividad Guardada!',
      linkedGoal
        ? `Se registró "${text}" y se sumó +1 a tu meta "${linkedGoal.name}".`
        : `Se registró "${text}" como actividad realizada hoy.`
    );
  };

  // Seleccionar plan de respaldo existente
  const handleSelectBackupPlan = (item, backupEv) => {
    setReplacements((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || {}),
        text: backupEv.title,
        goalId: backupEv.linkedGoalId || prev[item.id]?.goalId || null,
      },
    }));
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
    Alert.alert(
      '¡Día Cerrado con Éxito! 🌙',
      'Excelente trabajo hoy. Tu esfuerzo diario quedó registrado y conectado a tus metas. ¡Descansa bien!',
      [{ text: 'Aceptar', onPress: onClose }]
    );
  };

  // Metas con progreso registrado hoy
  const goalsWithTodayProgress = (goals || [])
    .map((g) => {
      const historyToday = (g.dailyHistory && g.dailyHistory[todayStr]) || 0;
      const eventsTodayCount = (events || []).filter(
        (e) => e.date === todayStr && e.completed && e.linkedGoalId === g.id
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
                    ? 'No tenías actividades agendadas hoy. Revisa tus metas y organiza mañana.'
                    : `Planificaste ${totalPlanned} actividades: ${completedPlanned} realizadas y ${pendingPlanned.length} pendientes.`}
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

          {/* Section: Everything Planned Today */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              TODO LO PLANIFICADO PARA HOY ({totalPlanned})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Confirma si lo realizaste o registra qué hiciste en su lugar para mantener conectadas tus metas.
            </Text>
          </View>

          {totalPlanned === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.surfaceBorder }]}>
              <Feather name="calendar" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No tenías actividades agendadas en tu calendario o lista para hoy.
              </Text>
            </View>
          ) : (
            allPlannedItems.map((item) => {
              const repState = replacements[item.id] || {};
              const isFormOpen = activeFormItemId === item.id;
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
                        Sustituido por: <Text style={{ fontWeight: '800' }}>"{repState.savedTitle}"</Text>
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
                        {!item.isCompleted ? 'No Realizada ✗' : 'No se hizo'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* "¿Qué hiciste en su lugar?" Section (if not completed or form active) */}
                  {!item.isCompleted && !repState.isSaved && (
                    <View style={[styles.replacementContainer, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                      <View style={styles.rowBetween}>
                        <View style={styles.rowAlign}>
                          <Ionicons name="git-branch-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.repHeaderTitle, { color: colors.textPrimary }]}>
                            ¿Qué hiciste en su lugar?
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => setActiveFormItemId(isFormOpen ? null : item.id)}>
                          <Feather name={isFormOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {isFormOpen ? (
                        <View style={{ marginTop: 10 }}>
                          <Text style={[styles.repHelperText, { color: colors.textSecondary }]}>
                            Si el plan cambió, registra lo que hiciste para vincularlo con tus metas y no perder el impacto.
                          </Text>

                          {/* Quick Option: Backup Plans available */}
                          {backupEventsToday.length > 0 && (
                            <View style={styles.backupOptionsBox}>
                              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
                                PLANES DE RESPALDO DETECTADOS HOY:
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
                                  onPress={() => handleSelectBackupPlan(item, bEv)}
                                >
                                  <Ionicons name="flash-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.backupBtnText, { color: colors.textPrimary }]} numberOfLines={1}>
                                    Usar Plan B: {bEv.title}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}

                          {/* Input field */}
                          <Text style={[styles.miniLabel, { color: colors.textSecondary, marginTop: 8 }]}>
                            ACTIVIDAD QUE REALIZASTE:
                          </Text>
                          <TextInput
                            style={[
                              styles.repInput,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.surfaceBorder,
                                color: colors.textPrimary,
                              },
                            ]}
                            placeholder="Ej: Contacté en otra zona, visita imprevista, etc."
                            placeholderTextColor={colors.textMuted}
                            value={repState.text || ''}
                            onChangeText={(val) =>
                              setReplacements((prev) => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), text: val },
                              }))
                            }
                          />

                          {/* Connect with Goal */}
                          <Text style={[styles.miniLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                            CONECTAR CON UNA META:
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

                          {/* Action for Original Item */}
                          <Text style={[styles.miniLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                            ¿QUÉ HACEMOS CON EL PENDIENTE ORIGINAL?
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
                              <Text style={[styles.actionOriginalText, { color: colors.textSecondary }]}>Solo descartar</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Submit Replacement Button */}
                          <TouchableOpacity
                            style={[styles.saveRepBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleSaveReplacement(item)}
                          >
                            <Feather name="check-circle" size={16} color="#0F1418" style={{ marginRight: 6 }} />
                            <Text style={styles.saveRepBtnText}>Registrar Sustitución & Conectar Meta</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={{ marginTop: 6 }}
                          onPress={() => setActiveFormItemId(item.id)}
                        >
                          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                            + Registrar qué hiciste en su lugar para tus metas
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
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
                Pasar todos los pendientes no realizados a mañana ({pendingPlanned.length})
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
            <Text style={styles.finishDayBtnText}>Completar Cierre del Día con Calma</Text>
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
  sectionHeaderRow: {
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
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
  repHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  repHelperText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
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
