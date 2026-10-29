import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export const TimePickerModal = ({
  visible,
  initialTime,
  selectedTime,
  onClose,
  onConfirm,
  onSelectTime,
  title = 'Seleccionar Hora',
}) => {
  const { colors } = useTheme();
  const timeToUse = initialTime || selectedTime || '10:00';

  const parseTime = (timeStr) => {
    try {
      const [h, m] = (timeStr || '10:00').split(':').map((v) => parseInt(v, 10));
      return {
        hour: isNaN(h) ? 10 : h % 24,
        minute: isNaN(m) ? 0 : m % 60,
      };
    } catch (e) {
      return { hour: 10, minute: 0 };
    }
  };

  const parsed = parseTime(timeToUse);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [mode, setMode] = useState('hours'); // 'hours' | 'minutes'

  useEffect(() => {
    if (visible) {
      const p = parseTime(timeToUse);
      setSelectedHour(p.hour);
      setSelectedMinute(p.minute);
      setMode('hours');
    }
  }, [visible, timeToUse]);

  const handleConfirm = () => {
    const hh = selectedHour.toString().padStart(2, '0');
    const mm = selectedMinute.toString().padStart(2, '0');
    const resultStr = `${hh}:${mm}`;
    if (typeof onConfirm === 'function') onConfirm(resultStr);
    if (typeof onSelectTime === 'function') onSelectTime(resultStr);
    onClose();
  };

  // Clock Dial Geometry
  const CENTER = 120;
  const R_OUTER = 86;
  const R_INNER = 52;

  // Hours layout (Outer: 1..12, Inner: 13..23, 00)
  const outerHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const innerHours = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  const getPosition = (index, radius) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    };
  };

  // Determine current pointer target coordinates
  const getSelectedCoords = () => {
    if (mode === 'hours') {
      const isInner = selectedHour === 0 || selectedHour >= 13;
      const radius = isInner ? R_INNER : R_OUTER;
      const index = isInner
        ? innerHours.indexOf(selectedHour)
        : outerHours.indexOf(selectedHour === 0 ? 12 : selectedHour);
      return getPosition(index >= 0 ? index : 0, radius);
    } else {
      // Minutes 0..59 (snap pointer to closest 5-minute tick for dial)
      const minuteStep = Math.round(selectedMinute / 5) % 12;
      return getPosition(minuteStep, R_OUTER);
    }
  };

  const selectedPos = getSelectedCoords();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              {/* Header Title */}
              <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>

              {/* Digital Time Boxes */}
              <View style={styles.digitalRow}>
                <TouchableOpacity
                  style={[
                    styles.timeBox,
                    { backgroundColor: mode === 'hours' ? colors.primary + '25' : colors.card },
                    mode === 'hours' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setMode('hours')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeBoxText, { color: colors.textPrimary }]}>
                    {selectedHour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.colon, { color: colors.textPrimary }]}>:</Text>

                <TouchableOpacity
                  style={[
                    styles.timeBox,
                    { backgroundColor: mode === 'minutes' ? colors.primary + '25' : colors.card },
                    mode === 'minutes' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setMode('minutes')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeBoxText, { color: colors.textPrimary }]}>
                    {selectedMinute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Clock Face Dial */}
              <View style={[styles.clockFace, { backgroundColor: colors.background }]}>
                {/* Pointer Line */}
                <View
                  style={[
                    styles.pointerLine,
                    {
                      backgroundColor: colors.primary,
                      width: Math.sqrt(
                        Math.pow(selectedPos.x - CENTER, 2) + Math.pow(selectedPos.y - CENTER, 2)
                      ),
                      transform: [
                        {
                          rotate: `${
                            (Math.atan2(selectedPos.y - CENTER, selectedPos.x - CENTER) * 180) /
                            Math.PI
                          }deg`,
                        },
                      ],
                    },
                  ]}
                />
                {/* Pointer Center Dot */}
                <View style={[styles.centerDot, { backgroundColor: colors.primary }]} />

                {/* Hours Mode Dial */}
                {mode === 'hours' ? (
                  <>
                    {/* Outer Ring (1-12) */}
                    {outerHours.map((h, idx) => {
                      const pos = getPosition(idx, R_OUTER);
                      const isSel = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={`out_${h}`}
                          style={[
                            styles.numberBubble,
                            { left: pos.x - 16, top: pos.y - 16 },
                            isSel && [styles.selectedBubble, { backgroundColor: colors.primary }],
                          ]}
                          onPress={() => {
                            setSelectedHour(h);
                            setMode('minutes');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.numberText,
                              { color: isSel ? '#FFFFFF' : colors.textPrimary },
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Inner Ring (13-23, 00) */}
                    {innerHours.map((h, idx) => {
                      const pos = getPosition(idx, R_INNER);
                      const isSel = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={`in_${h}`}
                          style={[
                            styles.numberBubble,
                            styles.innerBubble,
                            { left: pos.x - 14, top: pos.y - 14 },
                            isSel && [styles.selectedBubble, { backgroundColor: colors.primary }],
                          ]}
                          onPress={() => {
                            setSelectedHour(h);
                            setMode('minutes');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.numberText,
                              { fontSize: 11, color: isSel ? '#FFFFFF' : colors.textSecondary },
                            ]}
                          >
                            {h === 0 ? '00' : h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  /* Minutes Mode Dial */
                  [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, idx) => {
                    const pos = getPosition(idx, R_OUTER);
                    const isSel = Math.abs(selectedMinute - m) < 3 || (m === 55 && selectedMinute >= 58);
                    return (
                      <TouchableOpacity
                        key={`min_${m}`}
                        style={[
                          styles.numberBubble,
                          { left: pos.x - 16, top: pos.y - 16 },
                          isSel && [styles.selectedBubble, { backgroundColor: colors.primary }],
                        ]}
                        onPress={() => setSelectedMinute(m)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.numberText,
                            { color: isSel ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {m.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.surfaceBorder }]}
                  onPress={onClose}
                >
                  <Text style={[styles.btnText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.okBtn, { backgroundColor: colors.primary }]}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.btnText, { color: '#0F1418', fontWeight: '800' }]}>OK</Text>
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
    width: 310,
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  digitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeBox: {
    width: 90,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxText: {
    fontSize: 42,
    fontWeight: '700',
  },
  colon: {
    fontSize: 36,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  clockFace: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 116,
    top: 116,
    zIndex: 10,
  },
  pointerLine: {
    height: 2,
    position: 'absolute',
    left: 120,
    top: 120,
    transformOrigin: 'left center',
    zIndex: 5,
  },
  numberBubble: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  innerBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedBubble: {
    borderRadius: 16,
    elevation: 3,
  },
  numberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {},
  okBtn: {},
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
