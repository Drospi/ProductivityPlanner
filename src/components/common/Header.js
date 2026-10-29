import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAppData } from '../../context/AppDataContext';

export const Header = ({ onSearchPress, onProfilePress }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { settings } = useAppData();

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBg, borderBottomColor: colors.surfaceBorder }]}>
      <View style={styles.leftRow}>
        <Feather name="calendar" size={22} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.title, { color: colors.primary }]}>Enfoque Diario</Text>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme} activeOpacity={0.7}>
          <Feather name={isDark ? 'sun' : 'moon'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress} activeOpacity={0.7}>
          <Feather name="search" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
          onPress={onProfilePress}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 44, // For safe area
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginRight: 4,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginLeft: 6,
  },
});
