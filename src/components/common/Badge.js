import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export const Badge = ({ label, category, customColor, customBg, customTextColor }) => {
  const { colors } = useTheme();

  const getBadgeColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'trabajo':
      case 'llamadas':
        return colors.work;
      case 'salud':
      case 'enseñanza':
        return colors.health;
      case 'personal':
      case 'contacto':
        return colors.personal;
      case 'estudio':
      case 'servicio':
        return colors.study;
      case 'viajes':
        return colors.travel;
      default:
        return colors.primary;
    }
  };

  const badgeColor = customColor || getBadgeColor(category || label);
  const bg = customBg || (badgeColor + '22');
  const txtColor = customTextColor || badgeColor;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: customTextColor ? 'transparent' : badgeColor + '44' }]}>
      <Text style={[styles.text, { color: txtColor }]}>
        {(label || category || 'GENERAL').toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
