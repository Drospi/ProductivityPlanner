import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export const ProgressBar = ({ progress = 0, color, height = 8 }) => {
  const { colors } = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const barColor = color || colors.primary;

  return (
    <View style={[styles.track, { height, backgroundColor: colors.surfaceBorder, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress}%`,
            backgroundColor: barColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
