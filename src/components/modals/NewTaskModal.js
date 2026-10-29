import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { DatePickerModal } from './DatePickerModal';

const CATEGORIES = [
  { id: 'Enseñanza', label: 'Enseñanza', icon: 'school-outline', color: '#10B981' },
  { id: 'Estudio', label: 'Estudio', icon: 'book-outline', color: '#A855F7' },
  { id: 'Contacto', label: 'Contacto', icon: 'person-add-outline', color: '#F97316' },
  { id: 'Salud', label: 'Salud', icon: 'heart-outline', color: '#EF4444' },
  { id: 'Personal', label: 'Personal', icon: 'person-outline', color: '#3B82F6' },
  { id: 'Servicio', label: 'Servicio', icon: 'gift-outline', color: '#EC4899' },
];

export const NewTaskModal = ({ visible, onClose, taskToEdit = null }) => {
  const { colors } = useTheme();
  const { goals, addTask, updateTask, deleteTask } = useAppData();

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [type, setType] = useState('pendiente'); // 'diaria' | 'pendiente'
  const [linkedGoalId, setLinkedGoalId] = useState(null);
  const [requiredHours, setRequiredHours] = useState('2');
  const [category, setCategory] = useState('Enseñanza');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    setTitleError('');
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setType(taskToEdit.type || 'pendiente');
      setLinkedGoalId(taskToEdit.linkedGoalId || null);
      setRequiredHours(taskToEdit.requiredHours != null ? String(taskToEdit.requiredHours) : '2');
      setCategory(taskToEdit.category || 'Enseñanza');
      setDueDate(taskToEdit.dueDate || '');
      setNotes(taskToEdit.notes || '');
    } else {
      setTitle('');
      setType('pendiente');
      setLinkedGoalId(null);
      setRequiredHours('2');
      setCategory('Enseñanza');
      setDueDate('');
      setNotes('');
    }
  }, [taskToEdit, visible]);

  const handleSave = () => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) {
      setTitleError('Por favor ingresa un título para la tarea.');
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Por favor ingresa un título para la tarea.');
      } else {
        Alert.alert('Campo requerido', 'Por favor ingresa un título para la tarea.');
      }
      return;
    }

    const cleanHoursStr = String(requiredHours ?? '1').replace(',', '.');
    const hrsNum = type === 'diaria' ? 0 : (parseFloat(cleanHoursStr) || 1.0);

    try {
      if (taskToEdit) {
        updateTask(taskToEdit.id, {
          title: cleanTitle,
          type,
          linkedGoalId,
          requiredHours: hrsNum,
          category,
          dueDate: dueDate || null,
          plannedDate: taskToEdit.plannedDate || (dueDate ? dueDate : null),
          status: taskToEdit.status || (dueDate ? 'scheduled' : 'inbox'),
          notes: (notes || '').trim(),
        });
      } else {
        addTask({
          title: cleanTitle,
          type,
          linkedGoalId,
          requiredHours: hrsNum,
          category,
          dueDate: dueDate || null,
          plannedDate: dueDate || null,
          status: dueDate ? 'scheduled' : 'inbox',
          notes: (notes || '').trim(),
        });
      }
      onClose();
    } catch (e) {
      console.error('Error saving task:', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Error al guardar: ' + e.message);
      }
    }
  };

  const handleDelete = () => {
    if (!taskToEdit) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm && window.confirm(`¿Estás seguro de eliminar la tarea "${taskToEdit.title}"?`)) {
        deleteTask(taskToEdit.id);
        onClose();
      }
      return;
    }

    Alert.alert(
      'Eliminar Tarea',
      `¿Estás seguro de eliminar la tarea "${taskToEdit.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTask(taskToEdit.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {/* Modal Header */}
          <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {taskToEdit ? 'Editar Tarea' : 'Nueva Tarea / Proyecto'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TÍTULO DE LA TAREA *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: titleError ? colors.danger : colors.surfaceBorder, color: colors.textPrimary },
              ]}
              placeholder="Ej: Lectura diaria o Preparar informe"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
            />
            {titleError ? (
              <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                {titleError}
              </Text>
            ) : null}

            {/* Type Selector (Diaria vs Pendiente) */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE TAREA *</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                  type === 'diaria' && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setType('diaria')}
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={type === 'diaria' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeTitle,
                    { color: type === 'diaria' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Tarea Diaria
                </Text>
                <Text style={[styles.typeDesc, { color: colors.textMuted }]}>Rutina / Hábito rápido sin horas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                  type === 'pendiente' && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setType('pendiente')}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={20}
                  color={type === 'pendiente' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeTitle,
                    { color: type === 'pendiente' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Tarea Pendiente
                </Text>
                <Text style={[styles.typeDesc, { color: colors.textMuted }]}>To-Do puntual o Proyecto de horas</Text>
              </TouchableOpacity>
            </View>

            {/* Hours Required (Only for Pendiente) */}
            {type === 'pendiente' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>HORAS REQUERIDAS (ESTIMACIÓN) *</Text>
                <View style={styles.hoursRow}>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1, backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary },
                    ]}
                    keyboardType="decimal-pad"
                    placeholder="Ej: 4.5"
                    placeholderTextColor={colors.textMuted}
                    value={requiredHours}
                    onChangeText={setRequiredHours}
                  />
                  <View style={styles.quickHoursBtns}>
                    {['0.5', '1', '2', '5', '10'].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.quickChip,
                          { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                          requiredHours === h && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setRequiredHours(h)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: requiredHours === h ? '#0F1418' : colors.textPrimary }}>
                          {h}h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Link to Goal */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>RELACIONAR A UNA META (OPCIONAL)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              <TouchableOpacity
                style={[
                  styles.goalChip,
                  { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                  linkedGoalId === null && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setLinkedGoalId(null)}
              >
                <Feather name="minus-circle" size={14} color={linkedGoalId === null ? colors.primary : colors.textMuted} />
                <Text style={[styles.chipText, { color: linkedGoalId === null ? colors.primary : colors.textPrimary }]}>
                  Sin Meta
                </Text>
              </TouchableOpacity>

              {goals.map((g) => {
                const isSelected = linkedGoalId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.goalChip,
                      { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setLinkedGoalId(g.id)}
                  >
                    <Feather name="flag" size={14} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORÍA</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={18}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Due Date (Optional for Pending) */}
            {type === 'pendiente' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>FECHA LÍMITE (OPCIONAL)</Text>
                <TouchableOpacity
                  style={[
                    styles.dateSelectorBtn,
                    { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.dateText, { color: dueDate ? colors.textPrimary : colors.textMuted }]}>
                    {dueDate ? dueDate : 'Seleccionar fecha límite'}
                  </Text>
                  {dueDate ? (
                    <TouchableOpacity onPress={() => setDueDate('')}>
                      <Feather name="x-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              </>
            )}

            {/* Notes */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>NOTAS / DETALLES</Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary },
              ]}
              placeholder="Escribe notas adicionales o pasos del proyecto..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Modal Footer */}
          <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>
            {taskToEdit ? (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: colors.danger + '20' }]}
                onPress={handleDelete}
              >
                <Feather name="trash-2" size={18} color={colors.danger} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.surfaceBorder }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={{ color: '#0F1418', fontWeight: '700', fontSize: 15 }}>
                {taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={dueDate || new Date().toISOString().split('T')[0]}
        onSelectDate={(d) => setDueDate(d)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  typeDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickHoursBtns: {
    flexDirection: 'row',
    gap: 5,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  horizontalChips: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
