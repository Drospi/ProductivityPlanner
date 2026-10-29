import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';
import { Badge } from '../common/Badge';

export const CompleteEventModal = ({ visible, event, onClose, onEditEvent, onRescheduleEvent }) => {
  const { colors } = useTheme();
  const { toggleEventCompletion, deleteEvent, goals } = useAppData();
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [isDeleteScopeModalVisible, setDeleteScopeModalVisible] = useState(false);

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
      }, 2200);
    } else if (status) {
      setFeedbackMessage('¡Actividad completada con éxito!');
      setTimeout(() => {
        setFeedbackMessage(null);
        onClose();
      }, 1500);
    } else {
      setFeedbackMessage('Actividad marcada como no realizada.');
      setTimeout(() => {
        setFeedbackMessage(null);
        onClose();
      }, 1500);
    }
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
          {/* Top Row */}
          <View style={styles.topRow}>
            <Badge label={event.category} category={event.category} customColor={event.color} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onEditEvent && (
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
            <View style={[styles.linkedBox, { backgroundColor: (event.color || colors.primary) + '15', borderColor: event.color || colors.primary }]}>
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
          ) : (
            <>
              {/* Question */}
              <Text style={[styles.question, { color: colors.textPrimary }]}>¿Realizaste esta actividad?</Text>

              {/* Status Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: event.completed ? colors.primaryLight : colors.surface, borderColor: colors.primary },
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
                    { backgroundColor: !event.completed ? colors.surfaceBorder : colors.surface, borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => handleMark(false)}
                  activeOpacity={0.8}
                >
                  <Feather name="x-circle" size={20} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                  <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                    No Realizada
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Links Row (Reprogramar, Editar & Eliminar) */}
              <View style={styles.actionRowBottom}>
                {onRescheduleEvent && (
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

                {onEditEvent && (
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
            </>
          )}

          {/* Scope selection modal for deletion */}
          <Modal visible={isDeleteScopeModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteScopeModalVisible(false)}>
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
