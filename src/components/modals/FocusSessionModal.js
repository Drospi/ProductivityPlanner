import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';

export const FocusSessionModal = ({
  visible,
  onClose,
  activity, // Recommended action object { originalId, itemType, title, category, reason }
}) => {
  const { colors, isDark } = useTheme();
  const { recordFocusSession, toggleTaskCompletion, toggleEventCompletion } = useAppData();

  const [totalSeconds, setTotalSeconds] = useState(25 * 60); // 25 min default
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTotalSeconds(25 * 60);
      setRemainingSeconds(25 * 60);
      setIsRunning(true);
      setHasStarted(true);
    } else {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible, activity]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  if (!visible || !activity) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const elapsedSeconds = totalSeconds - remainingSeconds;
  const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  const setPresetMinutes = (mins) => {
    setIsRunning(false);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
  };

  const handleFinishAndComplete = () => {
    const isTask = activity.itemType === 'task';
    const taskId = isTask ? activity.originalId : null;
    const eventId = !isTask ? activity.originalId : null;

    recordFocusSession(elapsedMinutes, taskId, eventId, true);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`¡Excelente trabajo! Has completado "${activity.title}" y sumado ${elapsedMinutes} min de enfoque.`);
    } else {
      Alert.alert(
        '¡Gran trabajo!',
        `Completaste "${activity.title}" y registraste ${elapsedMinutes} minutos de enfoque.`
      );
    }

    onClose();
  };

  const handleCloseSession = () => {
    if (elapsedMinutes >= 1) {
      const isTask = activity.itemType === 'task';
      const taskId = isTask ? activity.originalId : null;
      recordFocusSession(elapsedMinutes, taskId, null, false);
    }
    onClose();
  };

  const progressPercent = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCloseSession}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeIconBtn}
            onPress={handleCloseSession}
            accessibilityLabel="Pausar y salir del modo enfoque"
            accessibilityRole="button"
          >
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.badgeContainer}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>MODO ENFOQUE</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.calmSubtitle, { color: colors.textSecondary }]}>
            UNA SOLA COSA A LA VEZ
          </Text>
          <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>
            {activity.title}
          </Text>
          <Text style={[styles.reasonText, { color: colors.textMuted }]}>
            {activity.reason || 'Concéntrate en avanzar paso a paso. Lo demás puede esperar.'}
          </Text>

          {/* Timer Display */}
          <View style={[styles.timerCircle, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
            <Text style={[styles.timerDigits, { color: colors.primary }]}>
              {timeFormatted}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
              {isRunning ? 'EN PROCESO' : remainingSeconds === 0 ? '¡TIEMPO CUMPLIDO!' : 'EN PAUSA'}
            </Text>
          </View>

          {/* Preset Buttons */}
          <View style={styles.presetsRow}>
            {[15, 25, 45].map((m) => {
              const isSelected = totalSeconds === m * 60;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.presetBtn,
                    isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    { borderColor: colors.surfaceBorder },
                  ]}
                  onPress={() => setPresetMinutes(m)}
                  accessibilityLabel={`Ajustar sesión a ${m} minutos`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {m} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Play / Pause Toggle */}
          <TouchableOpacity
            style={[
              styles.playBtn,
              { backgroundColor: isRunning ? colors.card : colors.primaryLight, borderColor: colors.primary },
            ]}
            onPress={() => setIsRunning(!isRunning)}
            accessibilityLabel={isRunning ? 'Pausar temporizador' : 'Iniciar temporizador'}
            accessibilityRole="button"
          >
            <Feather
              name={isRunning ? 'pause' : 'play'}
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.playBtnText, { color: colors.primary }]}>
              {isRunning ? 'Pausar' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={[styles.bottomBar, { borderTopColor: colors.surfaceBorder }]}>
          <TouchableOpacity
            style={[styles.completeBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinishAndComplete}
            activeOpacity={0.85}
            accessibilityLabel="Marcar actividad completada y guardar tiempo"
            accessibilityRole="button"
          >
            <Feather name="check" size={20} color="#0F1418" style={{ marginRight: 8 }} />
            <Text style={styles.completeBtnText}>Completar Actividad</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 12,
  },
  closeIconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  calmSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 28,
  },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  timerDigits: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  presetBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 6,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minHeight: 48,
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    minHeight: 52,
  },
  completeBtnText: {
    color: '#0F1418',
    fontSize: 16,
    fontWeight: '700',
  },
});
