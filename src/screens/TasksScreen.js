import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

export const TasksScreen = ({
  onOpenNewTask,
  onEditTask,
  onScheduleTask,
  onLogHours,
  onOpenReschedule,
  onOpenQuickCapture,
}) => {
  const { colors } = useTheme();
  const { tasks, goals, toggleTaskCompletion, deleteTask, moveTaskToInbox } = useAppData();

  const [activeTab, setActiveTab] = useState('Bandeja'); // 'Bandeja' | 'Planificadas' | 'Diarias' | 'Completadas'
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeGoals = Array.isArray(goals) ? goals : [];

  const getLinkedGoalName = (goalId) => {
    if (!goalId) return null;
    const g = safeGoals.find((item) => item.id === goalId);
    return g ? g.name : null;
  };

  // Filtrado por búsqueda
  const searchedTasks = safeTasks.filter((t) => {
    if (!t) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = (t.title || '').toLowerCase().includes(query);
    const notesMatch = (t.notes || '').toLowerCase().includes(query);
    const categoryMatch = (t.category || '').toLowerCase().includes(query);
    return titleMatch || notesMatch || categoryMatch;
  });

  // Categorización de tareas:
  // 1. Bandeja (Inbox): pendientes no completados sin fecha planificada ni fecha límite
  const inboxTasks = searchedTasks.filter(
    (t) => t.type !== 'diaria' && !t.completed && (t.status === 'inbox' || (!t.plannedDate && !t.dueDate))
  );

  // 2. Planificadas: pendientes no completados con fecha planificada o límite
  const scheduledTasks = searchedTasks.filter(
    (t) => t.type !== 'diaria' && !t.completed && (t.status === 'scheduled' || !!t.plannedDate || !!t.dueDate)
  );

  // 3. Rutinas Diarias: hábitos
  const diariasTasks = searchedTasks.filter((t) => t.type === 'diaria');

  // 4. Completadas: proyectos completados
  const completedTasks = searchedTasks.filter(
    (t) => t.type !== 'diaria' && t.completed
  );

  const totalDiariasCount = diariasTasks.length;
  const totalDiariasCompletedToday = diariasTasks.filter(
    (t) => t && Array.isArray(t.completedDates) && t.completedDates.includes(todayStr)
  ).length;

  const handleDeleteTask = (task) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`¿Eliminar la tarea "${task.title}"?`)) {
        deleteTask(task.id);
      }
    } else {
      Alert.alert(
        'Eliminar Tarea',
        `¿Estás seguro de que deseas eliminar "${task.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => deleteTask(task.id) },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
            ORGANIZACIÓN SIN CAOS
          </Text>
          <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
            Mis Pendientes
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addTaskBtn, { backgroundColor: colors.primary }]}
          onPress={onOpenQuickCapture || onOpenNewTask}
          activeOpacity={0.85}
          accessibilityLabel="Añadir nuevo pendiente"
          accessibilityRole="button"
        >
          <Feather name="plus" size={18} color="#0F1418" />
          <Text style={styles.addTaskBtnText}>Capturar</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Feather name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar pendientes o rutinas..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Buscar tareas"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selector de solo iconos */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {[
          {
            key: 'Bandeja',
            title: 'Bandeja de Entrada',
            count: inboxTasks.length,
            icon: 'inbox',
            desc: 'Ideas y pendientes capturados rápidamente sin fecha asignada. Organízalos solo cuando estés listo.',
          },
          {
            key: 'Planificadas',
            title: 'Pendientes Con Fecha',
            count: scheduledTasks.length,
            icon: 'calendar',
            desc: 'Tareas con fecha asignada o límite de vencimiento en tu planificación.',
          },
          {
            key: 'Diarias',
            title: 'Hábitos & Rutinas Diarias',
            count: totalDiariasCount,
            icon: 'repeat',
            desc: 'Hábitos diarios para registrar y mantener constancia día tras día.',
          },
          {
            key: 'Completadas',
            title: 'Tareas Completadas',
            count: completedTasks.length,
            icon: 'check-circle',
            desc: 'Historial de pendientes y hábitos finalizados con éxito.',
          },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.iconTabBtn,
                isActive && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.title}, ${tab.count} elementos`}
            >
              <Feather
                name={tab.icon}
                size={22}
                color={isActive ? '#0F1418' : colors.textSecondary}
              />
              {tab.count > 0 && (
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isActive ? '#0F1418' : colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.iconBadgeText,
                      { color: isActive ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Título y descripción que aparece abajo al seleccionar el icono */}
      {(() => {
        const currentTabConfig = {
          Bandeja: {
            title: 'Bandeja de Entrada (Inbox)',
            count: inboxTasks.length,
            icon: 'inbox',
            desc: 'Ideas y pendientes capturados rápidamente sin fecha asignada. Organízalos solo cuando estés listo.',
          },
          Planificadas: {
            title: 'Pendientes Planificados (Con Fecha)',
            count: scheduledTasks.length,
            icon: 'calendar',
            desc: 'Tareas con fecha programada o fecha límite en tu cronograma.',
          },
          Diarias: {
            title: 'Hábitos & Rutinas Diarias',
            count: totalDiariasCount,
            icon: 'repeat',
            desc: 'Hábitos diarios para registrar y mantener constancia día a día.',
          },
          Completadas: {
            title: 'Tareas Completadas',
            count: completedTasks.length,
            icon: 'check-circle',
            desc: 'Historial de actividades y proyectos finalizados con éxito.',
          },
        }[activeTab] || {
          title: activeTab,
          count: 0,
          icon: 'list',
          desc: '',
        };

        return (
          <View
            style={[
              styles.activeTabBanner,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <View style={styles.activeTabTitleRow}>
              <View style={styles.activeTabLeft}>
                <View style={[styles.activeTabIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Feather name={currentTabConfig.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.activeTabTitleText, { color: colors.textPrimary }]}>
                  {currentTabConfig.title}
                </Text>
              </View>
              <View style={[styles.activeTabCountTag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.activeTabCountTagText, { color: colors.primary }]}>
                  {currentTabConfig.count}
                </Text>
              </View>
            </View>
            <Text style={[styles.activeTabDescText, { color: colors.textSecondary }]}>
              {currentTabConfig.desc}
            </Text>
          </View>
        );
      })()}

      {/* TAB 1: BANDEJA DE ENTRADA (Inbox) */}
      {activeTab === 'Bandeja' && (
        <View style={styles.tabContent}>

          {inboxTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Feather name="check-circle" size={36} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Bandeja de entrada despejada
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No tienes pendientes sin organizar. Si surge algo en el día, captúralo en segundos.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={onOpenQuickCapture || onOpenNewTask}
              >
                <Feather name="plus" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.emptyActionText, { color: colors.primary }]}>
                  Capturar un pendiente
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            inboxTasks.map((task) => {
              const goalName = getLinkedGoalName(task.linkedGoalId);

              return (
                <View
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                >
                  <View style={styles.taskCardTop}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      style={[styles.checkbox, { borderColor: colors.surfaceBorder }]}
                      onPress={() => toggleTaskCompletion(task.id, todayStr)}
                      accessibilityLabel={`Marcar ${task.title} como completada`}
                      accessibilityRole="checkbox"
                    >
                      {task.completed && <Feather name="check" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, marginLeft: 12 }}
                      onPress={() => onEditTask(task)}
                    >
                      <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
                        {task.title}
                      </Text>
                      {task.notes ? (
                        <Text style={[styles.taskNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                          {task.notes}
                        </Text>
                      ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteTask(task)}
                      style={{ padding: 6 }}
                      accessibilityLabel="Eliminar tarea"
                      accessibilityRole="button"
                    >
                      <Feather name="trash-2" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Task Meta Badges */}
                  <View style={styles.metaRow}>
                    <View style={[styles.inboxTag, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                      <Feather name="inbox" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.inboxTagText, { color: colors.textSecondary }]}>Sin fecha</Text>
                    </View>
                    {goalName && (
                      <View style={[styles.inboxTag, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, marginLeft: 6 }]}>
                        <Feather name="flag" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inboxTagText, { color: colors.primary }]} numberOfLines={1}>
                          {goalName}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Quick Actions (≤ 2 taps) */}
                  <View style={[styles.actionsRow, { borderTopColor: colors.surfaceBorder }]}>
                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => onOpenReschedule && onOpenReschedule(task, 'task')}
                      accessibilityLabel="Asignar fecha para hoy o mañana"
                      accessibilityRole="button"
                    >
                      <Feather name="calendar" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.quickActionText, { color: colors.primary }]}>
                        Asignar fecha
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, borderWidth: 1 }]}
                      onPress={() => onScheduleTask(task)}
                      accessibilityLabel="Agendar bloque en calendario"
                      accessibilityRole="button"
                    >
                      <Feather name="clock" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>
                        Agendar bloque
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* TAB 2: TAREAS PLANIFICADAS CON FECHA */}
      {activeTab === 'Planificadas' && (
        <View style={styles.tabContent}>
          {scheduledTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Feather name="calendar" size={36} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No hay tareas con fecha
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Asigna fechas a tus pendientes de la bandeja para verlos organizados aquí.
              </Text>
            </View>
          ) : (
            scheduledTasks.map((task) => {
              const goalName = getLinkedGoalName(task.linkedGoalId);
              const isToday = task.plannedDate === todayStr || task.dueDate === todayStr;
              const isOverdue = task.dueDate && task.dueDate < todayStr;
              const dateDisplay = task.plannedDate || task.dueDate;

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                    isOverdue && { borderColor: colors.danger + '80' },
                  ]}
                >
                  <View style={styles.taskCardTop}>
                    <TouchableOpacity
                      style={[styles.checkbox, { borderColor: colors.surfaceBorder }]}
                      onPress={() => toggleTaskCompletion(task.id, todayStr)}
                      accessibilityLabel={`Marcar ${task.title} como completada`}
                      accessibilityRole="checkbox"
                    >
                      {task.completed && <Feather name="check" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, marginLeft: 12 }}
                      onPress={() => onEditTask(task)}
                    >
                      <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
                        {task.title}
                      </Text>
                      {task.notes ? (
                        <Text style={[styles.taskNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                          {task.notes}
                        </Text>
                      ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onEditTask(task)}
                      style={{ padding: 6 }}
                      accessibilityLabel="Editar tarea"
                      accessibilityRole="button"
                    >
                      <Feather name="edit-2" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Dates & Status Chips */}
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.inboxTag,
                        {
                          backgroundColor: isOverdue
                            ? colors.danger + '20'
                            : isToday
                            ? colors.primaryLight
                            : colors.card,
                          borderColor: isOverdue ? colors.danger : colors.surfaceBorder,
                        },
                      ]}
                    >
                      <Feather
                        name="calendar"
                        size={12}
                        color={isOverdue ? colors.danger : isToday ? colors.primary : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.inboxTagText,
                          {
                            color: isOverdue ? colors.danger : isToday ? colors.primary : colors.textSecondary,
                            fontWeight: isToday || isOverdue ? '700' : '500',
                          },
                        ]}
                      >
                        {isOverdue ? `Venció: ${dateDisplay}` : isToday ? 'Para Hoy' : dateDisplay}
                      </Text>
                    </View>

                    {goalName && (
                      <View style={[styles.inboxTag, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, marginLeft: 6 }]}>
                        <Feather name="flag" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inboxTagText, { color: colors.primary }]} numberOfLines={1}>
                          {goalName}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Quick Actions (≤ 2 taps) */}
                  <View style={[styles.actionsRow, { borderTopColor: colors.surfaceBorder }]}>
                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, borderWidth: 1 }]}
                      onPress={() => onOpenReschedule && onOpenReschedule(task, 'task')}
                      accessibilityLabel="Reprogramar o posponer tarea"
                      accessibilityRole="button"
                    >
                      <Feather name="repeat" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>
                        Reprogramar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => onScheduleTask(task)}
                      accessibilityLabel="Agendar bloque en calendario"
                      accessibilityRole="button"
                    >
                      <Feather name="clock" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.quickActionText, { color: colors.primary }]}>
                        Agendar Horas
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, borderWidth: 1 }]}
                      onPress={() => onLogHours(task)}
                      accessibilityLabel="Registrar horas trabajadas"
                      accessibilityRole="button"
                    >
                      <Feather name="plus-circle" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>
                        + Horas
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* TAB 3: RUTINAS DIARIAS */}
      {activeTab === 'Diarias' && (
        <View style={styles.tabContent}>
          <View style={[styles.diariasSummary, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.diariasSummaryTitle, { color: colors.textPrimary }]}>
                Hábitos y Rutinas Diarias
              </Text>
              <Text style={[styles.diariasSummarySub, { color: colors.textSecondary }]}>
                {totalDiariasCompletedToday} de {totalDiariasCount} completadas hoy
              </Text>
            </View>
            <ProgressBar
              progress={totalDiariasCount > 0 ? (totalDiariasCompletedToday / totalDiariasCount) * 100 : 0}
              color={colors.primary}
              height={8}
            />
          </View>

          {diariasTasks.map((task) => {
            const isCompletedToday =
              Array.isArray(task.completedDates) && task.completedDates.includes(todayStr);
            const goalName = getLinkedGoalName(task.linkedGoalId);

            return (
              <View
                key={task.id}
                style={[styles.diariaRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              >
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    isCompletedToday && { backgroundColor: colors.success, borderColor: colors.success },
                    !isCompletedToday && { borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => toggleTaskCompletion(task.id, todayStr)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isCompletedToday }}
                  accessibilityLabel={`Marcar ${task.title} como ${isCompletedToday ? 'pendiente' : 'completada hoy'}`}
                >
                  {isCompletedToday && <Feather name="check" size={14} color="#FFFFFF" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, marginLeft: 12 }}
                  onPress={() => onEditTask(task)}
                >
                  <Text
                    style={[
                      styles.diariaTitle,
                      { color: isCompletedToday ? colors.textMuted : colors.textPrimary },
                      isCompletedToday && styles.lineThrough,
                    ]}
                  >
                    {task.title}
                  </Text>
                  {goalName ? (
                    <Text style={[styles.diariaSub, { color: colors.primary }]}>
                      Meta: {goalName}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onEditTask(task)}
                  style={{ padding: 8 }}
                  accessibilityLabel="Editar hábito"
                  accessibilityRole="button"
                >
                  <Feather name="edit-2" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* TAB 4: COMPLETADAS */}
      {activeTab === 'Completadas' && (
        <View style={styles.tabContent}>
          {completedTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Feather name="check-circle" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Aún no has completado tareas
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Las tareas que vayas completando aparecerán aquí para tu registro personal.
              </Text>
            </View>
          ) : (
            completedTasks.map((task) => (
              <View
                key={task.id}
                style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: 0.8 }]}
              >
                <View style={styles.taskCardTop}>
                  <TouchableOpacity
                    style={[styles.checkbox, { backgroundColor: colors.success, borderColor: colors.success }]}
                    onPress={() => toggleTaskCompletion(task.id, todayStr)}
                    accessibilityLabel={`Desmarcar ${task.title}`}
                    accessibilityRole="checkbox"
                  >
                    <Feather name="check" size={14} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.taskTitle, { color: colors.textMuted, textDecorationLine: 'line-through' }]}>
                      {task.title}
                    </Text>
                    <Text style={[styles.taskNotes, { color: colors.textSecondary }]}>
                      Completada ({task.loggedHours || 0} hrs dedicadas)
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task)}
                    style={{ padding: 6 }}
                    accessibilityLabel="Eliminar tarea completada"
                    accessibilityRole="button"
                  >
                    <Feather name="trash-2" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 44,
  },
  addTaskBtnText: {
    color: '#0F1418',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconTabBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 3,
  },
  iconBadge: {
    position: 'absolute',
    top: 5,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activeTabBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeTabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeTabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeTabIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activeTabTitleText: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  activeTabCountTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  activeTabCountTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activeTabDescText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  taskCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  taskNotes: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 34,
  },
  inboxTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inboxTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    minHeight: 34,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  diariasSummary: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  diariasSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  diariasSummarySub: {
    fontSize: 13,
    marginBottom: 12,
  },
  diariaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 48,
  },
  diariaTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  lineThrough: {
    textDecorationLine: 'line-through',
  },
  diariaSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
