import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert as NativeAlert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { AlertItem } from '../types';
import { getAlertImageUrl } from '../services/api';

interface AlertsScreenProps {
  alerts: AlertItem[];
  onSelectAlert: (alert: AlertItem) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onDeleteAlert: (id: number) => Promise<void>;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  onSelectAlert,
  onRefresh,
  isRefreshing,
  onDeleteAlert,
}) => {
  const [filter, setFilter] = useState<'all' | 'with_image' | 'test'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'with_image') return !!a.image_url;
    if (filter === 'test') return a.trigger_type === 'manual_test';
    return true;
  });

  const handleDelete = (alert: AlertItem) => {
    NativeAlert.alert(
      'Eliminar Alerta',
      `¿Deseas eliminar la alerta #${alert.id} del ${alert.timestamp}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDeleteAlert(alert.id),
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Alertas de intrusión</Text>
          <Text style={styles.subTitle}>
            {alerts.length} eventos registrados • Registro en tiempo real
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              Todos ({alerts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'with_image' && styles.filterTabActive]}
            onPress={() => setFilter('with_image')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'with_image' && styles.filterTabTextActive,
              ]}
            >
              Con foto ({alerts.filter((a) => a.image_url).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'test' && styles.filterTabActive]}
            onPress={() => setFilter('test')}
          >
            <Text style={[styles.filterTabText, filter === 'test' && styles.filterTabTextActive]}>
              Pruebas ({alerts.filter((a) => a.trigger_type === 'manual_test').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shield-check-outline" size={48} color={Colors.outline} />
            <Text style={styles.emptyTitle}>Sin incidentes de intrusión</Text>
            <Text style={styles.emptyDesc}>
              No se han detectado eventos sospechosos en la franja actual. El sistema se encuentra en estado nominal.
            </Text>
          </View>
        ) : (
          filteredAlerts.map((item) => {
            const hasImage = !!item.image_url;
            const imageUrl = hasImage ? getAlertImageUrl(item.id) : null;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.alertCard}
                onPress={() => onSelectAlert(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardMain}>
                  {/* Thumbnail */}
                  <View style={styles.thumbnailWrapper}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <MaterialCommunityIcons name="image-off" size={24} color={Colors.outline} />
                      </View>
                    )}
                    <View style={styles.camBadge}>
                      <Text style={styles.camBadgeText}>CAM-01</Text>
                    </View>
                  </View>

                  {/* Info Column */}
                  <View style={styles.infoColumn}>
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.priorityPill,
                          item.trigger_type === 'change_detected'
                            ? styles.priorityCritical
                            : styles.priorityTest,
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityPillText,
                            item.trigger_type === 'change_detected'
                              ? styles.priorityCriticalText
                              : styles.priorityTestText,
                          ]}
                        >
                          {item.trigger_type === 'change_detected'
                            ? 'Intrusión'
                            : 'Prueba manual'}
                        </Text>
                      </View>
                      <Text style={styles.timestampText}>{item.timestamp.split(' ')[1] || item.timestamp}</Text>
                    </View>

                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {item.reason}
                    </Text>

                    <View style={styles.sensorRow}>
                      <Ionicons
                        name={hasImage ? 'camera' : 'notifications'}
                        size={13}
                        color={hasImage ? Colors.primary : Colors.outline}
                      />
                      <Text style={styles.sensorText}>
                        {hasImage ? 'Evidencia fotográfica lista' : 'Sin captura fotográfica'}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
                </View>

                {/* Subfooter */}
                <View style={styles.cardSubfooter}>
                  <Text style={styles.subfooterDate}>{item.timestamp.split(' ')[0]}</Text>
                  {item.email_sent && (
                    <View style={styles.emailBadge}>
                      <Ionicons name="mail-outline" size={12} color={Colors.secondaryActive} />
                      <Text style={styles.emailBadgeText}>Correo enviado</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deleteQuickBtn}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
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
  header: {
    marginBottom: Spacing.sm,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  subTitle: {
    fontSize: 12,
    color: Colors.outline,
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLow,
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: Spacing.md,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  filterTabActive: {
    backgroundColor: Colors.surfaceLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thumbnailWrapper: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLow,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(11, 28, 48, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  camBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  priorityCritical: {
    backgroundColor: '#fee2e2',
  },
  priorityTest: {
    backgroundColor: Colors.surfaceContainer,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityCriticalText: {
    color: Colors.tertiaryActive,
  },
  priorityTestText: {
    color: Colors.primary,
  },
  timestampText: {
    fontSize: 11,
    color: Colors.outline,
    fontFamily: 'monospace',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
    marginTop: 2,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sensorText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  cardSubfooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  subfooterDate: {
    fontSize: 11,
    color: Colors.outline,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  emailBadgeText: {
    fontSize: 10,
    color: Colors.secondaryActive,
    fontWeight: '600',
  },
  deleteQuickBtn: {
    padding: 4,
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
});
