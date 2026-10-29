import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { getDayGreetingContext, getRecommendedActions } from '../utils/coach';

export const HomeScreen = ({
  onOpenNewEvent,
  onOpenNewTask,
  onSelectEvent,
  onSwitchToTab,
  onStartFocusSession,
  onOpenReschedule,
  onOpenDailyReview,
}) => {
  const { colors } = useTheme();
  const { events, tasks, goals, settings, toggleTaskCompletion } = useAppData();

  const [alternativeIndex, setAlternativeIndex] = useState(0);

  const todayStr = new Date().toISOString().split('T')[0];

  // Eventos de hoy
  const todayEvents = (events || []).filter((e) => e.date === todayStr);
  const nextEvent = todayEvents
    .filter((e) => !e.completed && !e.isBackupPlan)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))[0];

  // Tareas de hoy
  const todayTasks = (tasks || []).filter((t) => {
    if (!t || t.status === 'archived') return false;
    if (t.type === 'diaria') return true;
    return t.dueDate === todayStr || t.plannedDate === todayStr;
  });

  // Saludo contextual
  const greeting = getDayGreetingContext(settings.userName, todayEvents, todayTasks);

  // Motor determinista de recomendación
  const recommendation = getRecommendedActions(events, tasks, goals);
  const allCandidates = recommendation.primary
    ? [recommendation.primary, ...recommendation.alternatives]
    : [];

  const currentAction =
    allCandidates.length > 0
      ? allCandidates[alternativeIndex % allCandidates.length]
      : null;

  const handleCycleAlternative = () => {
    if (allCandidates.length > 1) {
      setAlternativeIndex((prev) => (prev + 1) % allCandidates.length);
    }
  };

  // Progreso diario discreto y sin juicios
  const completedEventsCount = todayEvents.filter((e) => e.completed).length;
  const completedTasksCount = todayTasks.filter((t) => {
    if (t.type === 'diaria') {
      return Array.isArray(t.completedDates) && t.completedDates.includes(todayStr);
    }
    return t.completed;
  }).length;

  const totalDailyActivities = todayEvents.length + todayTasks.length;
  const completedDailyActivities = completedEventsCount + completedTasksCount;
  const dailyProgressPercent =
    totalDailyActivities > 0
      ? Math.round((completedDailyActivities / totalDailyActivities) * 100)
      : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Saludo breve y contexto del día */}
      <View style={styles.greetingSection}>
        <Text style={[styles.dateSubTitle, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).toUpperCase()}
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
          {greeting.timeGreeting}, {greeting.name}.
        </Text>
        <Text style={[styles.contextNote, { color: colors.textSecondary }]}>
          {greeting.summaryNote}
        </Text>
      </View>

      {/* 2. Tarjeta Principal: Siguiente Acción Recomendada */}
      {currentAction ? (
        <View
          style={[
            styles.coachCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          {/* Top Tag & Context */}
          <View style={styles.coachCardHeader}>
            <View style={styles.recommendationBadge}>
              <View style={[styles.sparkleDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.recommendationBadgeText, { color: colors.primary }]}>
                SIGUIENTE ACCIÓN
              </Text>
            </View>

            {currentAction.timeContext && (
              <View style={styles.timeTag}>
                <Feather name="clock" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.timeTagText, { color: colors.textSecondary }]}>
                  {currentAction.timeContext}
                </Text>
              </View>
            )}
          </View>

          {/* Title & Reason */}
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            {currentAction.title}
          </Text>

          <View style={[styles.reasonContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.reasonText, { color: colors.textPrimary }]}>
              {currentAction.reason}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            {/* Primary: Empezar */}
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={() => onStartFocusSession && onStartFocusSession(currentAction)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Empezar ${currentAction.title}`}
            >
              <Feather name="play" size={18} color="#0F1418" style={{ marginRight: 6 }} />
              <Text style={styles.startBtnText}>Empezar</Text>
            </TouchableOpacity>

            {/* Secondary: Elegir otra */}
            {allCandidates.length > 1 && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.card }]}
                onPress={handleCycleAlternative}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Elegir otra actividad alternativa"
              >
                <Feather name="refresh-cw" size={16} color={colors.textSecondary} />
                <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                  Elegir otra
                </Text>
              </TouchableOpacity>
            )}

            {/* Secondary: Posponer / Reprogramar */}
            <TouchableOpacity
              style={[styles.iconActionBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.card }]}
              onPress={() => onOpenReschedule && onOpenReschedule(currentAction.item, currentAction.itemType)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Posponer o reprogramar esta actividad"
            >
              <Feather name="calendar" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Estado vacío útil y calmado */
        <View style={[styles.emptyCoachCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyCoachTitle, { color: colors.textPrimary }]}>
            Estás al día por ahora
          </Text>
          <Text style={[styles.emptyCoachSub, { color: colors.textSecondary }]}>
            No tienes tareas pendientes urgentes. ¿Quieres capturar una idea o revisar tu plan semanal?
          </Text>
          <TouchableOpacity
            style={[styles.quickAddBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={onOpenNewTask}
            accessibilityRole="button"
            accessibilityLabel="Capturar un pendiente"
          >
            <Feather name="plus" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.quickAddBtnText, { color: colors.primary }]}>
              Añadir un pendiente
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Siguiente Compromiso Fijo del Calendario */}
      {nextEvent && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="calendar" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.cardSectionLabel, { color: colors.textSecondary }]}>
                PRÓXIMO COMPROMISO
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onSwitchToTab && onSwitchToTab('Calendario')}
              accessibilityRole="button"
              accessibilityLabel="Ver agenda completa en calendario"
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>VER AGENDA</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.eventDetailRow, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
            onPress={() => onSelectEvent && onSelectEvent(nextEvent)}
            activeOpacity={0.8}
          >
            <View style={[styles.timeBox, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.timeBoxHour, { color: colors.primary }]}>{nextEvent.startTime}</Text>
              <Text style={[styles.timeBoxEnd, { color: colors.textSecondary }]}>{nextEvent.endTime || ''}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {nextEvent.title}
              </Text>
              {nextEvent.location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Feather name="map-pin" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.eventSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {nextEvent.location}
                  </Text>
                </View>
              ) : null}
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Resumen Discreto del Progreso Diario */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardSectionLabel, { color: colors.textSecondary }]}>
            ENFOQUE DE HOY
          </Text>
          <Text style={[styles.progressCountText, { color: colors.textPrimary }]}>
            {completedDailyActivities} de {totalDailyActivities} completadas
          </Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <ProgressBar
            progress={dailyProgressPercent}
            color={dailyProgressPercent === 100 ? colors.success : colors.primary}
            height={6}
          />
        </View>
      </View>

      {/* 5. Pendientes Clave de Hoy con Checkbox de 1 Toque */}
      {todayTasks.length > 0 && (
        <View style={styles.tasksSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardSectionLabel, { color: colors.textSecondary }]}>
              PENDIENTES DE HOY ({todayTasks.filter((t) => !t.completed).length})
            </Text>
            <TouchableOpacity
              onPress={() => onSwitchToTab && onSwitchToTab('Tareas')}
              accessibilityRole="button"
              accessibilityLabel="Ver todas las tareas"
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>VER TODAS</Text>
            </TouchableOpacity>
          </View>

          {todayTasks.slice(0, 4).map((task) => {
            const isDone =
              task.type === 'diaria'
                ? Array.isArray(task.completedDates) && task.completedDates.includes(todayStr)
                : task.completed;

            return (
              <View
                key={task.id}
                style={[
                  styles.quickTaskRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                {/* 1-tap Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkboxBtn,
                    isDone && { backgroundColor: colors.success, borderColor: colors.success },
                    !isDone && { borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => toggleTaskCompletion(task.id, todayStr)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  accessibilityLabel={`Marcar ${task.title} como ${isDone ? 'pendiente' : 'completada'}`}
                >
                  {isDone && <Feather name="check" size={14} color="#FFFFFF" />}
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.quickTaskTitle,
                      { color: isDone ? colors.textMuted : colors.textPrimary },
                      isDone && styles.lineThrough,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <Text style={[styles.quickTaskSub, { color: colors.textSecondary }]}>
                    {task.type === 'diaria' ? 'Rutina diaria' : `Duración: ${task.requiredHours || 1}h`}
                  </Text>
                </View>

                {/* Quick Reschedule in 2 taps */}
                <TouchableOpacity
                  style={styles.taskActionBtn}
                  onPress={() => onOpenReschedule && onOpenReschedule(task, 'task')}
                  accessibilityLabel={`Reprogramar ${task.title}`}
                  accessibilityRole="button"
                >
                  <Feather name="more-horizontal" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* 6. Cierre Diario (Check-in nocturno sereno) */}
      <TouchableOpacity
        style={[styles.dailyReviewCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        onPress={onOpenDailyReview}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Hacer cierre diario del día"
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="moon-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.dailyReviewTitle, { color: colors.textPrimary }]}>
            Cierre Diario
          </Text>
          <Text style={[styles.dailyReviewSub, { color: colors.textSecondary }]}>
            Revisa lo logrado y organiza el día de mañana con calma.
          </Text>
        </View>
        <Feather name="arrow-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: 16,
  },
  dateSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  contextNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  coachCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  recommendationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 10,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 46,
    marginRight: 8,
  },
  startBtnText: {
    color: '#0F1418',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
    marginRight: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  iconActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCoachCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCoachTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyCoachSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 280,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 42,
  },
  quickAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  timeBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxHour: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeBoxEnd: {
    fontSize: 10,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  eventSub: {
    fontSize: 12,
  },
  progressCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tasksSection: {
    marginBottom: 14,
  },
  quickTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    minHeight: 48,
  },
  checkboxBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  lineThrough: {
    textDecorationLine: 'line-through',
  },
  quickTaskSub: {
    fontSize: 11,
    marginTop: 2,
  },
  taskActionBtn: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyReviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyReviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dailyReviewSub: {
    fontSize: 12,
    lineHeight: 16,
  },
});
