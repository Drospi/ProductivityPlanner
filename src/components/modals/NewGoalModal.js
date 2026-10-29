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

const CATEGORIES = [
  { id: 'Enseñanza', label: 'Trabajo / Lección', icon: 'work-outline', lib: 'MaterialIcons', color: '#38BDF8' },
  { id: 'Salud', label: 'Salud', icon: 'favorite-outline', lib: 'MaterialIcons', color: '#4ADE80' },
  { id: 'Personal', label: 'Personal', icon: 'person-outline', lib: 'MaterialIcons', color: '#FB923C' },
  { id: 'Estudio', label: 'Estudio', icon: 'school-outline', lib: 'Ionicons', color: '#A855F7' },
];

export const NewGoalModal = ({ visible, onClose, goalToEdit = null }) => {
  const { colors } = useTheme();
  const { addGoal, updateGoal, deleteGoal } = useAppData();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Enseñanza');
  const [type, setType] = useState('Cuantitativa'); // Cuantitativa | Hábito
  const [targetValue, setTargetValue] = useState('15');
  const [unit, setUnit] = useState('Lecciones');
  const [reviewFreq, setReviewFreq] = useState('Semanal'); // Diario | Semanal | Mensual

  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name || '');
      setCategory(goalToEdit.category || 'Enseñanza');
      setType(goalToEdit.type || 'Cuantitativa');
      setTargetValue(goalToEdit.targetValue ? String(goalToEdit.targetValue) : '15');
      setUnit(goalToEdit.unit || 'Lecciones');
      setReviewFreq(goalToEdit.reviewFreq || (goalToEdit.period === 'Mensual' ? 'Mensual' : 'Semanal'));
    } else {
      setName('');
      setCategory('Enseñanza');
      setType('Cuantitativa');
      setTargetValue('15');
      setUnit('Lecciones');
      setReviewFreq('Semanal');
    }
  }, [goalToEdit, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un nombre para la meta.');
      return;
    }

    const valNum = parseInt(targetValue, 10) || 10;

    if (goalToEdit) {
      updateGoal(goalToEdit.id, {
        name: name.trim(),
        category,
        type,
        targetValue: valNum,
        unit: unit.trim() || 'unidades',
        period: reviewFreq === 'Mensual' ? 'Mensual' : 'Semanal',
        reviewFreq,
      });
    } else {
      addGoal({
        name: name.trim(),
        category,
        type,
        currentValue: 0,
        targetValue: valNum,
        unit: unit.trim() || 'unidades',
        period: reviewFreq === 'Mensual' ? 'Mensual' : 'Semanal',
        reviewFreq,
      });
    }

    // Reset and close
    setName('');
    setTargetValue('15');
    setUnit('Lecciones');
    onClose();
  };

  const handleDelete = () => {
    if (!goalToEdit) return;
    Alert.alert(
      'Eliminar Meta',
      `¿Estás seguro de que deseas eliminar la meta "${goalToEdit.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteGoal(goalToEdit.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {goalToEdit ? 'Editar Meta' : 'Nueva Meta'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveBtn, { color: colors.primary }]}>GUARDAR</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Nombre de la Meta */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOMBRE DE LA META</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
            placeholder="Ej. Enseñar 20 lecciones / Leer 100 páginas"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          {/* Categoría */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>CATEGORÍA</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSel = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBtn,
                    { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                    isSel && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <View style={[styles.iconBox, { backgroundColor: cat.color + '22' }]}>
                    {cat.lib === 'MaterialIcons' ? (
                      <MaterialIcons name={cat.icon} size={22} color={cat.color} />
                    ) : (
                      <Ionicons name={cat.icon} size={22} color={cat.color} />
                    )}
                  </View>
                  <Text style={[styles.catText, { color: isSel ? colors.primary : colors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tipo de Medición */}
          <View style={[styles.measurementBox, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TIPO DE MEDICIÓN</Text>
            <View style={[styles.toggleTrack, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.toggleSegment,
                  type === 'Cuantitativa' && { backgroundColor: colors.card, elevation: 2 },
                ]}
                onPress={() => setType('Cuantitativa')}
              >
                <Text style={{ color: type === 'Cuantitativa' ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                  Cuantitativa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleSegment,
                  type === 'Hábito' && { backgroundColor: colors.card, elevation: 2 },
                ]}
                onPress={() => setType('Hábito')}
              >
                <Text style={{ color: type === 'Hábito' ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                  Hábito
                </Text>
              </TouchableOpacity>
            </View>

            {/* Target & Unit */}
            <View style={styles.rowTwo}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>VALOR OBJETIVO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={targetValue}
                  onChangeText={setTargetValue}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>UNIDAD</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
                  placeholder="Ej. Lecciones, Días"
                  placeholderTextColor={colors.textMuted}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>
          </View>

          {/* Frecuencia de Revisión */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>FRECUENCIA DE REVISIÓN</Text>
          <View style={styles.freqRow}>
            {['Diario', 'Semanal', 'Mensual'].map((freq) => {
              const isSel = reviewFreq === freq;
              return (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.freqBtn,
                    { backgroundColor: colors.card, borderColor: colors.surfaceBorder },
                    isSel && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setReviewFreq(freq)}
                >
                  <Text style={{ color: isSel ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                    {freq}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Delete Button if Editing */}
          {goalToEdit && (
            <TouchableOpacity
              style={[styles.deleteGoalBtn, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' }]}
              onPress={handleDelete}
            >
              <Feather name="trash-2" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.deleteGoalText}>ELIMINAR META</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  deleteGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 28,
  },
  deleteGoalText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  saveBtn: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryBtn: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
  },
  measurementBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  toggleTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  toggleSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  rowTwo: {
    flexDirection: 'row',
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
});
