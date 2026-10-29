import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const DatePickerModal = ({
  visible,
  initialDate,
  selectedDate,
  onClose,
  onConfirm,
  onSelectDate,
}) => {
  const { colors } = useTheme();
  const dateToUse = initialDate || selectedDate || new Date().toISOString().split('T')[0];

  const parseDateStr = (dateStr) => {
    try {
      const parts = (dateStr || new Date().toISOString().split('T')[0]).split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    } catch (e) {
      return new Date();
    }
  };

  const [selectedDateObj, setSelectedDateObj] = useState(parseDateStr(dateToUse));
  const [viewDate, setViewDate] = useState(parseDateStr(dateToUse));

  useEffect(() => {
    if (visible) {
      const d = parseDateStr(dateToUse);
      setSelectedDateObj(d);
      setViewDate(d);
    }
  }, [visible, dateToUse]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleConfirm = () => {
    const yyyy = selectedDateObj.getFullYear();
    const mm = (selectedDateObj.getMonth() + 1).toString().padStart(2, '0');
    const dd = selectedDateObj.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    if (typeof onConfirm === 'function') onConfirm(dateStr);
    if (typeof onSelectDate === 'function') onSelectDate(dateStr);
    onClose();
  };

  // Days matrix generator
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const grid = [];
  // Blank cells before 1st of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    grid.push(null);
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(d);
  }

  const today = new Date();
  const isToday = (day) =>
    day &&
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const isSelected = (day) =>
    day &&
    selectedDateObj.getFullYear() === viewYear &&
    selectedDateObj.getMonth() === viewMonth &&
    selectedDateObj.getDate() === day;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              {/* Modal Header */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>Seleccionar Fecha</Text>

              {/* Month Navigation */}
              <View style={styles.monthHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                  <Feather name="chevron-left" size={22} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text style={[styles.monthTitle, { color: colors.primary }]}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                  <Feather name="chevron-right" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Weekday Row */}
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={[styles.weekdayText, { color: colors.textSecondary }]}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Day Grid */}
              <View style={styles.grid}>
                {grid.map((day, idx) => {
                  if (day === null) {
                    return <View key={`blank_${idx}`} style={styles.dayCell} />;
                  }
                  const sel = isSelected(day);
                  const tod = isToday(day);

                  return (
                    <TouchableOpacity
                      key={`day_${day}`}
                      style={styles.dayCell}
                      onPress={() => setSelectedDateObj(new Date(viewYear, viewMonth, day))}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dayBubble,
                          sel && { backgroundColor: colors.primary },
                          !sel && tod && { borderWidth: 1.5, borderColor: colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            { color: sel ? '#0F1418' : colors.textPrimary },
                            sel && { fontWeight: '800' },
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.surfaceBorder }]}
                  onPress={onClose}
                >
                  <Text style={[styles.btnText, { color: colors.textPrimary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.btnText, { color: '#0F1418', fontWeight: '800' }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: 320,
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navBtn: {
    padding: 6,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
