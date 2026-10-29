import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';

export const QuickCaptureModal = ({ visible, onClose, onOpenFullTaskModal }) => {
  const { colors, isDark } = useTheme();
  const { quickCaptureTask, goals } = useAppData();

  const [title, setTitle] = useState('');
  const [selectedDateOption, setSelectedDateOption] = useState('inbox'); // 'inbox' | 'today' | 'tomorrow'
  const [selectedDuration, setSelectedDuration] = useState('30m'); // '15m' | '30m' | '1h' | '2h'
  const [selectedGoalId, setSelectedGoalId] = useState(null);

  const inputRef = useRef(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    if (visible) {
      setTitle('');
      setSelectedDateOption('inbox');
      setSelectedDuration('30m');
      setSelectedGoalId(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [visible]);

  const durationToHours = (dur) => {
    switch (dur) {
      case '15m': return 0.25;
      case '30m': return 0.5;
      case '1h': return 1.0;
      case '2h': return 2.0;
      default: return 0.5;
    }
  };

  const handleSave = () => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;

    let plannedDate = null;
    if (selectedDateOption === 'today') plannedDate = todayStr;
    if (selectedDateOption === 'tomorrow') plannedDate = tomorrowStr;

    quickCaptureTask({
      title: cleanTitle,
      plannedDate,
      estimatedHours: durationToHours(selectedDuration),
      linkedGoalId: selectedGoalId,
      category: 'Personal',
    });

    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
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
                <View style={styles.headerTitleRow}>
                  <View style={[styles.iconDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Captura Rápida
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  accessibilityLabel="Cerrar captura rápida"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Input Principal */}
              <TextInput
                ref={inputRef}
                style={[
                  styles.titleInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.surfaceBorder,
                    backgroundColor: colors.card,
                  },
                ]}
                placeholder="¿Qué tienes en mente? (Ej. Llamar al médico)"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={handleSave}
                returnKeyType="done"
                accessibilityLabel="Título del pendiente"
              />

              {/* Opciones de 1 toque: Fecha */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                CUÁNDO
              </Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedDateOption === 'inbox' && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                    { borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => setSelectedDateOption('inbox')}
                  accessibilityRole="button"
                  accessibilityLabel="Sin fecha, guardar en bandeja de entrada"
                >
                  <Feather
                    name="inbox"
                    size={14}
                    color={selectedDateOption === 'inbox' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedDateOption === 'inbox' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Bandeja
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedDateOption === 'today' && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                    { borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => setSelectedDateOption('today')}
                  accessibilityRole="button"
                  accessibilityLabel="Programar para hoy"
                >
                  <Feather
                    name="sun"
                    size={14}
                    color={selectedDateOption === 'today' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedDateOption === 'today' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Hoy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedDateOption === 'tomorrow' && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                    { borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => setSelectedDateOption('tomorrow')}
                  accessibilityRole="button"
                  accessibilityLabel="Programar para mañana"
                >
                  <Feather
                    name="calendar"
                    size={14}
                    color={selectedDateOption === 'tomorrow' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedDateOption === 'tomorrow' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Mañana
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Opciones de 1 toque: Duración estimada */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                TIEMPO ESTIMADO
              </Text>
              <View style={styles.chipsRow}>
                {['15m', '30m', '1h', '2h'].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.miniChip,
                      selectedDuration === dur && {
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primary,
                      },
                      { borderColor: colors.surfaceBorder },
                    ]}
                    onPress={() => setSelectedDuration(dur)}
                    accessibilityRole="button"
                    accessibilityLabel={`Duración estimada ${dur}`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selectedDuration === dur ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {dur}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Vinculación opcional a metas si existen */}
              {goals && goals.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    VINCULAR A META (OPCIONAL)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.goalScroll}
                  >
                    {goals.slice(0, 4).map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.chip,
                          selectedGoalId === g.id && {
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primary,
                          },
                          { borderColor: colors.surfaceBorder, marginRight: 8 },
                        ]}
                        onPress={() =>
                          setSelectedGoalId(selectedGoalId === g.id ? null : g.id)
                        }
                      >
                        <Feather
                          name="flag"
                          size={12}
                          color={selectedGoalId === g.id ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            { color: selectedGoalId === g.id ? colors.primary : colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Footer Actions */}
              <View style={styles.footerRow}>
                {onOpenFullTaskModal && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onOpenFullTaskModal();
                    }}
                    style={styles.moreOptionsBtn}
                    accessibilityLabel="Abrir formulario detallado"
                  >
                    <Text style={[styles.moreOptionsText, { color: colors.textSecondary }]}>
                      Más detalles...
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: (title || '').trim() ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                  onPress={handleSave}
                  disabled={!(title || '').trim()}
                  activeOpacity={0.85}
                  accessibilityLabel="Guardar pendiente inmediatamente"
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.saveBtnText,
                      { color: (title || '').trim() ? '#0F1418' : colors.textMuted },
                    ]}
                  >
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
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
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '500',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minHeight: 38,
  },
  miniChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  goalScroll: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  moreOptionsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  moreOptionsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
