import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';

export const LogHoursModal = ({ visible, onClose, task }) => {
  const { colors } = useTheme();
  const { logTaskHours } = useAppData();

  const [hours, setHours] = useState('1.0');

  if (!task) return null;

  const handleLog = () => {
    const cleanStr = String(hours ?? '1').replace(',', '.');
    const num = parseFloat(cleanStr) || 0;
    if (num <= 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert('Por favor ingresa un número de horas mayor a 0.');
      } else {
        Alert.alert('Valor inválido', 'Por favor ingresa un número de horas mayor a 0.');
      }
      return;
    }

    try {
      logTaskHours(task.id, num);
      onClose();
    } catch (e) {
      console.error('Error logging hours:', e);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Registrar Horas Avanzadas</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.taskTitle, { color: colors.primary }]}>{task.title}</Text>
          <Text style={[styles.taskSub, { color: colors.textSecondary }]}>
            Actual: {task.loggedHours} / {task.requiredHours} hrs
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>CANTIDAD DE HORAS A SUMAR</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
            keyboardType="decimal-pad"
            value={hours}
            onChangeText={setHours}
            placeholder="Ej: 1.5"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.quickRow}>
            {['0.5', '1.0', '2.0', '3.0'].map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.chip,
                  { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                  hours === h && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setHours(h)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: hours === h ? '#0F1418' : colors.textPrimary }}>
                  +{h}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.surfaceBorder }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleLog}>
              <Ionicons name="checkmark-circle" size={18} color="#0F1418" style={{ marginRight: 6 }} />
              <Text style={{ color: '#0F1418', fontWeight: '700' }}>Registrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskSub: {
    fontSize: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
