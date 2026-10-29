import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppDataProvider } from './src/context/AppDataContext';
import { Header } from './src/components/common/Header';
import { BottomTabBar, TABS } from './src/components/common/BottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NewEventModal } from './src/components/modals/NewEventModal';
import { NewGoalModal } from './src/components/modals/NewGoalModal';
import { NewTaskModal } from './src/components/modals/NewTaskModal';
import { ScheduleTaskModal } from './src/components/modals/ScheduleTaskModal';
import { LogHoursModal } from './src/components/modals/LogHoursModal';
import { CompleteEventModal } from './src/components/modals/CompleteEventModal';
import { QuickCaptureModal } from './src/components/modals/QuickCaptureModal';
import { QuickRescheduleModal } from './src/components/modals/QuickRescheduleModal';
import { FocusSessionModal } from './src/components/modals/FocusSessionModal';
import { DailyReviewModal } from './src/components/modals/DailyReviewModal';
import { Feather } from '@expo/vector-icons';

function MainApp() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(TABS.HOME);

  // Modal States - Event & Goal
  const [isNewEventModalVisible, setNewEventModalVisible] = useState(false);
  const [newEventDefaultDate, setNewEventDefaultDate] = useState(null);
  const [newEventDefaultTime, setNewEventDefaultTime] = useState(null);
  const [newEventDefaultIsBackup, setNewEventDefaultIsBackup] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [isNewGoalModalVisible, setNewGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isCompleteModalVisible, setCompleteModalVisible] = useState(false);

  // Modal States - Task & Productivity Overhaul
  const [isQuickCaptureModalVisible, setQuickCaptureModalVisible] = useState(false);
  const [isNewTaskModalVisible, setNewTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isScheduleTaskModalVisible, setScheduleTaskModalVisible] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState(null);
  const [isLogHoursModalVisible, setLogHoursModalVisible] = useState(false);
  const [loggingTask, setLoggingTask] = useState(null);

  // Quick Reschedule & Focus Session & Daily Review
  const [isQuickRescheduleModalVisible, setQuickRescheduleModalVisible] = useState(false);
  const [rescheduleTargetItem, setRescheduleTargetItem] = useState(null);
  const [rescheduleTargetType, setRescheduleTargetType] = useState('task');

  const [isFocusSessionModalVisible, setFocusSessionModalVisible] = useState(false);
  const [focusSessionActivity, setFocusSessionActivity] = useState(null);

  const [isDailyReviewModalVisible, setDailyReviewModalVisible] = useState(false);

  const handleOpenNewEvent = (dateStr = null, timeStr = null, isBackup = false) => {
    setEditingEvent(null);
    setNewEventDefaultDate(dateStr);
    setNewEventDefaultTime(timeStr);
    setNewEventDefaultIsBackup(isBackup);
    setNewEventModalVisible(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setNewEventModalVisible(true);
  };

  const handleOpenNewGoal = () => {
    setEditingGoal(null);
    setNewGoalModalVisible(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setNewGoalModalVisible(true);
  };

  const handleCloseGoalModal = () => {
    setNewGoalModalVisible(false);
    setEditingGoal(null);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setCompleteModalVisible(true);
  };

  // Task Handlers
  const handleOpenQuickCapture = () => {
    setQuickCaptureModalVisible(true);
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setNewTaskModalVisible(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTaskModalVisible(true);
  };

  const handleScheduleTask = (task) => {
    setSchedulingTask(task);
    setScheduleTaskModalVisible(true);
  };

  const handleLogHours = (task) => {
    setLoggingTask(task);
    setLogHoursModalVisible(true);
  };

  const handleOpenReschedule = (item, itemType = 'task') => {
    setRescheduleTargetItem(item);
    setRescheduleTargetType(itemType);
    setQuickRescheduleModalVisible(true);
  };

  const handleStartFocusSession = (activity) => {
    setFocusSessionActivity(activity);
    setFocusSessionModalVisible(true);
  };

  const handleOpenDailyReview = () => {
    setDailyReviewModalVisible(true);
  };

  const handleFabPress = () => {
    if (activeTab === TABS.TASKS || activeTab === TABS.HOME) {
      handleOpenQuickCapture();
    } else if (activeTab === TABS.GOALS) {
      handleOpenNewGoal();
    } else {
      handleOpenNewEvent();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBg} />
      
      {/* Header */}
      <Header
        onSearchPress={() => setActiveTab(TABS.TASKS)}
        onProfilePress={() => setActiveTab(TABS.PROFILE)}
      />

      {/* Main Tab Screen Switcher */}
      <View style={styles.screenContainer}>
        {activeTab === TABS.HOME && (
          <HomeScreen
            onOpenNewEvent={() => handleOpenNewEvent()}
            onOpenNewTask={handleOpenQuickCapture}
            onOpenNewGoal={handleOpenNewGoal}
            onSelectEvent={handleSelectEvent}
            onSwitchToTab={(tab) => setActiveTab(tab)}
            onStartFocusSession={handleStartFocusSession}
            onOpenReschedule={handleOpenReschedule}
            onOpenDailyReview={handleOpenDailyReview}
          />
        )}

        {activeTab === TABS.CALENDAR && (
          <CalendarScreen
            onOpenNewEvent={(date, time, isBackup) => handleOpenNewEvent(date, time, isBackup)}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {activeTab === TABS.TASKS && (
          <TasksScreen
            onOpenNewTask={handleOpenNewTask}
            onOpenQuickCapture={handleOpenQuickCapture}
            onEditTask={handleEditTask}
            onScheduleTask={handleScheduleTask}
            onLogHours={handleLogHours}
            onOpenReschedule={handleOpenReschedule}
          />
        )}

        {activeTab === TABS.GOALS && (
          <GoalsScreen
            onOpenNewGoal={handleOpenNewGoal}
            onEditGoal={handleEditGoal}
            onOpenNewEvent={(date, time, isBackup) => handleOpenNewEvent(date, time, isBackup)}
          />
        )}

        {activeTab === TABS.PROFILE && <SettingsScreen />}
      </View>

      {/* Floating Action Button (+) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleFabPress}
        activeOpacity={0.85}
        accessibilityLabel="Añadir pendiente rápidamente"
        accessibilityRole="button"
      >
        <Feather name="plus" size={28} color="#0F1418" />
      </TouchableOpacity>

      {/* Navigation Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabPress={(tab) => setActiveTab(tab)} />

      {/* Quick Capture Modal (≤ 5 seconds rule) */}
      <QuickCaptureModal
        visible={isQuickCaptureModalVisible}
        onClose={() => setQuickCaptureModalVisible(false)}
        onOpenFullTaskModal={handleOpenNewTask}
      />

      {/* Quick Reschedule Modal */}
      <QuickRescheduleModal
        visible={isQuickRescheduleModalVisible}
        onClose={() => {
          setQuickRescheduleModalVisible(false);
          setRescheduleTargetItem(null);
        }}
        item={rescheduleTargetItem}
        itemType={rescheduleTargetType}
      />

      {/* Focus Session Modal */}
      <FocusSessionModal
        visible={isFocusSessionModalVisible}
        onClose={() => {
          setFocusSessionModalVisible(false);
          setFocusSessionActivity(null);
        }}
        activity={focusSessionActivity}
      />

      {/* Daily Review Modal */}
      <DailyReviewModal
        visible={isDailyReviewModalVisible}
        onClose={() => setDailyReviewModalVisible(false)}
      />

      {/* Full Modals */}
      <NewEventModal
        visible={isNewEventModalVisible}
        onClose={() => {
          setNewEventModalVisible(false);
          setEditingEvent(null);
        }}
        defaultDate={newEventDefaultDate}
        defaultTime={newEventDefaultTime}
        defaultIsBackup={newEventDefaultIsBackup}
        eventToEdit={editingEvent}
      />

      <NewGoalModal
        visible={isNewGoalModalVisible}
        goalToEdit={editingGoal}
        onClose={handleCloseGoalModal}
      />

      <NewTaskModal
        visible={isNewTaskModalVisible}
        taskToEdit={editingTask}
        onClose={() => {
          setNewTaskModalVisible(false);
          setEditingTask(null);
        }}
      />

      <ScheduleTaskModal
        visible={isScheduleTaskModalVisible}
        task={schedulingTask}
        onClose={() => {
          setScheduleTaskModalVisible(false);
          setSchedulingTask(null);
        }}
      />

      <LogHoursModal
        visible={isLogHoursModalVisible}
        task={loggingTask}
        onClose={() => {
          setLogHoursModalVisible(false);
          setLoggingTask(null);
        }}
      />

      <CompleteEventModal
        visible={isCompleteModalVisible}
        event={selectedEvent}
        onEditEvent={handleEditEvent}
        onRescheduleEvent={(ev) => handleOpenReschedule(ev, 'event')}
        onClose={() => {
          setCompleteModalVisible(false);
          setSelectedEvent(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <MainApp />
      </AppDataProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 99,
  },
});

