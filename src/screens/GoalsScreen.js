import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

export const GoalsScreen = ({ onOpenNewGoal, onOpenNewEvent, onEditGoal }) => {
  const { colors } = useTheme();
  const { goals, events, tasks, settings, addEvent, updateGoal, deleteGoal, recordGoalProgress } = useAppData();
  const [activeSubTab, setActiveSubTab] = useState('METAS'); // 'METAS' | 'PLANIFICACION'

  const todayIso = new Date().toISOString().split('T')[0];

  // Generador de días de la semana actual (Lunes a Domingo)
  const getWeekDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday, 12, 0, 0);

    const week = [];
    const dayLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      week.push({
        dateStr: iso,
        label: dayLabels[i],
        dayNum: d.getDate(),
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
      });
    }
    return week;
  };

  const weekDays = getWeekDays();

  // Calcula el progreso real de una meta en un día específico
  const getGoalDayProgress = (goal, dateStr, isFuture) => {
    if (isFuture) {
      return { count: 0, percent: 0, dailyTarget: 1 };
    }

    // 1. Historial registrado
    const historyCount = (goal.dailyHistory && goal.dailyHistory[dateStr]) || 0;

    // 2. Eventos completados vinculados
    const eventMatches = (events || []).filter(
      (e) => e.date === dateStr && e.completed && e.linkedGoalId === goal.id
    );
    let eventCount = eventMatches.length;
    if (goal.unit && goal.unit.toLowerCase().includes('hora')) {
      eventCount = eventMatches.reduce((acc, e) => {
        const [sh, sm] = (e.startTime || '00:00').split(':').map(Number);
        const [eh, em] = (e.endTime || '01:00').split(':').map(Number);
        const diffMins = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
        return acc + Math.round((diffMins / 60) * 10) / 10;
      }, 0);
    }

    // 3. Tareas completadas vinculadas
    const taskMatches = (tasks || []).filter((t) => {
      if (!t || t.linkedGoalId !== goal.id) return false;
      if (t.type === 'diaria') {
        return Array.isArray(t.completedDates) && t.completedDates.includes(dateStr);
      }
      return t.completed && (t.plannedDate === dateStr || t.dueDate === dateStr);
    });
    const taskCount = taskMatches.length;

    const count = Math.max(historyCount, eventCount + taskCount);

    let dailyTarget = 1;
    if (goal.type === 'Hábito') {
      dailyTarget = 1;
    } else {
      dailyTarget = Math.max(1, Math.round((goal.targetValue / 7) * 10) / 10);
    }

    const percent = Math.min(100, Math.round((count / dailyTarget) * 100));

    return { count, percent, dailyTarget };
  };

  const handleDeleteGoal = (goal) => {
    Alert.alert(
      'Eliminar Meta',
      `¿Estás seguro de que deseas eliminar la meta "${goal.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteGoal(goal.id),
        },
      ]
    );
  };

  const completedGoalsCount = goals.filter((g) => g.currentValue >= g.targetValue).length;
  const totalGoals = goals.length || 1;
  const successRate = Math.round((completedGoalsCount / totalGoals) * 100);

  // Calculate Weekly Calendar Occupancy (Planificación Semanal)
  const totalWeeklySlots = (settings.endHour - settings.startHour + 1) * 7;
  const plannedSlotsCount = events.length * 1.5; // Approx 1.5h per event
  const occupancyPercent = Math.min(100, Math.round((plannedSlotsCount / totalWeeklySlots) * 100));

  const handleAutoPlanPME = () => {
    const today = new Date().toISOString().split('T')[0];
    const pmeBlocks = [
      { title: 'Estudio Personal PME', startTime: '08:00', endTime: '09:00', category: 'Estudio' },
      { title: 'Estudio con Compañero', startTime: '09:00', endTime: '10:00', category: 'Estudio' },
      { title: 'Proselitismo & Contacto', startTime: '14:00', endTime: '16:00', category: 'Contacto' },
      { title: 'Lecciones con Investigadores', startTime: '16:30', endTime: '18:30', category: 'Enseñanza' },
      { title: 'Planificación Diaria', startTime: '21:00', endTime: '21:30', category: 'Tarea' },
    ];

    pmeBlocks.forEach((block) => {
      addEvent({
        title: block.title,
        category: block.category,
        date: today,
        startTime: block.startTime,
        endTime: block.endTime,
        location: 'Área Asignada',
        notes: 'Generado automáticamente por Planificación Semanal PME',
        linkedGoalId: null,
      });
    });

    Alert.alert('¡Planificación Completada!', 'Se han añadido 5 bloques clave PME a tu calendario de hoy.');
  };

  const handleQuickLogSession = (goal) => {
    if (recordGoalProgress) {
      recordGoalProgress(goal.id, todayIso, 1);
    } else {
      const nextVal = goal.currentValue + 1;
      updateGoal(goal.id, {
        currentValue: nextVal,
        status: nextVal >= goal.targetValue ? 'Completada' : 'En curso',
      });
    }
    Alert.alert('¡Sesión Registrada!', `Se registró +1 para la meta "${goal.name}". Nuevo total: ${goal.currentValue + 1}/${goal.targetValue}`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>Mis Metas & Planificación</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Seguimiento de tu progreso mensual, semanal e indicadores PME.
      </Text>

      {/* Segment Switcher */}
      <View style={[styles.segmentTrack, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSubTab === 'METAS' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveSubTab('METAS')}
        >
          <Text style={{ color: activeSubTab === 'METAS' ? '#0F1418' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
            🎯 Metas Activas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSubTab === 'PLANIFICACION' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveSubTab('PLANIFICACION')}
        >
          <Text style={{ color: activeSubTab === 'PLANIFICACION' ? '#0F1418' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
            📅 Planificación Semanal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top Stat Cards (Image 3) */}
      <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.statSub, { color: colors.health }]}>COMPLETADAS</Text>
        <Text style={[styles.statMain, { color: colors.textPrimary }]}>
          {completedGoalsCount} / {totalGoals}
        </Text>
        <ProgressBar progress={(completedGoalsCount / totalGoals) * 100} color={colors.health} height={6} />
      </View>

      <View style={styles.twoColumnRow}>
        <View style={[styles.halfBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.statSub, { color: colors.work }]}>TASA DE ÉXITO</Text>
          <Text style={[styles.statMain, { color: colors.textPrimary }]}>{successRate}%</Text>
          <ProgressBar progress={successRate} color={colors.work} height={5} />
        </View>

        <View style={[styles.halfBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.statSub, { color: colors.personal }]}>RACHA ACTUAL</Text>
          <View style={styles.rowAlign}>
            <Ionicons name="flash" size={18} color={colors.personal} style={{ marginRight: 6 }} />
            <Text style={[styles.statMain, { color: colors.textPrimary }]}>{settings.streakDays ?? 1} Días</Text>
          </View>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>¡Sigue así, vas por buen camino!</Text>
        </View>
      </View>

      {/* Content depending on selected subtab */}
      {activeSubTab === 'METAS' ? (
        <View style={{ marginTop: 20 }}>
          {/* Metas Semanales Header */}
          <View style={[styles.rowAlign, { justifyContent: 'space-between', marginBottom: 12 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Metas Semanales</Text>
            <View style={[styles.weekBadge, { backgroundColor: colors.surfaceBorder }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary }}>SEMANA ACTUAL</Text>
            </View>
          </View>

          {goals.map((goal) => {
            const isCompleted = goal.currentValue >= goal.targetValue;
            const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

            return (
              <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={[styles.rowAlign, { justifyContent: 'space-between', marginBottom: 4 }]}>
                  <Text style={[styles.goalName, { color: colors.textPrimary }]}>{goal.name}</Text>
                  <View style={styles.rowAlign}>
                    <Badge label={goal.category} category={goal.category} />
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => onEditGoal && onEditGoal(goal)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="edit-2" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDeleteGoal(goal)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.goalMetaText, { color: colors.textSecondary }]}>
                  Meta: {goal.targetValue} {goal.unit} ({goal.period})
                </Text>

                {/* Real 7-day Bar chart with authentic weekly progress */}
                <View style={styles.barChartRow}>
                  {weekDays.map((dayItem, idx) => {
                    const { count, percent: dayPercent } = getGoalDayProgress(
                      goal,
                      dayItem.dateStr,
                      dayItem.isFuture
                    );

                    return (
                      <View key={dayItem.dateStr || idx} style={styles.barCol}>
                        {/* Day count indicator */}
                        <Text
                          style={[
                            styles.barCountLabel,
                            {
                              color: dayItem.isFuture
                                ? 'transparent'
                                : count > 0
                                ? colors.primary
                                : colors.textMuted,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {dayItem.isFuture ? '' : count > 0 ? count : '·'}
                        </Text>

                        {/* Bar Track & Fill */}
                        <View
                          style={[
                            styles.barContainer,
                            {
                              backgroundColor: colors.surfaceBorder,
                              borderColor: dayItem.isToday ? colors.primary : 'transparent',
                              borderWidth: dayItem.isToday ? 1.5 : 0,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${dayPercent}%`,
                                backgroundColor: dayItem.isToday
                                  ? colors.primary
                                  : dayPercent >= 100
                                  ? colors.health
                                  : colors.primary + '88',
                              },
                            ]}
                          />
                        </View>

                        {/* Day Label (e.g. LUN, MAR) */}
                        <Text
                          style={[
                            styles.barDayLabel,
                            {
                              color: dayItem.isToday
                                ? colors.primary
                                : dayItem.isFuture
                                ? colors.textMuted
                                : colors.textSecondary,
                              fontWeight: dayItem.isToday ? '800' : '600',
                            },
                          ]}
                        >
                          {dayItem.label}
                        </Text>
                        <Text
                          style={[
                            styles.barDayNum,
                            {
                              color: dayItem.isToday ? colors.primary : colors.textMuted,
                              fontWeight: dayItem.isToday ? '700' : '500',
                            },
                          ]}
                        >
                          {dayItem.dayNum}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Progress Stats & Quick Log */}
                <View style={[styles.rowAlign, { justifyContent: 'space-between', marginTop: 12 }]}>
                  <View>
                    <View style={styles.rowAlign}>
                      <Text style={[styles.percentVal, { color: colors.primary }]}>{percent}%</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 8 }}>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                      {isCompleted ? '¡Meta semanal cumplida! 🏆' : `${Math.max(0, goal.targetValue - goal.currentValue)} ${goal.unit} restantes`}
                    </Text>
                  </View>

                  <View style={styles.rowAlign}>
                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                      onPress={() => handleQuickLogSession(goal)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.miniBtnText, { color: colors.primary }]}>+ REGISTRAR SESIÓN</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={[styles.addGoalBtn, { backgroundColor: colors.primary }]} onPress={onOpenNewGoal}>
            <Feather name="plus" size={20} color="#0F1418" style={{ marginRight: 8 }} />
            <Text style={styles.addGoalBtnText}>AÑADIR NUEVA META</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* PLANIFICACIÓN SEMANAL SECTION */
        <View style={{ marginTop: 20 }}>
          <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={styles.rowAlign}>
              <Feather name="calendar" size={24} color={colors.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.planCardTitle, { color: colors.textPrimary }]}>Cobertura del Calendario Semanal</Text>
                <Text style={[styles.planCardSub, { color: colors.textSecondary }]}>
                  {occupancyPercent >= 70
                    ? '¡Excelente! Tienes la mayoría de tus bloques semanales cubiertos.'
                    : 'Aún tienes espacio en tu calendario semanal. Llénalos para maximizar tu impacto.'}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <View style={[styles.rowAlign, { justifyContent: 'space-between', marginBottom: 6 }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>ESPACIOS PLANIFICADOS</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{occupancyPercent}%</Text>
              </View>
              <ProgressBar progress={occupancyPercent} color={colors.primary} height={10} />
            </View>

            <TouchableOpacity style={[styles.autoPlanBtn, { backgroundColor: colors.primary }]} onPress={handleAutoPlanPME}>
              <Ionicons name="sparkles" size={18} color="#0F1418" style={{ marginRight: 8 }} />
              <Text style={styles.autoPlanBtnText}>AUTO-PLANIFICAR BLOQUES PME</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 20 }]}>
            Bloques Clave del Planificador PME
          </Text>

          {[
            { title: 'Estudio Personal', desc: '1 hora diaria en la mañana', time: '08:00 - 09:00', cat: 'Estudio' },
            { title: 'Estudio con Compañero', desc: 'Planificación de lecciones del día', time: '09:00 - 10:00', cat: 'Estudio' },
            { title: 'Proselitismo & Contacto', desc: 'Búsqueda de nuevas personas en el área', time: '14:00 - 16:00', cat: 'Contacto' },
            { title: 'Lecciones & Encomiendas', desc: 'Enseñar principios del Evangelio', time: '16:30 - 19:00', cat: 'Enseñanza' },
          ].map((item, index) => (
            <View key={index} style={[styles.routineCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={{ flex: 1 }}>
                <Badge label={item.cat} category={item.cat} />
                <Text style={[styles.routineTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.routineDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>

              <TouchableOpacity
                style={[styles.addSlotBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => onOpenNewEvent(new Date().toISOString().split('T')[0], item.time.split(' - ')[0])}
              >
                <Feather name="plus" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  statSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statMain: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfBox: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  weekBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goalCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  goalMetaText: {
    fontSize: 12,
    marginBottom: 12,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    height: 14,
  },
  barContainer: {
    width: 22,
    height: 52,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 5,
  },
  barDayLabel: {
    fontSize: 9,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  barDayNum: {
    fontSize: 9,
    marginTop: 1,
  },
  percentVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  addGoalBtnText: {
    color: '#0F1418',
    fontSize: 14,
    fontWeight: '800',
  },
  planCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  planCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  autoPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  autoPlanBtnText: {
    color: '#0F1418',
    fontSize: 13,
    fontWeight: '800',
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  routineDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  addSlotBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  actionIconBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
