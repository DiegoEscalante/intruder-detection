import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';

interface HeaderProps {
  espConnected: boolean;
  espIp: string | null;
  onOpenSettings: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  espConnected,
  espIp,
  onOpenSettings,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <Text style={styles.title}>Sentinel</Text>
        <View
          style={[
            styles.statusPill,
            espConnected ? styles.pillConnected : styles.pillDisconnected,
          ]}
        >
          <View
            style={[
              styles.dot,
              espConnected ? styles.dotConnected : styles.dotDisconnected,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              espConnected ? styles.textConnected : styles.textDisconnected,
            ]}
          >
            {espConnected ? 'Cámara conectada' : 'Cámara fuera de línea'}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={isRefreshing ? Colors.outline : Colors.onSurface}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={onOpenSettings}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    paddingHorizontal: Spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  pillConnected: {
    backgroundColor: '#dcfce7',
  },
  pillDisconnected: {
    backgroundColor: '#fee2e2',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotConnected: {
    backgroundColor: Colors.secondaryActive,
  },
  dotDisconnected: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textConnected: {
    color: Colors.onSecondaryContainer,
  },
  textDisconnected: {
    color: Colors.onErrorContainer,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
