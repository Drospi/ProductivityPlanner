import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { Badge } from '../components/common/Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Safe local date parsing at 12:00 PM (noon) to avoid DST / UTC timezone shifts
const parseISODate = (str) => {
  if (!str) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  }
  const [y, m, d] = str.split('-').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d, 12, 0, 0);
};

// Safe local date formatting to YYYY-MM-DD
const formatISODate = (d) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Add / subtract days safely
const addDays = (dateStr, days) => {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
};

// Add / subtract months safely
const addMonths = (dateStr, months) => {
  const d = parseISODate(dateStr);
  d.setMonth(d.getMonth() + months);
  return formatISODate(d);
};

export const CalendarScreen = ({ onOpenNewEvent, onSelectEvent }) => {
  const { colors } = useTheme();
  const { events, settings } = useAppData();

  const [viewMode, setViewMode] = useState('Día'); // 'Día' | 'Semana' | 'Mes'
  const [selectedDate, setSelectedDate] = useState(formatISODate(new Date()));

  const panX = useRef(new Animated.Value(0)).current;

  // Start & End hour bounds from settings (default 7 to 22)
  const startHour = settings.startHour ?? 7;
  const endHour = settings.endHour ?? 22;

  // Generate hours array
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }

  // Days of current week generator
  const getWeekDays = (baseDateStr) => {
    const base = parseISODate(baseDateStr);
    const dayOfWeek = base.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diffToMonday, 12, 0, 0);

    const week = [];
    const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
      const iso = formatISODate(d);
      week.push({
        dateStr: iso,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
      });
    }
    return week;
  };

  const weekDays = getWeekDays(selectedDate);

  // Full Month Days Generator (All 28-31 days with weekday alignment)
  const getMonthDays = (baseDateStr) => {
    const base = parseISODate(baseDateStr);
    const year = base.getFullYear();
    const month = base.getMonth();

    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const dayOfWeek = firstDay.getDay(); // 0 is Sunday
    const paddingCount = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthCells = [];

    // Empty padding cells for previous month alignment
    for (let i = 0; i < paddingCount; i++) {
      monthCells.push({ isPadding: true, key: `pad_${i}` });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day, 12, 0, 0);
      const iso = formatISODate(d);
      monthCells.push({
        isPadding: false,
        key: iso,
        dateStr: iso,
        dayNum: day,
      });
    }

    return monthCells;
  };

  const monthDays = getMonthDays(selectedDate);

  // Month Name Formatter
  const currentMonthYear = (() => {
    const d = parseISODate(selectedDate);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  })();

  const handlePrev = () => {
    setSelectedDate((prevDate) => {
      if (viewMode === 'Mes') {
        return addMonths(prevDate, -1);
      } else if (viewMode === 'Semana') {
        return addDays(prevDate, -7);
      } else {
        return addDays(prevDate, -1);
      }
    });
  };

  const handleNext = () => {
    setSelectedDate((prevDate) => {
      if (viewMode === 'Mes') {
        return addMonths(prevDate, 1);
      } else if (viewMode === 'Semana') {
        return addDays(prevDate, 7);
      } else {
        return addDays(prevDate, 1);
      }
    });
  };

  const animateDateChange = (direction) => {
    const toVal = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const fromVal = direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.timing(panX, {
      toValue: toVal,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'next') handleNext();
      else handlePrev();
      panX.setValue(fromVal);
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 16,
      }).start();
    });
  };

  // Interactive PanResponder for horizontal swipe detection with real-time finger movement
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
        );
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        panX.stopAnimation();
      },
      onPanResponderMove: (evt, gestureState) => {
        panX.setValue(gestureState.dx);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (evt, gestureState) => {
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 0.25;

        if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -VELOCITY_THRESHOLD) {
          // Swipe Left (finger moves left) -> Advance to Next Day (10 -> 11 -> 12 ...)
          animateDateChange('next');
        } else if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > VELOCITY_THRESHOLD) {
          // Swipe Right (finger moves right) -> Go back to Previous Day (12 -> 11 -> 10 ...)
          animateDateChange('prev');
        } else {
          // Snap back smoothly
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
            speed: 18,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const todayISO = formatISODate(new Date());
  const isToday = selectedDate === todayISO;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const HOUR_HEIGHT = 72;

  // Offset calculation for current time line in Day timeline view
  const timeLineTopOffset = ((currentHour - startHour) * 60 + currentMinute) / 60 * HOUR_HEIGHT;

  const timeToMinutes = (tStr) => {
    if (!tStr) return 0;
    const parts = tStr.split(':').map((v) => parseInt(v, 10));
    return (isNaN(parts[0]) ? 0 : parts[0]) * 60 + (isNaN(parts[1]) ? 0 : parts[1]);
  };

  const dayStartMinutes = startHour * 60;

  // Filter events for selected date & calculate absolute top / height geometry
  const eventsForDay = events
    .filter((ev) => ev.date === selectedDate)
    .map((ev) => {
      const startM = timeToMinutes(ev.startTime || '07:00');
      let endM = timeToMinutes(ev.endTime || '');
      if (endM <= startM) endM = startM + 60; // Default 1h duration

      const startOffsetM = Math.max(0, startM - dayStartMinutes);
      const durationM = Math.max(20, endM - startM);

      const top = (startOffsetM / 60) * HOUR_HEIGHT;
      const height = Math.max(38, (durationM / 60) * HOUR_HEIGHT);

      return {
        ...ev,
        startM,
        endM,
        top,
        height,
      };
    });

  // Position overlapping events into columns (Main task on left, Backup on right)
  const positionedEvents = eventsForDay.map((ev) => {
    const overlapping = eventsForDay.filter(
      (other) => !(ev.endM <= other.startM || ev.startM >= other.endM)
    );

    if (overlapping.length <= 1) {
      return { ...ev, colIndex: 0, totalCols: 1 };
    }

    const mainTasks = overlapping.filter((o) => !o.isBackupPlan);
    const backupTasks = overlapping.filter((o) => o.isBackupPlan);

    if (ev.isBackupPlan) {
      return { ...ev, colIndex: 1, totalCols: 2 };
    } else {
      const mainIdx = mainTasks.findIndex((m) => m.id === ev.id);
      if (backupTasks.length > 0) {
        return { ...ev, colIndex: 0, totalCols: 2 };
      } else {
        return {
          ...ev,
          colIndex: mainIdx >= 0 ? mainIdx : 0,
          totalCols: mainTasks.length || 1,
        };
      }
    }
  });

  const isLightColor = (hex) => {
    if (!hex) return false;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return false;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 180 || hex.toUpperCase() === '#FACC15';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month Header & Controls */}
      <View style={[styles.topHeader, { borderBottomColor: colors.surfaceBorder }]}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => animateDateChange('prev')} style={{ paddingRight: 4, paddingVertical: 4 }}>
            <Feather name="chevron-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>{currentMonthYear}</Text>
          <TouchableOpacity onPress={() => animateDateChange('next')} style={{ paddingLeft: 4, paddingVertical: 4 }}>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* View Mode Switcher */}
        <View style={[styles.modeSegmentTrack, { backgroundColor: colors.surface }]}>
          {['Día', 'Semana', 'Mes'].map((mode) => {
            const isSel = viewMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeBtn,
                  isSel && { backgroundColor: colors.primary, borderRadius: 8 },
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={{ color: isSel ? '#0F1418' : colors.textSecondary, fontWeight: '700', fontSize: 11 }}>
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* HOY & Swipe Hint (Arrows replaced by Swipe) */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.todayBtn,
              {
                backgroundColor: isToday ? colors.primary : colors.surface,
                borderColor: isToday ? colors.primary : colors.surfaceBorder,
              },
            ]}
            onPress={() => setSelectedDate(todayISO)}
            activeOpacity={0.8}
          >
            <Text style={[styles.todayBtnText, { color: isToday ? '#0F1418' : colors.primary }]}>HOY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Week Day Carousel (For Día & Semana views) */}
      {viewMode !== 'Mes' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysCarousel}>
          {weekDays.map((item) => {
            const isSel = item.dateStr === selectedDate;
            const isItemToday = item.dateStr === todayISO;
            return (
              <TouchableOpacity
                key={item.dateStr}
                style={[
                  styles.dayChip,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                  isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !isSel && isItemToday && { borderColor: colors.primary + '55' },
                ]}
                onPress={() => setSelectedDate(item.dateStr)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayName, { color: isSel ? '#0F1418' : isItemToday ? colors.primary : colors.textSecondary }]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.dayNum, { color: isSel ? '#0F1418' : colors.textPrimary }]}>
                  {item.dayNum}
                </Text>
                {!isSel && isItemToday ? (
                  <View style={[styles.todayChipDot, { backgroundColor: colors.primary }]} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Main Content Area according to viewMode with finger-following animation */}
      <Animated.View
        style={{ flex: 1, transform: [{ translateX: panX }] }}
        {...panResponder.panHandlers}
      >
        <ScrollView contentContainerStyle={styles.scheduleContent}>
        {viewMode === 'Día' && (
          <View style={[styles.dayTimelineContainer, { height: (endHour - startHour + 1) * HOUR_HEIGHT }]}>
            {/* Background Hour Grid & Dividers */}
            {hours.map((hourStr, idx) => (
              <View
                key={hourStr}
                style={[
                  styles.hourGridRow,
                  { top: idx * HOUR_HEIGHT, height: HOUR_HEIGHT },
                ]}
              >
                <TouchableOpacity
                  style={styles.hourTextContainer}
                  onPress={() => onOpenNewEvent(selectedDate, hourStr, false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.hourText, { color: colors.textSecondary }]}>{hourStr}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gridSlotLine, { borderTopColor: colors.surfaceBorder }]}
                  onPress={() => onOpenNewEvent(selectedDate, hourStr, false)}
                  activeOpacity={0.6}
                />
              </View>
            ))}

            {/* Red Current Time Line Overlay */}
            {isToday && currentHour >= startHour && currentHour <= endHour && (
              <View style={[styles.currentTimeLine, { top: timeLineTopOffset }]} pointerEvents="none">
                <View style={[styles.currentTimeDot, { backgroundColor: colors.danger || '#E63956' }]} />
                <View style={[styles.currentTimeBar, { backgroundColor: colors.danger || '#E63956' }]} />
              </View>
            )}

            {/* Overlayed Absolute Events Canvas */}
            <View style={styles.eventsCanvas}>
              {positionedEvents.map((ev) => {
                const isTwoCols = ev.totalCols >= 2;
                const colWidth = isTwoCols ? '48.5%' : '100%';
                const leftPos = ev.colIndex === 0 ? '0%' : `${(ev.colIndex / ev.totalCols) * 100}%`;
                const eventColor = ev.color || colors.primary;
                const isLight = isLightColor(eventColor);
                const txtColor = isLight ? '#0F172A' : '#FFFFFF';
                const subColor = isLight ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.85)';
                const badgeBg = isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.22)';

                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[
                      styles.eventBoxAbsolute,
                      {
                        top: ev.top,
                        height: ev.height,
                        left: leftPos,
                        width: colWidth,
                        backgroundColor: eventColor,
                        borderColor: ev.isBackupPlan ? (isLight ? '#0F172A' : '#FFFFFF') : 'transparent',
                        borderStyle: ev.isBackupPlan ? 'dashed' : 'solid',
                        borderWidth: ev.isBackupPlan ? 2 : 0,
                      },
                      ev.completed && { opacity: 0.65 },
                    ]}
                    onPress={() => onSelectEvent(ev)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.eventInner}>
                      <View style={[styles.rowBetween, { marginBottom: 2 }]}>
                        <Badge
                          label={ev.category}
                          category={ev.category}
                          customColor={txtColor}
                          customBg={badgeBg}
                          customTextColor={txtColor}
                        />
                        <Text style={[styles.timeRange, { color: subColor }]}>
                          {ev.startTime} - {ev.endTime}
                        </Text>
                      </View>

                      {ev.isBackupPlan ? (
                        <View style={styles.backupHeaderTag}>
                          <Ionicons name="shield" size={10} color={txtColor} style={{ marginRight: 3 }} />
                          <Text style={[styles.backupTagText, { color: txtColor }]}>RESPALDO</Text>
                        </View>
                      ) : ev.linkedTaskId ? (
                        <View style={styles.backupHeaderTag}>
                          <Ionicons name="checkbox-outline" size={10} color={txtColor} style={{ marginRight: 3 }} />
                          <Text style={[styles.backupTagText, { color: txtColor }]}>TAREA</Text>
                        </View>
                      ) : null}

                      <Text
                        style={[
                          styles.eventTitle,
                          { color: txtColor, fontWeight: '800' },
                          ev.completed && styles.lineThrough,
                        ]}
                        numberOfLines={ev.height < 50 ? 1 : 2}
                      >
                        {ev.title}
                      </Text>

                      {ev.height >= 60 && ev.location ? (
                        <View style={[styles.row, { marginTop: 2 }]}>
                          <Feather name="map-pin" size={10} color={subColor} style={{ marginRight: 3 }} />
                          <Text style={[styles.locationText, { color: subColor }]} numberOfLines={1}>
                            {ev.location}
                          </Text>
                        </View>
                      ) : null}

                      {ev.height >= 84 && ev.notes ? (
                        <Text style={[styles.notesText, { color: subColor }]} numberOfLines={1}>
                          {ev.notes}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {viewMode === 'Semana' && (
          <View style={styles.weekMatrix}>
            <Text style={[styles.weekMatrixTitle, { color: colors.primary }]}>Vista Semanal</Text>
            {weekDays.map((day) => {
              const dayEvs = events.filter((e) => e.date === day.dateStr);
              return (
                <View key={day.dateStr} style={[styles.weekDayRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <View style={styles.weekDayHeader}>
                    <Text style={[styles.weekDayTitle, { color: colors.primary }]}>
                      {day.dayName} {day.dayNum}
                    </Text>
                    <Text style={[styles.weekEvCount, { color: colors.textSecondary }]}>
                      {dayEvs.length} actividades
                    </Text>
                  </View>
                  {dayEvs.map((ev) => {
                    const evColor = ev.color || colors.primary;
                    const isLight = isLightColor(evColor);
                    const txtColor = isLight ? '#0F172A' : '#FFFFFF';
                    const subColor = isLight ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)';
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        style={[styles.miniEventChip, { backgroundColor: evColor, borderColor: 'transparent' }]}
                        onPress={() => onSelectEvent(ev)}
                      >
                        <Text style={[styles.miniTime, { color: subColor }]}>{ev.startTime}</Text>
                        <Text style={[styles.miniTitle, { color: txtColor, fontWeight: '800' }]} numberOfLines={1}>
                          {ev.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.addMiniBtn}
                    onPress={() => onOpenNewEvent(day.dateStr, '09:00')}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Añadir a este día</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {viewMode === 'Mes' && (
          <View style={[styles.monthCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.monthCardTitle, { color: colors.primary }]}>{currentMonthYear}</Text>

            {/* Weekday Headers */}
            <View style={styles.monthHeaderRow}>
              {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map((headLabel) => (
                <Text key={headLabel} style={[styles.monthHeaderCell, { color: colors.textSecondary }]}>
                  {headLabel}
                </Text>
              ))}
            </View>

            {/* Full Month Grid */}
            <View style={styles.monthGrid}>
              {monthDays.map((cell) => {
                if (cell.isPadding) {
                  return <View key={cell.key} style={styles.monthCellEmpty} />;
                }

                const isSel = cell.dateStr === selectedDate;
                const isItemToday = cell.dateStr === todayISO;
                const dayEvents = events.filter((e) => e.date === cell.dateStr);
                const hasEvents = dayEvents.length > 0;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.monthCell,
                      { borderColor: colors.surfaceBorder },
                      isSel && { backgroundColor: colors.primary, borderRadius: 10 },
                      !isSel && isItemToday && { borderColor: colors.primary, borderWidth: 1.5, borderRadius: 10 },
                    ]}
                    onPress={() => {
                      setSelectedDate(cell.dateStr);
                      setViewMode('Día');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthCellNum, { color: isSel ? '#0F1418' : colors.textPrimary }]}>
                      {cell.dayNum}
                    </Text>

                    {hasEvents ? (
                      <View style={styles.monthCellEventBadge}>
                        <View style={[styles.dotIndicator, { backgroundColor: isSel ? '#0F1418' : colors.primary }]} />
                        {dayEvents.length > 1 ? (
                          <Text style={[styles.miniEventCountText, { color: isSel ? '#0F1418' : colors.primary }]}>
                            {dayEvents.length}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '800',
  },
  modeSegmentTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  daysCarousel: {
    flexDirection: 'row',
    flexGrow: 0,
    height: 70,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dayChip: {
    width: 58,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 1,
  },
  todayChipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  scheduleContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  dayTimelineContainer: {
    position: 'relative',
    marginTop: 8,
    width: '100%',
  },
  hourGridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourTextContainer: {
    width: 50,
    paddingTop: 0,
    paddingRight: 4,
  },
  hourText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridSlotLine: {
    flex: 1,
    height: '100%',
    borderTopWidth: 1,
  },
  eventsCanvas: {
    position: 'absolute',
    left: 52,
    right: 0,
    top: 0,
    bottom: 0,
  },
  eventBoxAbsolute: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 5,
  },
  colorAccent: {
    width: 4,
  },
  segmentedLeftContainer: {
    width: 6,
    paddingVertical: 3,
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  dashSegment: {
    width: 3.5,
    height: 4,
    borderRadius: 0,
  },
  eventInner: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backupHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  backupTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRange: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  lineThrough: {
    textDecorationLine: 'line-through',
  },
  locationText: {
    fontSize: 10,
  },
  notesText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  weekMatrix: {
    marginTop: 12,
  },
  weekMatrixTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  weekDayRow: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekEvCount: {
    fontSize: 12,
  },
  miniEventChip: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    alignItems: 'center',
  },
  miniTime: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 8,
  },
  miniTitle: {
    fontSize: 12,
    flex: 1,
  },
  addMiniBtn: {
    marginTop: 6,
    paddingVertical: 4,
  },
  monthCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  monthCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthHeaderCell: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCellEmpty: {
    width: '14.28%',
    height: 52,
  },
  monthCell: {
    width: '14.28%',
    height: 52,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  monthCellNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  monthCellEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  miniEventCountText: {
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 2,
  },
});
