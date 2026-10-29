import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { DatePickerModal } from './DatePickerModal';

export const QuickRescheduleModal = ({
  visible,
  onClose,
  item, // task or event object
  itemType = 'task', // 'task' | 'event'
}) => {
  const { colors } = useTheme();
  const { rescheduleTask, moveTaskToInbox, rescheduleEvent } = useAppData();
  const [isCustomDatePickerVisible, setCustomDatePickerVisible] = useState(false);

  if (!visible || !item) return null;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const inTwoDays = new Date();
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  const inTwoDaysStr = inTwoDays.toISOString().split('T')[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const applyReschedule = (targetDate) => {
    if (itemType === 'task') {
      if (!targetDate) {
        moveTaskToInbox(item.id);
      } else {
        rescheduleTask(item.id, targetDate);
      }
    } else {
      if (targetDate) {
        rescheduleEvent(item.id, targetDate);
      }
    }
    onClose();
  };

  const handleCustomDateSelect = (selectedDateStr) => {
    setCustomDatePickerVisible(false);
    applyReschedule(selectedDateStr);
  };

  const options = [
    {
      id: 'today',
      title: 'Hoy',
      subtitle: 'Trabajar en esto durante el día',
      icon: 'sun',
      action: () => applyReschedule(todayStr),
    },
    {
      id: 'tomorrow',
      title: 'Mañana',
      subtitle: 'Comenzar fresco el día siguiente',
      icon: 'arrow-right',
      action: () => applyReschedule(tomorrowStr),
    },
    {
      id: 'inTwoDays',
      title: 'En 2 días',
      subtitle: 'Dar un respiro a la agenda',
      icon: 'calendar',
      action: () => applyReschedule(inTwoDaysStr),
    },
    {
      id: 'nextWeek',
      title: 'Próxima semana (+7 días)',
      subtitle: 'Aplazar para el siguiente ciclo',
      icon: 'clock',
      action: () => applyReschedule(nextWeekStr),
    },
    ...(itemType === 'task'
      ? [
          {
            id: 'inbox',
            title: 'Mover a Bandeja de Entrada',
            subtitle: 'Quitar fecha para reducir carga mental',
            icon: 'inbox',
            action: () => applyReschedule(null),
          },
        ]
      : []),
    {
      id: 'custom',
      title: 'Elegir otra fecha...',
      subtitle: 'Seleccionar en el calendario',
      icon: 'more-horizontal',
      action: () => setCustomDatePickerVisible(true),
    },
  ];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                      REORGANIZAR SIN CULPA
                    </Text>
                    <Text
                      style={[styles.title, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    accessibilityLabel="Cerrar reprogramación"
                    accessibilityRole="button"
                  >
                    <Feather name="x" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Reschedule Option Rows */}
                <View style={styles.optionsList}>
                  {options.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.optionRow,
                        { borderColor: colors.surfaceBorder },
                      ]}
                      onPress={opt.action}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${opt.title}, ${opt.subtitle}`}
                    >
                      <View
                        style={[
                          styles.optionIconContainer,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <Feather name={opt.icon} size={18} color={colors.primary} />
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                          {opt.title}
                        </Text>
                        <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                          {opt.subtitle}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <DatePickerModal
        visible={isCustomDatePickerVisible}
        onClose={() => setCustomDatePickerVisible(false)}
        onSelectDate={handleCustomDateSelect}
        currentDate={todayStr}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
  },
});
