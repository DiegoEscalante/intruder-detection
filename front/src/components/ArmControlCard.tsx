import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { SystemMode } from '../types';

interface ArmControlCardProps {
  currentMode: SystemMode;
  isSurveillanceActive: boolean;
  activeReason: string;
  onSelectMode: (mode: SystemMode) => void;
  isLoading?: boolean;
}

export const ArmControlCard: React.FC<ArmControlCardProps> = ({
  currentMode,
  isSurveillanceActive,
  activeReason,
  onSelectMode,
  isLoading,
}) => {
  const isArmed = isSurveillanceActive;

  return (
    <View style={styles.card}>
      {/* Top Main Status Row */}
      <View style={styles.mainRow}>
        <View style={styles.leftInfo}>
          <View
            style={[
              styles.iconWrapper,
              isArmed ? styles.iconArmed : styles.iconDisarmed,
            ]}
          >
            <MaterialCommunityIcons
              name={isArmed ? 'shield-check' : 'shield-off-outline'}
              size={24}
              color={isArmed ? Colors.secondaryActive : Colors.outline}
            />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.statusLabel}>ESTADO DEL SISTEMA</Text>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.statusTitle,
                  isArmed ? styles.titleArmed : styles.titleDisarmed,
                ]}
              >
                {isArmed ? 'SISTEMA ARMADO' : 'SISTEMA DESARMADO'}
              </Text>
              <View
                style={[
                  styles.statusPing,
                  isArmed ? styles.pingArmed : styles.pingDisarmed,
                ]}
              />
            </View>
            <Text style={styles.reasonText} numberOfLines={1}>
              {activeReason}
            </Text>
          </View>
        </View>

        {/* Quick Main Action Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            isArmed ? styles.btnDisarm : styles.btnArm,
          ]}
          onPress={() => onSelectMode(isArmed ? 'home' : 'away')}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isArmed ? Colors.error : Colors.onPrimary} />
          ) : (
            <>
              <MaterialCommunityIcons
                name={isArmed ? 'lock-open-variant-outline' : 'shield-account'}
                size={18}
                color={isArmed ? Colors.error : Colors.onPrimary}
              />
              <Text
                style={[
                  styles.btnText,
                  isArmed ? styles.btnTextDisarm : styles.btnTextArm,
                ]}
              >
                {isArmed ? 'Desarmar' : 'Armar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Mode Selector Tabs (Away, Home, Schedule) */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[
            styles.modeTab,
            currentMode === 'away' && styles.modeTabActive,
          ]}
          onPress={() => onSelectMode('away')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield"
            size={14}
            color={currentMode === 'away' ? Colors.primary : Colors.outline}
          />
          <Text
            style={[
              styles.modeTabText,
              currentMode === 'away' && styles.modeTabTextActive,
            ]}
          >
            Fuera de casa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeTab,
            currentMode === 'home' && styles.modeTabActive,
          ]}
          onPress={() => onSelectMode('home')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="home"
            size={14}
            color={currentMode === 'home' ? Colors.primary : Colors.outline}
          />
          <Text
            style={[
              styles.modeTabText,
              currentMode === 'home' && styles.modeTabTextActive,
            ]}
          >
            En casa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeTab,
            currentMode === 'schedule' && styles.modeTabActive,
          ]}
          onPress={() => onSelectMode('schedule')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar"
            size={14}
            color={currentMode === 'schedule' ? Colors.primary : Colors.outline}
          />
          <Text
            style={[
              styles.modeTabText,
              currentMode === 'schedule' && styles.modeTabTextActive,
            ]}
          >
            Por horario
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  leftInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconArmed: {
    backgroundColor: '#dcfce7',
  },
  iconDisarmed: {
    backgroundColor: Colors.surfaceLow,
  },
  textColumn: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  titleArmed: {
    color: Colors.secondaryActive,
  },
  titleDisarmed: {
    color: Colors.outline,
  },
  statusPing: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pingArmed: {
    backgroundColor: Colors.secondaryActive,
  },
  pingDisarmed: {
    backgroundColor: Colors.outline,
  },
  reasonText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  btnArm: {
    backgroundColor: Colors.secondaryActive,
  },
  btnDisarm: {
    backgroundColor: '#fee2e2',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnTextArm: {
    color: Colors.onSecondary,
  },
  btnTextDisarm: {
    color: Colors.error,
  },
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginTop: Spacing.md,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  modeTabActive: {
    backgroundColor: Colors.surfaceLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
  },
  modeTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
