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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { DatePickerModal } from './DatePickerModal';
import { TimePickerModal } from './TimePickerModal';

export const ScheduleTaskModal = ({ visible, onClose, task }) => {
  const { colors } = useTheme();
  const { scheduleTaskInCalendar } = useAppData();

  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('10:00');
  const [durationStr, setDurationStr] = useState('02:00');
  const [eventTitle, setEventTitle] = useState('');
  const [notes, setNotes] = useState('');

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisible] = useState(false);
  const [isDurationPickerVisible, setDurationPickerVisible] = useState(false);

  const durationStrToHours = (str) => {
    if (!str) return 1.0;
    const parts = str.split(':');
    if (parts.length < 2) return parseFloat(str) || 1.0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return Math.max(0.25, Math.round((h + m / 60) * 100) / 100);
  };

  const hoursToDurationStr = (num) => {
    const floatVal = parseFloat(num) || 1.0;
    const h = Math.floor(floatVal);
    const m = Math.round((floatVal - h) * 60);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  useEffect(() => {
    if (task) {
      setEventTitle(task.title || '');
      setNotes(task.notes || '');
      setDate(todayStr);
      setStartTime('10:00');
      const rem = task.requiredHours ? Math.max(0.5, task.requiredHours - task.loggedHours) : 2.0;
      setDurationStr(hoursToDurationStr(rem >= 1 ? Math.min(2.0, rem) : rem));
    }
  }, [task, visible]);

  if (!task) return null;

  const remainingHours = task.requiredHours
    ? Math.max(0, Math.round((task.requiredHours - task.loggedHours) * 10) / 10)
    : 0;

  const handleConfirmSchedule = async () => {
    const cleanTitle = (eventTitle || '').trim();
    if (!cleanTitle) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Por favor ingresa un título para el bloque de tiempo.');
      } else {
        Alert.alert('Campo requerido', 'Por favor ingresa un título para el bloque de tiempo.');
      }
      return;
    }

    const dur = durationStrToHours(durationStr);

    try {
      await scheduleTaskInCalendar({
        taskId: task.id,
        date,
        startTime,
        durationHours: dur,
        title: cleanTitle,
        notes: (notes || '').trim(),
      });

      onClose();

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert(`¡Horas Asignadas! Se ha programado un bloque de ${dur} hrs (${durationStr}) para "${cleanTitle}".`);
      } else {
        Alert.alert(
          '¡Horas Asignadas!',
          `Se ha programado un bloque de ${dur} hrs (${durationStr}) para "${cleanTitle}" el día ${date} a las ${startTime} en tu Calendario.`
        );
      }
    } catch (e) {
      console.error('Error scheduling task in calendar:', e);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Asignar Horas en Calendario</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {task.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Task Info Pill */}
            <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.infoTitle, { color: colors.primary }]}>
                  Progreso actual: {task.loggedHours} / {task.requiredHours} hrs
                </Text>
                <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                  Faltan {remainingHours} hrs para completar el objetivo.
                </Text>
              </View>
            </View>

            {/* Event Title */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TÍTULO DEL BLOQUE / EVENTO *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary },
              ]}
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Nombre del bloque en el calendario"
              placeholderTextColor={colors.textMuted}
            />

            {/* Date Picker Button */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>FECHA DEL EVENTO *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{date}</Text>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Start Time Picker Button */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>HORA DE INICIO (RELOJ) *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
              onPress={() => setStartTimePickerVisible(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{startTime} hrs</Text>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Duration Selector Clock Button */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>DURACIÓN DEL BLOQUE (RELOJ HORAS : MINUTOS) *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
              onPress={() => setDurationPickerVisible(true)}
            >
              <Ionicons name="timer-outline" size={18} color={colors.primary} />
              <Text style={[styles.pickerText, { color: colors.textPrimary }]}>
                {durationStr} hrs ({durationStrToHours(durationStr)} h equivalentes)
              </Text>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Quick Presets Row */}
            <View style={styles.quickDurationRow}>
              {['00:30', '01:00', '01:30', '02:00', '03:00', '04:00'].map((dStr) => (
                <TouchableOpacity
                  key={dStr}
                  style={[
                    styles.durationChip,
                    { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                    durationStr === dStr && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setDurationStr(dStr)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: durationStr === dStr ? '#0F1418' : colors.textPrimary,
                    }}
                  >
                    {dStr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>NOTAS ADICIONALES</Text>
            <TextInput
              style={[
                styles.input,
                { height: 60, backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary },
              ]}
              multiline
              numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalles específicos para este bloque..."
              placeholderTextColor={colors.textMuted}
            />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.surfaceBorder }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleConfirmSchedule}>
              <Ionicons name="calendar-sharp" size={18} color="#0F1418" style={{ marginRight: 6 }} />
              <Text style={{ color: '#0F1418', fontWeight: '700', fontSize: 14 }}>
                Agendar e Incrementar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={date}
        onSelectDate={(d) => setDate(d)}
        onConfirm={(d) => setDate(d)}
      />

      <TimePickerModal
        visible={isStartTimePickerVisible}
        title="Hora de Inicio"
        initialTime={startTime}
        onClose={() => setStartTimePickerVisible(false)}
        onConfirm={(t) => setStartTime(t)}
        onSelectTime={(t) => setStartTime(t)}
      />

      <TimePickerModal
        visible={isDurationPickerVisible}
        title="Duración del Bloque (Horas : Minutos)"
        initialTime={durationStr}
        onClose={() => setDurationPickerVisible(false)}
        onConfirm={(t) => setDurationStr(t)}
        onSelectTime={(t) => setDurationStr(t)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
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
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoSub: {
    fontSize: 11,
    marginTop: 2,
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  quickDurationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  durationChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
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
    flex: 2,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
