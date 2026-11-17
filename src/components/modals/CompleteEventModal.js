import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { Badge } from '../common/Badge';
import { QUICK_REPLACEMENT_OPTIONS, getLocalDateStr } from '../../utils/telemetry';

export const CompleteEventModal = ({ visible, event, onClose, onEditEvent, onRescheduleEvent }) => {
  const { colors } = useTheme();
  const { toggleEventCompletion, deleteEvent, recordReplacementActivity, goals } = useAppData();
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [isDeleteScopeModalVisible, setDeleteScopeModalVisible] = useState(false);

  // Optional collapsible state for "¿Qué hiciste en su lugar?"
  const [isReplacementOpen, setReplacementOpen] = useState(false);
  const [replacementText, setReplacementText] = useState('');
  const [replacementCategory, setReplacementCategory] = useState('Personal');
  const [markedNotDoneInSession, setMarkedNotDoneInSession] = useState(false);

  useEffect(() => {
    if (visible) {
      setFeedbackMessage(null);
      setReplacementOpen(false);
      setReplacementText('');
      setReplacementCategory(event?.category || 'Personal');
      setMarkedNotDoneInSession(false);
    }
  }, [visible, event?.id]);

  if (!event) return null;

  const linkedGoal = event.linkedGoalId ? goals.find((g) => g.id === event.linkedGoalId) : null;

  const handleMark = (status) => {
    const result = toggleEventCompletion(event.id, status);

    if (status && result && result.goal) {
      setFeedbackMessage(
        `¡Excelente! 🎯\nSe incrementó +1 al contador de tu meta:\n"${result.goal.name}"`
      );
      setTimeout(() => {
        setFeedbackMessage(null);
        onClose();
      }, 2000);
    } else if (status) {
      setFeedbackMessage('¡Actividad completada con éxito!');
      setTimeout(() => {
        setFeedbackMessage(null);
        onClose();
      }, 1400);
    } else {
      setMarkedNotDoneInSession(true);
    }
  };

  const handleSaveOptionalReplacement = async () => {
    const clean = replacementText.trim();
    if (!clean) return;

    await recordReplacementActivity({
      originalItemId: event.id,
      originalItemType: 'event',
      replacementTitle: clean,
      category: replacementCategory || event.category || 'Personal',
      linkedGoalId: event.linkedGoalId || null,
      date: event.date || getLocalDateStr(),
      startTime: event.startTime || '12:00',
      endTime: event.endTime || '13:00',
      actionForOriginal: 'keep',
    });

    setFeedbackMessage(`Registrado en su lugar:\n"${clean}"`);
    setTimeout(() => {
      setFeedbackMessage(null);
      onClose();
    }, 1500);
  };

  const handleDeletePress = () => {
    if (event.recurringGroupId) {
      setDeleteScopeModalVisible(true);
    } else {
      deleteEvent(event.id, 'single');
      onClose();
    }
  };

  const confirmDeleteScope = (scope) => {
    deleteEvent(event.id, scope);
    setDeleteScopeModalVisible(false);
    onClose();
  };

  const handleEditPress = () => {
    onClose();
    if (onEditEvent) {
      onEditEvent(event);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
            {/* Top Row */}
            <View style={styles.topRow}>
              <Badge label={event.category} category={event.category} customColor={event.color} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {onEditEvent && !event.isTelemetry && (
                  <TouchableOpacity onPress={handleEditPress} style={{ padding: 4 }}>
                    <Feather name="edit-2" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>{event.title}</Text>

            {/* Meta Info */}
            <View style={styles.infoRow}>
              <Feather name="clock" size={16} color={event.color || colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {event.startTime} - {event.endTime} ({event.date})
              </Text>
            </View>

            {event.location ? (
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={event.color || colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.location}</Text>
              </View>
            ) : null}

            {linkedGoal ? (
              <View
                style={[
                  styles.linkedBox,
                  {
                    backgroundColor: (event.color || colors.primary) + '15',
                    borderColor: event.color || colors.primary,
                  },
                ]}
              >
                <Ionicons name="trophy-outline" size={18} color={event.color || colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.linkedText, { color: event.color || colors.primary }]}>
                  Vinculada a Meta: {linkedGoal.name} ({linkedGoal.currentValue}/{linkedGoal.targetValue})
                </Text>
              </View>
            ) : null}

            {event.notes ? (
              <Text style={[styles.notes, { color: colors.textMuted }]}>"{event.notes}"</Text>
            ) : null}

            {/* Feedback Overlay Message */}
            {feedbackMessage ? (
              <View style={[styles.feedbackContainer, { backgroundColor: colors.primary + '22' }]}>
                <Text style={[styles.feedbackText, { color: colors.primary }]}>{feedbackMessage}</Text>
              </View>
            ) : event.isTelemetry ? (
              <View style={[styles.telemetryInfoBox, { backgroundColor: '#8B5CF618', borderColor: '#8B5CF655' }]}>
                <Feather name="activity" size={18} color="#8B5CF6" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.textPrimary, lineHeight: 17 }}>
                  Este bloque fue registrado automáticamente por telemetría al superar los 15 minutos de uso.
                </Text>
              </View>
            ) : (
              <>
                {/* Question */}
                <Text style={[styles.question, { color: colors.textPrimary }]}>¿Realizaste esta actividad?</Text>

                {/* Status Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: event.completed ? colors.primaryLight : colors.surface,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleMark(true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="check-circle" size={20} color={colors.primary} style={{ marginBottom: 4 }} />
                    <Text style={[styles.btnText, { color: colors.primary }]}>
                      {event.completed ? 'Realizado ✓' : 'Sí, Realizada'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor:
                          !event.completed || markedNotDoneInSession ? colors.warning + '18' : colors.surface,
                        borderColor:
                          !event.completed || markedNotDoneInSession ? colors.warning : colors.surfaceBorder,
                      },
                    ]}
                    onPress={() => handleMark(false)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name="x-circle"
                      size={20}
                      color={!event.completed || markedNotDoneInSession ? colors.warning : colors.textSecondary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.btnText,
                        { color: !event.completed || markedNotDoneInSession ? colors.warning : colors.textSecondary },
                      ]}
                    >
                      No Realizada
                    </Text>
                  </TouchableOpacity>
                </View>

                {markedNotDoneInSession && (
                  <Text style={{ fontSize: 11, color: colors.warning, textAlign: 'center', marginTop: 8, fontWeight: '600' }}>
                    Marcada como no realizada. Puedes cerrar o registrar qué hiciste abajo (opcional).
                  </Text>
                )}

                {/* Collapsible: Acceso rápido opcional "¿Qué hiciste en su lugar?" */}
                {(!event.completed || markedNotDoneInSession) && (
                  <View style={[styles.collapsibleBox, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
                    <TouchableOpacity
                      style={styles.collapsibleHeader}
                      onPress={() => setReplacementOpen((prev) => !prev)}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Feather name="zap" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>
                            ¿Qué hiciste en su lugar?
                          </Text>
                          <View style={[styles.optionalTag, { backgroundColor: colors.surfaceBorder }]}>
                            <Text style={[styles.optionalTagText, { color: colors.textSecondary }]}>OPCIONAL</Text>
                          </View>
                        </View>
                        {!isReplacementOpen && (
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                            Acceso rápido en 1 toque
                          </Text>
                        )}
                      </View>
                      <Feather
                        name={isReplacementOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isReplacementOpen && (
                      <View style={{ marginTop: 10 }}>
                        <View style={styles.quickChipsWrap}>
                          {QUICK_REPLACEMENT_OPTIONS.map((opt) => {
                            const isSel = replacementText === opt.label;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.quickChip,
                                  {
                                    backgroundColor: isSel ? colors.primaryLight : colors.surface,
                                    borderColor: isSel ? colors.primary : colors.surfaceBorder,
                                  },
                                ]}
                                onPress={() => {
                                  setReplacementText(opt.label);
                                  setReplacementCategory(opt.category);
                                }}
                              >
                                <Feather
                                  name={opt.icon}
                                  size={11}
                                  color={isSel ? colors.primary : colors.textSecondary}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: isSel ? colors.primary : colors.textPrimary,
                                  }}
                                >
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <TextInput
                          style={[
                            styles.repInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.surfaceBorder,
                              color: colors.textPrimary,
                            },
                          ]}
                          placeholder="O escribe qué hiciste (opcional)..."
                          placeholderTextColor={colors.textMuted}
                          value={replacementText}
                          onChangeText={setReplacementText}
                        />

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={[styles.omitBtn, { borderColor: colors.surfaceBorder }]}
                            onPress={onClose}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                              Omitir
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.saveQuickBtn,
                              {
                                backgroundColor: replacementText.trim() ? colors.primary : colors.surfaceBorder,
                              },
                            ]}
                            onPress={handleSaveOptionalReplacement}
                            disabled={!replacementText.trim()}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: replacementText.trim() ? '#0F1418' : colors.textMuted,
                              }}
                            >
                              Registrar en su lugar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Action Links Row (Reprogramar, Editar & Eliminar) */}
            {!feedbackMessage && (
              <View style={styles.actionRowBottom}>
                {onRescheduleEvent && !event.isTelemetry && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onRescheduleEvent(event);
                    }}
                    style={styles.editBtnLink}
                  >
                    <Feather name="calendar" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.editLinkText, { color: colors.primary }]}>Reprogramar</Text>
                  </TouchableOpacity>
                )}

                {onEditEvent && !event.isTelemetry && (
                  <TouchableOpacity onPress={handleEditPress} style={styles.editBtnLink}>
                    <Feather name="edit-3" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.editLinkText, { color: colors.textSecondary }]}>Editar</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleDeletePress} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={[styles.deleteText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Scope selection modal for deletion */}
          <Modal
            visible={isDeleteScopeModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteScopeModalVisible(false)}
          >
            <View style={styles.overlay}>
              <View style={[styles.scopeCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[styles.scopeTitle, { color: colors.textPrimary }]}>Eliminar evento recurrente</Text>
                <Text style={[styles.scopeSub, { color: colors.textSecondary }]}>
                  ¿Qué instancias de la serie deseas eliminar?
                </Text>

                <TouchableOpacity
                  style={[styles.scopeBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                  onPress={() => confirmDeleteScope('single')}
                >
                  <Text style={[styles.scopeBtnText, { color: colors.danger }]}>Solo este evento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scopeBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                  onPress={() => confirmDeleteScope('following')}
                >
                  <Text style={[styles.scopeBtnText, { color: colors.danger }]}>Este y los siguientes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scopeBtn, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}
                  onPress={() => confirmDeleteScope('all')}
                >
                  <Text style={[styles.scopeBtnText, { color: colors.danger }]}>Todos los eventos de la serie</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { marginTop: 8 }]}
                  onPress={() => setDeleteScopeModalVisible(false)}
                >
                  <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  linkedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 10,
  },
  linkedText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  telemetryInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  collapsibleBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionalTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  optionalTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  repInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  omitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveQuickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 18,
  },
  editBtnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackContainer: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
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
});
