import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius } from './src/theme/tokens';
import {
  StatusResponse,
  Schedule,
  ScheduleCreate,
  AlertItem,
  SystemMode,
} from './src/types';
import {
  fetchSystemStatus,
  updateSystemMode,
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  fetchAlerts,
  deleteAlert,
} from './src/services/api';
import { wsClient } from './src/services/websocket';

import { Header } from './src/components/Header';
import { HomeScreen } from './src/screens/HomeScreen';
import { SchedulesScreen } from './src/screens/SchedulesScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { AlertDetailModal } from './src/components/AlertDetailModal';
import { SettingsModal } from './src/components/SettingsModal';

type ActiveTab = 'inicio' | 'horarios' | 'alertas';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inicio');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // AppState monitoring for lifecycle awareness
  const appState = useRef(AppState.currentState);

  // Initial load & data synchronization
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, schedRes, alertsRes] = await Promise.allSettled([
        fetchSystemStatus(),
        fetchSchedules(),
        fetchAlerts(50, 0),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value);
      }
      if (schedRes.status === 'fulfilled') {
        setSchedules(schedRes.value);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value);
      }
    } catch (err) {
      console.warn('[Sentinel App] Sync error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Set up WebSocket & AppState lifecycle listener
  useEffect(() => {
    // 1. Initial sync
    refreshAllData();

    // 2. Connect WebSocket for instant alerts
    wsClient.connect();

    const unsubscribeWs = wsClient.addListener((event, data) => {
      if (event === 'alert') {
        // High priority intrusion alert received in real-time
        refreshAllData();
        Alert.alert(
          '🚨 INTRUSIÓN CONFIRMADA',
          `Se ha detectado movimiento sospechoso.\nMotivo: ${data.reason || 'Diferencia visual de cuadros'}\nHora: ${data.timestamp || 'Ahora'}`
        );
      } else if (event === 'mode_change') {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                system_mode: data.mode,
                is_surveillance_active: data.active,
                active_reason: data.reason,
              }
            : null
        );
      }
    });

    // 3. React Native AppState listener for Foreground/Background transitions
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Returned to foreground: Re-verify network & synchronize system state
        refreshAllData();
        if (!wsClient.isConnected) {
          wsClient.connect();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      unsubscribeWs();
      subscription.remove();
      wsClient.disconnect();
    };
  }, [refreshAllData]);

  // Mode change handler (Away / Home / Schedule)
  const handleSelectMode = async (mode: SystemMode) => {
    try {
      const res = await updateSystemMode(mode);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              system_mode: res.mode,
              is_surveillance_active: res.active,
              active_reason: res.reason,
            }
          : null
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo cambiar el modo de vigilancia.');
    }
  };

  // Schedule management handlers
  const handleToggleSchedule = async (id: number, enabled: boolean) => {
    try {
      await updateSchedule(id, { enabled });
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled } : s))
      );
      // Refresh status as schedule change may activate/deactivate surveillance
      const newStatus = await fetchSystemStatus();
      setStatus(newStatus);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la franja horaria.');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      const newStatus = await fetchSystemStatus();
      setStatus(newStatus);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo eliminar la franja.');
    }
  };

  const handleSaveSchedule = async (data: ScheduleCreate, id?: number) => {
    if (id) {
      const updated = await updateSchedule(id, data);
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } else {
      const created = await createSchedule(data);
      setSchedules((prev) => [created, ...prev]);
    }
    const newStatus = await fetchSystemStatus();
    setStatus(newStatus);
  };

  // Alert deletion handler
  const handleDeleteAlert = async (id: number) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (status) {
      setStatus({ ...status, total_alerts: Math.max(0, status.total_alerts - 1) });
    }
  };

  const recentAlert = alerts.length > 0 ? alerts[0] : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {/* Global App Header */}
        <Header
          espConnected={status?.esp32_connected ?? false}
          espIp={status?.esp32_ip ?? null}
          onOpenSettings={() => setSettingsVisible(true)}
          onRefresh={refreshAllData}
          isRefreshing={isRefreshing}
        />

        {/* Active Tab Screen */}
        <View style={styles.screenContainer}>
          {activeTab === 'inicio' && (
            <HomeScreen
              status={status}
              recentAlert={recentAlert}
              onSelectMode={handleSelectMode}
              onViewAlert={(alert) => setSelectedAlert(alert)}
              onRefresh={refreshAllData}
              isRefreshing={isRefreshing}
              onNavigateToSchedules={() => setActiveTab('horarios')}
            />
          )}

          {activeTab === 'horarios' && (
            <SchedulesScreen
              schedules={schedules}
              onRefresh={refreshAllData}
              isRefreshing={isRefreshing}
              onToggleSchedule={handleToggleSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onSaveSchedule={handleSaveSchedule}
            />
          )}

          {activeTab === 'alertas' && (
            <AlertsScreen
              alerts={alerts}
              onSelectAlert={(alert) => setSelectedAlert(alert)}
              onRefresh={refreshAllData}
              isRefreshing={isRefreshing}
              onDeleteAlert={handleDeleteAlert}
            />
          )}
        </View>

        {/* Fixed Bottom Navigation Bar (Tactical Minimalist from Stitch) */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('inicio')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'inicio' ? 'videocam' : 'videocam-outline'}
              size={24}
              color={activeTab === 'inicio' ? Colors.primary : Colors.outline}
            />
            <Text
              style={[
                styles.navLabel,
                activeTab === 'inicio' && styles.navLabelActive,
              ]}
            >
              Inicio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('horarios')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'horarios' ? 'calendar' : 'calendar-outline'}
              size={23}
              color={activeTab === 'horarios' ? Colors.primary : Colors.outline}
            />
            <Text
              style={[
                styles.navLabel,
                activeTab === 'horarios' && styles.navLabelActive,
              ]}
            >
              Horarios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('alertas')}
            activeOpacity={0.7}
          >
            <View style={styles.alertIconWrap}>
              <Ionicons
                name={activeTab === 'alertas' ? 'notifications' : 'notifications-outline'}
                size={23}
                color={activeTab === 'alertas' ? Colors.primary : Colors.outline}
              />
              {alerts.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {alerts.length > 99 ? '99+' : alerts.length}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                activeTab === 'alertas' && styles.navLabelActive,
              ]}
            >
              Alertas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Incident Evidence Detail Modal */}
        <AlertDetailModal
          visible={!!selectedAlert}
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onDeleted={handleDeleteAlert}
        />

        {/* System Settings & Defense Sheet Modal */}
        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          onConfigSaved={refreshAllData}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 4,
  },
  navItem: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Colors.tertiaryActive,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
    marginTop: 2,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
