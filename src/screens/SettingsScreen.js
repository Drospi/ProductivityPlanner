import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';

export const SettingsScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { settings, updateSettings, goals, events } = useAppData();

  const [userName, setUserName] = useState(settings.userName || 'Elder Alex');
  const [missionName, setMissionName] = useState(settings.missionName || 'Misión Chile Santiago');

  const startHour = settings.startHour ?? 7;
  const endHour = settings.endHour ?? 22;

  const handleSaveProfile = () => {
    updateSettings({ userName, missionName });
    Alert.alert('Perfil Actualizado', 'Tus datos de misionero se han guardado con éxito.');
  };

  const adjustStartHour = (delta) => {
    const next = Math.max(0, Math.min(endHour - 1, startHour + delta));
    updateSettings({ startHour: next });
  };

  const adjustEndHour = (delta) => {
    const next = Math.min(23, Math.max(startHour + 1, endHour + delta));
    updateSettings({ endHour: next });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.avatarLarge}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.profileName, { color: colors.textPrimary }]}>{settings.userName || 'Elder Alex'}</Text>
        <Text style={[styles.profileMission, { color: colors.textSecondary }]}>
          {settings.missionName || 'Misión Chile Santiago'}
        </Text>
      </View>

      {/* Rango Horario del Calendario (REQUERIMIENTO CLAVE) */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Configuración de Calendario</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
        Define la franja horaria visible en las vistas diaria y semanal del calendario.
      </Text>

      <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {/* Hora Inicio */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Hora Inicio</Text>
            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
              Primera hora visible ({startHour.toString().padStart(2, '0')}:00 AM)
            </Text>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.surfaceBorder }]}
              onPress={() => adjustStartHour(-1)}
            >
              <Feather name="minus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.stepperVal, { color: colors.primary }]}>{startHour}:00</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.surfaceBorder }]}
              onPress={() => adjustStartHour(1)}
            >
              <Feather name="plus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

        {/* Hora Fin */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Hora Fin</Text>
            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
              Última hora visible ({endHour.toString().padStart(2, '0')}:00 PM)
            </Text>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.surfaceBorder }]}
              onPress={() => adjustEndHour(-1)}
            >
              <Feather name="minus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.stepperVal, { color: colors.primary }]}>{endHour}:00</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.surfaceBorder }]}
              onPress={() => adjustEndHour(1)}
            >
              <Feather name="plus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notificaciones de Recordatorios */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 20 }]}>
        Notificaciones de Recordatorios
      </Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
        Recibe avisos locales en tu dispositivo antes del inicio de tus actividades programadas.
      </Text>

      <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {/* Activar / Desactivar Notificaciones */}
        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Feather
              name="bell"
              size={20}
              color={settings.notificationsEnabled !== false ? colors.primary : colors.textMuted}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Recordatorios Locales</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {settings.notificationsEnabled !== false ? 'Avisos activados para tus actividades' : 'Avisos desactivados'}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.notificationsEnabled !== false}
            onValueChange={(val) => updateSettings({ notificationsEnabled: val })}
            trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {settings.notificationsEnabled !== false && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

            {/* Tiempo de Anticipación */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
              TIEMPO DE ANTICIPACIÓN DEL AVISO
            </Text>
            <View style={styles.leadMinutesRow}>
              {[5, 10, 15, 30, 60].map((mins) => {
                const isSelected = (settings.notificationLeadMinutes ?? 15) === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.leadChip,
                      { backgroundColor: colors.background, borderColor: colors.surfaceBorder },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => updateSettings({ notificationLeadMinutes: mins })}
                  >
                    <Text style={{ color: isSelected ? '#0F1418' : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Apariencia / Modo Oscuro */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 20 }]}>Apariencia</Text>
      <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Feather name={isDark ? 'moon' : 'sun'} size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Modo Oscuro</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {isDark ? 'Tema Cyberpunk Oscuro activo' : 'Tema Claro activo'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Editar Datos de Misionero */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 20 }]}>Perfil de Misionero</Text>
      <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOMBRE DEL MISIONERO / USUARIO</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
          value={userName}
          onChangeText={setUserName}
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 8 }]}>MISIÓN / ZONA ASIGNADA</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
          value={missionName}
          onChangeText={setMissionName}
        />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile}>
          <Text style={styles.saveBtnText}>GUARDAR PERFIL</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 20 }]}>Resumen Acumulado</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.gridBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.gridVal, { color: colors.primary }]}>{events.length}</Text>
          <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Actividades Creadas</Text>
        </View>
        <View style={[styles.gridBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.gridVal, { color: colors.health }]}>{goals.length}</Text>
          <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Metas PME Activas</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileMission: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 12,
  },
  settingCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontSize: 15,
    fontWeight: '800',
    marginHorizontal: 10,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#0F1418',
    fontSize: 13,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gridBox: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  gridVal: {
    fontSize: 24,
    fontWeight: '800',
  },
  gridLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  leadMinutesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  leadChip: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 3,
  },
});
