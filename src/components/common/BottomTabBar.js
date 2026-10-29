import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export const TABS = {
  HOME: 'Inicio',
  CALENDAR: 'Calendario',
  TASKS: 'Tareas',
  GOALS: 'Metas',
  PROFILE: 'Perfil',
};

export const BottomTabBar = ({ activeTab, onTabPress }) => {
  const { colors } = useTheme();

  const tabItems = [
    { key: TABS.HOME, label: 'Inicio', icon: 'home' },
    { key: TABS.CALENDAR, label: 'Calendario', icon: 'calendar' },
    { key: TABS.TASKS, label: 'Tareas', icon: 'check-square' },
    { key: TABS.GOALS, label: 'Metas', icon: 'flag' },
    { key: TABS.PROFILE, label: 'Perfil', icon: 'user' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBg, borderTopColor: colors.surfaceBorder }]}>
      {tabItems.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.tabBtn,
              isActive && { backgroundColor: colors.tabActiveBg, borderRadius: 12 },
            ]}
            onPress={() => onTabPress(item.key)}
            activeOpacity={0.8}
          >
            <Feather
              name={item.icon}
              size={24}
              color={isActive ? colors.tabActiveText : colors.tabInactiveText}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.tabActiveText : colors.tabInactiveText },
                isActive && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    marginHorizontal: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 3,
    textAlign: 'center',
  },
});

