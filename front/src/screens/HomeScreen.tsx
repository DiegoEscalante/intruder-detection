import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { StatusResponse, SystemMode, AlertItem } from '../types';
import { StreamPlayer } from '../components/StreamPlayer';
import { ArmControlCard } from '../components/ArmControlCard';

interface HomeScreenProps {
  status: StatusResponse | null;
  recentAlert: AlertItem | null;
  onSelectMode: (mode: SystemMode) => void;
  onViewAlert: (alert: AlertItem) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigateToSchedules: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  status,
  recentAlert,
  onSelectMode,
  onViewAlert,
  onRefresh,
  isRefreshing,
  onNavigateToSchedules,
}) => {
  const [modeLoading, setModeLoading] = useState(false);

  const handleModeChange = async (mode: SystemMode) => {
    setModeLoading(true);
    try {
      await onSelectMode(mode);
    } finally {
      setModeLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Arm/Disarm Control Card */}
      <ArmControlCard
        currentMode={status?.system_mode || 'away'}
        isSurveillanceActive={status?.is_surveillance_active ?? true}
        activeReason={status?.active_reason || "Modo 'Fuera de casa' activo"}
        onSelectMode={handleModeChange}
        isLoading={modeLoading}
      />

      {/* 2. Real-time Video Surveillance Feed (4:3) */}
      <StreamPlayer
        espConnected={status?.esp32_connected ?? false}
        espIp={status?.esp32_ip ?? null}
        directStreamUrl={status?.esp32_stream_url ?? null}
        onRefreshFeed={onRefresh}
      />

      {/* 3. Surveillance Schedule Telemetry Card */}
      <TouchableOpacity
        style={styles.scheduleStatusCard}
        onPress={onNavigateToSchedules}
        activeOpacity={0.8}
      >
        <View style={styles.scheduleLeft}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.primary} />
          <View>
            <Text style={styles.scheduleTitle}>
              {status?.system_mode === 'schedule'
                ? 'Vigilancia gobernada por horario'
                : 'Horarios de vigilancia disponibles'}
            </Text>
            <Text style={styles.scheduleSub}>Toca para configurar franjas automáticas</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
      </TouchableOpacity>

      {/* 4. Recent Intrusion Alert Banner */}
      {recentAlert && (
        <View style={styles.alertBanner}>
          <View style={styles.alertBannerLeft}>
            <View style={styles.alertIconBadge}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={Colors.onError} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertBannerTitle}>Intrusión confirmada</Text>
              <Text style={styles.alertBannerTime}>
                {recentAlert.timestamp} • {recentAlert.reason}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewAlertBtn}
            onPress={() => onViewAlert(recentAlert)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewAlertBtnText}>Ver alerta</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.onError} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  scheduleStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLowest,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  scheduleSub: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginBottom: Spacing.md,
    gap: 8,
  },
  alertBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  alertIconBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onErrorContainer,
  },
  alertBannerTime: {
    fontSize: 11,
    color: Colors.onErrorContainer,
    opacity: 0.85,
    marginTop: 1,
  },
  viewAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  viewAlertBtnText: {
    color: Colors.onError,
    fontSize: 11,
    fontWeight: '700',
  },
});
