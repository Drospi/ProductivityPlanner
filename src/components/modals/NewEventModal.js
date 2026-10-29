import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { TimePickerModal } from './TimePickerModal';
import { DatePickerModal } from './DatePickerModal';

const CATEGORIES = [
  { id: 'Contacto', name: 'Contacto', icon: 'person-add-outline', lib: 'Ionicons' },
  { id: 'Enseñanza', name: 'Enseñanza', icon: 'school-outline', lib: 'Ionicons' },
  { id: 'Servicio', name: 'Servicio', icon: 'gift-outline', lib: 'Ionicons' },
  { id: 'Tarea', name: 'Tarea', icon: 'clipboard-outline', lib: 'Ionicons' },
  { id: 'Llamadas', name: 'Llamadas', icon: 'call-outline', lib: 'Ionicons' },
  { id: 'Personal', name: 'Personal', icon: 'person-outline', lib: 'Ionicons' },
];

const EVENT_COLORS = [
  { id: '#E63956', name: 'Rojo', code: '#E63956' },
  { id: '#F97316', name: 'Naranja', code: '#F97316' },
  { id: '#FACC15', name: 'Amarillo', code: '#FACC15' },
  { id: '#10B981', name: 'Verde', code: '#10B981' },
  { id: '#0EA5E9', name: 'Celeste', code: '#0EA5E9' },
  { id: '#3B82F6', name: 'Azul', code: '#3B82F6' },
  { id: '#A855F7', name: 'Púrpura', code: '#A855F7' },
  { id: '#64748B', name: 'Gris', code: '#64748B' },
];

const DAY_INITIALS = [
  { dayNum: 1, label: 'L' },
  { dayNum: 2, label: 'M' },
  { dayNum: 3, label: 'Mi' },
  { dayNum: 4, label: 'J' },
  { dayNum: 5, label: 'V' },
  { dayNum: 6, label: 'S' },
  { dayNum: 0, label: 'D' },
];

const getCategoryDefaultColor = (catId) => {
  switch (catId?.toLowerCase()) {
    case 'trabajo':
    case 'llamadas':
      return '#0EA5E9';
    case 'salud':
    case 'enseñanza':
      return '#10B981';
    case 'personal':
    case 'contacto':
      return '#F97316';
    case 'estudio':
    case 'servicio':
      return '#A855F7';
    default:
      return '#E63956';
  }
};

export const NewEventModal = ({
  visible,
  onClose,
  defaultDate,
  defaultTime,
  defaultIsBackup = false,
  eventToEdit = null,
}) => {
  const { colors } = useTheme();
  const { goals, tasks, addEvent, updateEvent, settings } = useAppData();

  const [category, setCategory] = useState('Enseñanza');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#10B981');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(defaultTime || '10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [linkedGoalId, setLinkedGoalId] = useState(null);
  const [linkedTaskId, setLinkedTaskId] = useState(null);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringUntil, setRecurringUntil] = useState('');
  const [recurringDays, setRecurringDays] = useState([1]);
  const [isBackupPlan, setIsBackupPlan] = useState(defaultIsBackup);

  // Collapsible accordion states (reemplaza scrolls horizontales)
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isGoalExpanded, setIsGoalExpanded] = useState(false);
  const [isTaskExpanded, setIsTaskExpanded] = useState(false);

  const toggleCategory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCategoryExpanded(!isCategoryExpanded);
  };

  const toggleGoal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsGoalExpanded(!isGoalExpanded);
  };

  const toggleTask = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsTaskExpanded(!isTaskExpanded);
  };

  // Scope modal state for editing recurring events
  const [isScopeModalVisible, setScopeModalVisible] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Picker modal states
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState('date');
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState('start');

  const getDefaultLimitDate = (baseDateStr) => {
    try {
      const d = new Date((baseDateStr || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    } catch (e) {
      return baseDateStr;
    }
  };

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || '');
      setCategory(eventToEdit.category || 'Enseñanza');
      setColor(eventToEdit.color || '#10B981');
      setDate(eventToEdit.date || defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime(eventToEdit.startTime || '10:00');
      setEndTime(eventToEdit.endTime || '11:30');
      setLinkedGoalId(eventToEdit.linkedGoalId || null);
      setLinkedTaskId(eventToEdit.linkedTaskId || null);
      setNotes(eventToEdit.notes || '');
      setIsRecurring(!!eventToEdit.isRecurring);
      setRecurringUntil(eventToEdit.recurringUntil || '');
      setIsBackupPlan(!!eventToEdit.isBackupPlan);

      const d = new Date((eventToEdit.date || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      setRecurringDays(eventToEdit.recurringDays || [d.getDay()]);
    } else {
      if (defaultDate) setDate(defaultDate);
      if (defaultTime) {
        setStartTime(defaultTime);
        const hourNum = parseInt(defaultTime.split(':')[0], 10);
        const endH = (hourNum + 1).toString().padStart(2, '0');
        setEndTime(`${endH}:00`);
      }
      setIsBackupPlan(!!defaultIsBackup);
      const baseD = new Date((defaultDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      setRecurringDays([baseD.getDay()]);
      setLinkedTaskId(null);
    }
  }, [defaultDate, defaultTime, defaultIsBackup, eventToEdit, visible]);

  const handleToggleRecurring = (val) => {
    setIsRecurring(val);
    if (val && !recurringUntil) {
      setRecurringUntil(getDefaultLimitDate(date));
    }
    if (val && recurringDays.length === 0) {
      const d = new Date((date || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      setRecurringDays([d.getDay()]);
    }
  };

  const toggleDaySelection = (dayNum) => {
    if (recurringDays.includes(dayNum)) {
      if (recurringDays.length > 1) {
        setRecurringDays(recurringDays.filter((d) => d !== dayNum));
      }
    } else {
      setRecurringDays([...recurringDays, dayNum]);
    }
  };

  const handleSelectCategory = (catId) => {
    setCategory(catId);
    setColor(getCategoryDefaultColor(catId));
  };

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setLinkedGoalId(null);
    setLinkedTaskId(null);
    setIsRecurring(false);
    setRecurringUntil('');
    setRecurringDays([1]);
    setIsBackupPlan(false);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un título para la actividad.');
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      color,
      date,
      startTime,
      endTime,
      location: eventToEdit?.location || 'Local / Área asignada',
      notes,
      linkedGoalId,
      linkedTaskId,
      isRecurring,
      recurringUntil: isRecurring ? (recurringUntil || getDefaultLimitDate(date)) : null,
      recurringDays: isRecurring ? recurringDays : [],
      isBackupPlan,
    };

    if (eventToEdit) {
      if (eventToEdit.recurringGroupId) {
        // Show scope selection modal for recurring edit
        setPendingPayload(payload);
        setScopeModalVisible(true);
        return;
      } else {
        updateEvent(eventToEdit.id, payload, 'single');
      }
    } else {
      addEvent(payload);
    }

    resetForm();
    onClose();
  };

  const confirmScopeEdit = (scope) => {
    if (pendingPayload && eventToEdit) {
      updateEvent(eventToEdit.id, pendingPayload, scope);
    }
    setScopeModalVisible(false);
    setPendingPayload(null);
    resetForm();
    onClose();
  };

  const renderIcon = (cat) => {
    const size = 22;
    const isSelected = category === cat?.id;
    const catColor = isSelected ? color : colors.textSecondary;
    if (cat?.lib === 'Ionicons') return <Ionicons name={cat.icon} size={size} color={catColor} />;
    if (cat?.lib === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={cat.icon} size={size} color={catColor} />;
    return <Feather name={cat?.icon || 'circle'} size={size} color={catColor} />;
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const linkedGoalObj = goals.find((g) => g.id === linkedGoalId);
  const linkedTaskObj = (tasks || []).find((t) => t.id === linkedTaskId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: color || colors.primary }]}>
            {eventToEdit ? 'Editar Actividad' : 'Nueva Tarea / Evento'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveBtn, { color: color || colors.primary }]}>GUARDAR</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Categoría Collapsible (reemplaza scroll horizontal) */}
          <View
            style={[
              styles.collapsibleContainer,
              {
                backgroundColor: colors.card,
                borderColor: isCategoryExpanded ? (color || colors.primary) : colors.surfaceBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={toggleCategory}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Categoría actual: ${category}. Pulsa para ${isCategoryExpanded ? 'contraer' : 'expandir'}`}
            >
              <View style={styles.collapsibleLeft}>
                <View
                  style={[
                    styles.activeMiniIcon,
                    { backgroundColor: (color || colors.primary) + '20' },
                  ]}
                >
                  {renderIcon(currentCategoryObj, 18)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.collapsibleMiniLabel, { color: colors.textSecondary }]}>
                    CATEGORÍA DE EVENTO
                  </Text>
                  <Text style={[styles.collapsibleMainText, { color: colors.textPrimary }]}>
                    {category}
                  </Text>
                </View>
              </View>
              <View style={[styles.chevronPill, { backgroundColor: colors.surface }]}>
                <Feather
                  name={isCategoryExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={isCategoryExpanded ? (color || colors.primary) : colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {isCategoryExpanded && (
              <View style={[styles.collapsibleBody, { borderTopColor: colors.surfaceBorder, backgroundColor: colors.card }]}>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryGridCard,
                          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                          isSelected && {
                            borderColor: color || colors.primary,
                            backgroundColor: (color || colors.primary) + '15',
                          },
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          handleSelectCategory(cat.id);
                          setIsCategoryExpanded(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.catIconCircle,
                            isSelected && { backgroundColor: (color || colors.primary) + '25' },
                          ]}
                        >
                          {renderIcon(cat, 18)}
                        </View>
                        <Text
                          style={[
                            styles.catName,
                            {
                              color: isSelected ? (color || colors.primary) : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Color del Evento */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>COLOR DEL EVENTO</Text>
          <View style={styles.colorPaletteRow}>
            {EVENT_COLORS.map((c) => {
              const isSelected = color === c.code;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.code },
                    isSelected && styles.colorCircleSelected,
                  ]}
                  onPress={() => setColor(c.code)}
                  activeOpacity={0.8}
                >
                  {isSelected && <Feather name="check" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Título */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>TÍTULO DEL EVENTO</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
            placeholder="Ej. Preparar clase dominical / Lección PME"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Date & Hours */}
          <View style={styles.rowTwo}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FECHA</Text>
              <TouchableOpacity
                style={[styles.iconInput, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                onPress={() => {
                  setDatePickerTarget('date');
                  setDatePickerVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="calendar" size={18} color={color || colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{date}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>HORARIO (INICIO - FIN)</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.iconInput, { flex: 1, paddingHorizontal: 8, backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                  onPress={() => {
                    setTimePickerTarget('start');
                    setTimePickerVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="clock" size={14} color={color || colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{startTime}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconInput, { flex: 1, paddingHorizontal: 8, backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                  onPress={() => {
                    setTimePickerTarget('end');
                    setTimePickerVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="clock" size={14} color={color || colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{endTime}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Vinculación con Meta (Collapsible) */}
          <View
            style={[
              styles.collapsibleContainer,
              {
                backgroundColor: colors.card,
                borderColor: isGoalExpanded || linkedGoalObj ? (color || colors.primary) : colors.surfaceBorder,
                marginTop: 14,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={toggleGoal}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.collapsibleLeft}>
                <View
                  style={[
                    styles.activeMiniIcon,
                    { backgroundColor: (color || colors.primary) + '20' },
                  ]}
                >
                  <Ionicons name="trophy-outline" size={18} color={color || colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.collapsibleMiniLabel, { color: colors.textSecondary }]}>
                    VINCULAR A META (OPCIONAL)
                  </Text>
                  <Text
                    style={[
                      styles.collapsibleMainText,
                      { color: linkedGoalObj ? (color || colors.primary) : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {linkedGoalObj ? `${linkedGoalObj.name} (${linkedGoalObj.currentValue}/${linkedGoalObj.targetValue} ${linkedGoalObj.unit || ''})` : 'Sin Meta Vinculada'}
                  </Text>
                </View>
              </View>
              <View style={[styles.chevronPill, { backgroundColor: colors.surface }]}>
                <Feather
                  name={isGoalExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={isGoalExpanded ? (color || colors.primary) : colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {isGoalExpanded && (
              <View style={[styles.collapsibleBody, { borderTopColor: colors.surfaceBorder, backgroundColor: colors.card }]}>
                <View style={[styles.helperBanner, { backgroundColor: colors.surface }]}>
                  <Feather name="info" size={14} color={color || colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.subText, { color: colors.textSecondary, flex: 1 }]}>
                    Al marcar este evento como realizado, incrementará el progreso de la meta elegida.
                  </Text>
                </View>

                {/* Opción Desvincular */}
                <TouchableOpacity
                  style={[
                    styles.collapsibleOptionRow,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                    linkedGoalId === null && {
                      borderColor: color || colors.primary,
                      backgroundColor: (color || colors.primary) + '12',
                    },
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setLinkedGoalId(null);
                    setIsGoalExpanded(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      { backgroundColor: linkedGoalId === null ? (color || colors.primary) + '25' : colors.card },
                    ]}
                  >
                    <Feather
                      name="slash"
                      size={15}
                      color={linkedGoalId === null ? (color || colors.primary) : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: linkedGoalId === null ? (color || colors.primary) : colors.textPrimary },
                      ]}
                    >
                      Sin Meta Vinculada
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                      No vincular a ningún objetivo de progreso
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      linkedGoalId === null && {
                        borderColor: color || colors.primary,
                        backgroundColor: color || colors.primary,
                      },
                    ]}
                  >
                    {linkedGoalId === null && <Feather name="check" size={12} color="#0F1418" />}
                  </View>
                </TouchableOpacity>

                {/* Lista de Metas */}
                {goals && goals.length > 0 ? (
                  goals.map((g) => {
                    const isSel = linkedGoalId === g.id;
                    const percent = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.collapsibleOptionRow,
                          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                          isSel && {
                            borderColor: color || colors.primary,
                            backgroundColor: (color || colors.primary) + '12',
                          },
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setLinkedGoalId(g.id);
                          setIsGoalExpanded(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.optionIconBox,
                            { backgroundColor: isSel ? (color || colors.primary) + '25' : colors.card },
                          ]}
                        >
                          <Ionicons
                            name="trophy-outline"
                            size={16}
                            color={isSel ? (color || colors.primary) : colors.textSecondary}
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text
                              style={[
                                styles.optionTitle,
                                { color: isSel ? (color || colors.primary) : colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {g.name}
                            </Text>
                            <Text style={[styles.periodBadge, { color: colors.textMuted }]}>
                              {g.period}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                              {g.currentValue} / {g.targetValue} {g.unit || ''}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: isSel ? (color || colors.primary) : colors.textSecondary,
                              }}
                            >
                              {percent}%
                            </Text>
                          </View>

                          <View style={[styles.progressBarTrack, { backgroundColor: colors.card }]}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${percent}%`,
                                  backgroundColor: isSel ? (color || colors.primary) : (color || colors.primary) + '80',
                                },
                              ]}
                            />
                          </View>
                        </View>

                        <View
                          style={[
                            styles.radioCircle,
                            isSel && {
                              borderColor: color || colors.primary,
                              backgroundColor: color || colors.primary,
                            },
                          ]}
                        >
                          {isSel && <Feather name="check" size={12} color="#0F1418" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyStateBox}>
                    <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                      No tienes metas creadas todavía
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Vinculación con Tarea (Collapsible) */}
          <View
            style={[
              styles.collapsibleContainer,
              {
                backgroundColor: colors.card,
                borderColor: isTaskExpanded || linkedTaskObj ? (color || colors.primary) : colors.surfaceBorder,
                marginTop: 10,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={toggleTask}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.collapsibleLeft}>
                <View
                  style={[
                    styles.activeMiniIcon,
                    { backgroundColor: (color || colors.primary) + '20' },
                  ]}
                >
                  <Feather name="check-square" size={18} color={color || colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.collapsibleMiniLabel, { color: colors.textSecondary }]}>
                    VINCULAR A TAREA / PROYECTO (OPCIONAL)
                  </Text>
                  <Text
                    style={[
                      styles.collapsibleMainText,
                      { color: linkedTaskObj ? (color || colors.primary) : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {linkedTaskObj ? `${linkedTaskObj.title} (${linkedTaskObj.loggedHours}/${linkedTaskObj.requiredHours}h)` : 'Sin Tarea Vinculada'}
                  </Text>
                </View>
              </View>
              <View style={[styles.chevronPill, { backgroundColor: colors.surface }]}>
                <Feather
                  name={isTaskExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={isTaskExpanded ? (color || colors.primary) : colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {isTaskExpanded && (
              <View style={[styles.collapsibleBody, { borderTopColor: colors.surfaceBorder, backgroundColor: colors.card }]}>
                <View style={[styles.helperBanner, { backgroundColor: colors.surface }]}>
                  <Feather name="info" size={14} color={color || colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.subText, { color: colors.textSecondary, flex: 1 }]}>
                    Sumará las horas de este evento al tiempo registrado de la tarea al completarlo.
                  </Text>
                </View>

                {/* Opción Desvincular */}
                <TouchableOpacity
                  style={[
                    styles.collapsibleOptionRow,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                    linkedTaskId === null && {
                      borderColor: color || colors.primary,
                      backgroundColor: (color || colors.primary) + '12',
                    },
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setLinkedTaskId(null);
                    setIsTaskExpanded(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      { backgroundColor: linkedTaskId === null ? (color || colors.primary) + '25' : colors.card },
                    ]}
                  >
                    <Feather
                      name="slash"
                      size={15}
                      color={linkedTaskId === null ? (color || colors.primary) : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: linkedTaskId === null ? (color || colors.primary) : colors.textPrimary },
                      ]}
                    >
                      Sin Tarea Vinculada
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                      No acumular tiempo en ninguna tarea o proyecto
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      linkedTaskId === null && {
                        borderColor: color || colors.primary,
                        backgroundColor: color || colors.primary,
                      },
                    ]}
                  >
                    {linkedTaskId === null && <Feather name="check" size={12} color="#0F1418" />}
                  </View>
                </TouchableOpacity>

                {/* Lista de Tareas */}
                {tasks && tasks.length > 0 ? (
                  tasks.map((t) => {
                    const isSel = linkedTaskId === t.id;
                    const progressPercent = t.requiredHours > 0 ? Math.min(100, Math.round(((t.loggedHours || 0) / t.requiredHours) * 100)) : 0;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.collapsibleOptionRow,
                          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                          isSel && {
                            borderColor: color || colors.primary,
                            backgroundColor: (color || colors.primary) + '12',
                          },
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setLinkedTaskId(t.id);
                          if (t.linkedGoalId) setLinkedGoalId(t.linkedGoalId);
                          setIsTaskExpanded(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.optionIconBox,
                            { backgroundColor: isSel ? (color || colors.primary) + '25' : colors.card },
                          ]}
                        >
                          <Feather
                            name="check-square"
                            size={16}
                            color={isSel ? (color || colors.primary) : colors.textSecondary}
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text
                              style={[
                                styles.optionTitle,
                                { color: isSel ? (color || colors.primary) : colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {t.title}
                            </Text>
                            <Text style={[styles.periodBadge, { color: colors.textMuted }]}>
                              {t.category || 'Tarea'}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                              {t.loggedHours} / {t.requiredHours}h acumuladas
                            </Text>
                            {t.requiredHours > 0 && (
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: isSel ? (color || colors.primary) : colors.textSecondary,
                                }}
                              >
                                {progressPercent}%
                              </Text>
                            )}
                          </View>

                          {t.requiredHours > 0 && (
                            <View style={[styles.progressBarTrack, { backgroundColor: colors.card }]}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: `${progressPercent}%`,
                                    backgroundColor: isSel ? (color || colors.primary) : (color || colors.primary) + '80',
                                  },
                                ]}
                              />
                            </View>
                          )}
                        </View>

                        <View
                          style={[
                            styles.radioCircle,
                            isSel && {
                              borderColor: color || colors.primary,
                              backgroundColor: color || colors.primary,
                            },
                          ]}
                        >
                          {isSel && <Feather name="check" size={12} color="#0F1418" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyStateBox}>
                    <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                      No tienes tareas registradas todavía
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Notas */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOTAS Y DETALLES</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary },
            ]}
            placeholder="Añade recordatorios específicos, dirección o notas..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />

          {/* Plan de Respaldo Switch */}
          <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, marginBottom: 10 }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-outline" size={20} color={color || colors.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Plan de Respaldo</Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Actividad alternativa (borde segmentado)</Text>
              </View>
            </View>
            <Switch
              value={isBackupPlan}
              onValueChange={setIsBackupPlan}
              trackColor={{ false: colors.surfaceBorder, true: color || colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Evento Recurrente Switch */}
          <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="repeat" size={20} color={color || colors.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>Evento Recurrente</Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>Repetir los días seleccionados</Text>
              </View>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={handleToggleRecurring}
              trackColor={{ false: colors.surfaceBorder, true: color || colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Opciones de Recurrencia por Días e Iniciales */}
          {isRecurring && (
            <View style={{ marginBottom: 16, marginTop: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>REPETIR QUÉ DÍAS</Text>
              <View style={styles.daysInitialRow}>
                {DAY_INITIALS.map((item) => {
                  const isSelected = recurringDays.includes(item.dayNum);
                  return (
                    <TouchableOpacity
                      key={item.dayNum}
                      style={[
                        styles.dayChipBtn,
                        { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                        isSelected && { backgroundColor: color || colors.primary, borderColor: color || colors.primary },
                      ]}
                      onPress={() => toggleDaySelection(item.dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>REPETIR HASTA (FECHA LÍMITE)</Text>
              <TouchableOpacity
                style={[styles.iconInput, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                onPress={() => {
                  setDatePickerTarget('recurringUntil');
                  setDatePickerVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Feather name="calendar" size={18} color={color || colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                  {recurringUntil || getDefaultLimitDate(date)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Impact Score Card */}
          <View style={[styles.impactCard, { backgroundColor: colors.card, borderColor: color || colors.primary }]}>
            <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>IMPACTO ESTIMADO</Text>
            <Text style={[styles.impactVal, { color: color || colors.primary }]}>+15 Puntos de Meta</Text>
          </View>

          {/* Reminder Info Card */}
          <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
            <Feather
              name="bell"
              size={16}
              color={settings.notificationsEnabled !== false ? (color || colors.primary) : colors.textMuted}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.reminderText, { color: colors.textSecondary }]}>
              {settings.notificationsEnabled !== false
                ? `Aviso programado ${settings.notificationLeadMinutes ?? 15} min antes (${startTime})`
                : 'Recordatorios desactivados en Configuración'}
            </Text>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={isDatePickerVisible}
          initialDate={datePickerTarget === 'recurringUntil' ? (recurringUntil || getDefaultLimitDate(date)) : date}
          onClose={() => setDatePickerVisible(false)}
          onConfirm={(selectedDateStr) => {
            if (datePickerTarget === 'recurringUntil') {
              setRecurringUntil(selectedDateStr);
            } else {
              setDate(selectedDateStr);
            }
          }}
        />

        {/* Time Picker Modal */}
        <TimePickerModal
          visible={isTimePickerVisible}
          initialTime={timePickerTarget === 'start' ? startTime : endTime}
          title={timePickerTarget === 'start' ? 'Hora de Inicio' : 'Hora de Fin'}
          onClose={() => setTimePickerVisible(false)}
          onConfirm={(selectedTimeStr) => {
            if (timePickerTarget === 'start') {
              setStartTime(selectedTimeStr);
            } else {
              setEndTime(selectedTimeStr);
            }
          }}
        />

        {/* Modal para elegir Alcance de Edición Recurrente */}
        <Modal visible={isScopeModalVisible} transparent animationType="fade" onRequestClose={() => setScopeModalVisible(false)}>
          <View style={styles.overlay}>
            <View style={[styles.scopeCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.scopeTitle, { color: colors.textPrimary }]}>Editar evento recurrente</Text>
              <Text style={[styles.scopeSub, { color: colors.textSecondary }]}>
                ¿Dónde deseas aplicar los cambios realizados?
              </Text>

              <TouchableOpacity
                style={[styles.scopeBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                onPress={() => confirmScopeEdit('single')}
              >
                <Text style={[styles.scopeBtnText, { color: colors.primary }]}>Solo este evento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                onPress={() => confirmScopeEdit('following')}
              >
                <Text style={[styles.scopeBtnText, { color: colors.primary }]}>Este y los siguientes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                onPress={() => confirmScopeEdit('all')}
              >
                <Text style={[styles.scopeBtnText, { color: colors.primary }]}>Todos los eventos de la serie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { marginTop: 8 }]}
                onPress={() => setScopeModalVisible(false)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  saveBtn: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subText: {
    fontSize: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryCard: {
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catName: {
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  rowTwo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
  },
  daysInitialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayChipBtn: {
    flex: 1,
    height: 44,
    marginHorizontal: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  impactCard: {
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    marginTop: 4,
  },
  impactLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  impactVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scopeCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
  },
  scopeTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  scopeSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  scopeBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  scopeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 20,
  },
  reminderText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  // Collapsible Accordion UI/UX Modern Styles
  collapsibleContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  activeMiniIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  collapsibleMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  collapsibleMainText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chevronPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleBody: {
    borderTopWidth: 1,
    padding: 12,
  },
  helperBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  collapsibleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  periodBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  emptyStateBox: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryGridCard: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
