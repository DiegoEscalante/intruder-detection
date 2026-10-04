import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { Schedule, ScheduleCreate } from '../types';
import { ScheduleModal } from '../components/ScheduleModal';

interface SchedulesScreenProps {
  schedules: Schedule[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onToggleSchedule: (id: number, enabled: boolean) => Promise<void>;
  onDeleteSchedule: (id: number) => Promise<void>;
  onSaveSchedule: (data: ScheduleCreate, id?: number) => Promise<void>;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatDays(days: number[]): string {
  if (days.length === 7) return 'Todos los días';
  if (days.length === 5 && days.every((d) => [0, 1, 2, 3, 4].includes(d))) {
    return 'Lunes — Viernes';
  }
  if (days.length === 2 && days.every((d) => [5, 6].includes(d))) {
    return 'Sábado — Domingo';
  }
  return days.map((d) => DAY_NAMES[d] || '').join(', ');
}

export const SchedulesScreen: React.FC<SchedulesScreenProps> = ({
  schedules,
  onRefresh,
  isRefreshing,
  onToggleSchedule,
  onDeleteSchedule,
  onSaveSchedule,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (sched: Schedule) => {
    setEditingSchedule(sched);
    setModalVisible(true);
  };

  const handleDeletePrompt = (sched: Schedule) => {
    Alert.alert(
      'Eliminar Franja',
      `¿Deseas eliminar la franja "${sched.name}" (${sched.start_time} - ${sched.end_time})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDeleteSchedule(sched.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.tagRow}>
            <MaterialCommunityIcons name="alarm-check" size={18} color={Colors.primary} />
            <Text style={styles.tagText}>AUTOMATIZACIÓN</Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.mainTitle}>Horarios de vigilancia</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={Colors.onPrimary} />
              <Text style={styles.addBtnText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.descText}>
            El microcontrolador activará la vigilancia de forma autónoma durante las franjas habilitadas.
          </Text>
        </View>

        {/* Schedules List */}
        {schedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-clock" size={48} color={Colors.outline} />
            <Text style={styles.emptyTitle}>Sin horarios configurados</Text>
            <Text style={styles.emptyDesc}>
              Crea una franja horaria para que el sistema vigile automáticamente tu espacio mientras duermes o trabajas.
            </Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={handleOpenAdd}>
              <Text style={styles.createFirstBtnText}>Crear primer horario</Text>
            </TouchableOpacity>
          </View>
        ) : (
          schedules.map((item) => (
            <View
              key={item.id}
              style={[styles.scheduleCard, !item.enabled && styles.cardDisabled]}
            >
              {/* Card Top Row */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleColumn}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.nameBadge}>{item.name}</Text>
                    <View style={styles.activeStatusPill}>
                      <View
                        style={[
                          styles.dot,
                          item.enabled ? styles.dotActive : styles.dotInactive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.activeStatusText,
                          item.enabled ? styles.textActive : styles.textInactive,
                        ]}
                      >
                        {item.enabled ? 'Activado' : 'En pausa'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.timeRangeText}>
                    {item.start_time}{' '}
                    <Text style={styles.timeDash}>—</Text>{' '}
                    {item.end_time}
                  </Text>
                </View>

                {/* Switch Toggle */}
                <Switch
                  value={item.enabled}
                  onValueChange={(val) => onToggleSchedule(item.id, val)}
                  trackColor={{ false: Colors.border, true: Colors.secondaryContainer }}
                  thumbColor={item.enabled ? Colors.secondaryActive : '#ffffff'}
                />
              </View>

              {/* Card Bottom Bar */}
              <View style={styles.cardBottomBar}>
                <View style={styles.daysRow}>
                  <Ionicons name="calendar-outline" size={15} color={Colors.outline} />
                  <Text style={styles.daysText}>{formatDays(item.days)}</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => handleOpenEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={16} color={Colors.outline} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconActionBtn, styles.deleteBtn]}
                    onPress={() => handleDeletePrompt(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Schedule Edit/Add Modal */}
      <ScheduleModal
        visible={modalVisible}
        editingSchedule={editingSchedule}
        onClose={() => setModalVisible(false)}
        onSave={onSaveSchedule}
      />
    </View>
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
  headerSection: {
    marginBottom: Spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  addBtnText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  descText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  scheduleCard: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.75,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleColumn: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nameBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.secondaryActive,
  },
  dotInactive: {
    backgroundColor: Colors.outline,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textActive: {
    color: Colors.secondaryActive,
  },
  textInactive: {
    color: Colors.outline,
  },
  timeRangeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.onSurface,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  timeDash: {
    color: Colors.outline,
    fontWeight: '400',
  },
  cardBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    marginHorizontal: -Spacing.md,
    marginBottom: -Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLowest,
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.surfaceLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  createFirstBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 16,
  },
  createFirstBtnText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
