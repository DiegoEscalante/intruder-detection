import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert as NativeAlert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { AlertItem } from '../types';
import { getAlertImageUrl, deleteAlert } from '../services/api';

interface AlertDetailModalProps {
  visible: boolean;
  alert: AlertItem | null;
  onClose: () => void;
  onDeleted?: (id: number) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  visible,
  alert,
  onClose,
  onDeleted,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!alert) return null;

  const imageUrl = alert.image_url ? getAlertImageUrl(alert.id) : null;

  const handleDelete = () => {
    NativeAlert.alert(
      'Eliminar Alerta',
      '¿Deseas eliminar este registro de intrusión y su evidencia fotográfica?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAlert(alert.id);
              if (onDeleted) onDeleted(alert.id);
              onClose();
            } catch (err: any) {
              NativeAlert.alert('Error', err.message || 'No se pudo eliminar la alerta.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle De Evento</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteTopBtn} disabled={isDeleting}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Badge & ID */}
          <View style={styles.topStatusRow}>
            <View
              style={[
                styles.statusPill,
                alert.trigger_type === 'person_detected'
                  ? styles.statusPillPerson
                  : alert.trigger_type === 'manual_test'
                  ? styles.statusPillTest
                  : styles.statusPillMotion,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  alert.trigger_type === 'person_detected'
                    ? 'account-alert'
                    : alert.trigger_type === 'manual_test'
                    ? 'test-tube'
                    : 'motion-sensor'
                }
                size={16}
                color={
                  alert.trigger_type === 'person_detected'
                    ? Colors.tertiaryActive
                    : alert.trigger_type === 'manual_test'
                    ? Colors.primary
                    : '#b45309'
                }
              />
              <Text
                style={[
                  styles.statusPillText,
                  alert.trigger_type === 'person_detected'
                    ? styles.statusPillTextPerson
                    : alert.trigger_type === 'manual_test'
                    ? styles.statusPillTextTest
                    : styles.statusPillTextMotion,
                ]}
              >
                {alert.trigger_type === 'person_detected'
                  ? '🚨 Persona detectada'
                  : alert.trigger_type === 'manual_test'
                  ? 'Prueba manual'
                  : 'Movimiento detectado'}
              </Text>
            </View>
            <Text style={styles.alertIdText}>#ESP-{alert.id}</Text>
          </View>

          {/* Heading */}
          <Text style={styles.mainTitle}>
            {alert.trigger_type === 'person_detected'
              ? 'Presencia Humana Confirmada'
              : alert.trigger_type === 'manual_test'
              ? 'Prueba de sistema'
              : 'Movimiento en zona vigilada'}
          </Text>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={16} color={Colors.outline} />
            <Text style={styles.dateText}>{alert.timestamp}</Text>
          </View>

          {/* Evidence Photo Card */}
          <View style={styles.evidenceContainer}>
            {imageUrl && !imageError ? (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.evidenceImage}
                  resizeMode="cover"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </View>
                )}
                {/* Overlay Top Badge */}
                <View style={styles.imageOverlayTop}>
                  <View style={styles.pingDot} />
                  <Text style={styles.imageOverlayTopText}>
                    {alert.trigger_type === 'person_detected'
                      ? 'OPENCV AI · PERSONA'
                      : 'CAPTURA ESP32-CAM'}
                  </Text>
                </View>
                {/* Overlay Bottom Caption */}
                <View style={styles.imageOverlayBottom}>
                  <Text style={styles.imageOverlayCaption}>
                    {alert.trigger_type === 'person_detected'
                      ? 'EVIDENCIA: SUJETO IDENTIFICADO'
                      : 'EVIDENCIA FOTOGRÁFICA'}
                  </Text>
                  <Text style={styles.imageOverlaySub}>
                    {alert.trigger_type === 'person_detected'
                      ? 'BOUNDING BOX TÁCTICO · HOG + CASCADES'
                      : 'QVGA · ALGORITMO DIFERENCIA CUADROS'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noImageWrapper}>
                <MaterialCommunityIcons name="image-off-outline" size={48} color={Colors.outline} />
                <Text style={styles.noImageText}>
                  {alert.image_url
                    ? 'No se pudo cargar la imagen desde el servidor'
                    : 'Sin evidencia fotográfica registrada'}
                </Text>
              </View>
            )}
          </View>

          {/* Telemetry Table */}
          <Text style={styles.sectionHeader}>Telemetría de la Detección</Text>
          <View style={styles.telemetryCard}>
            {/* Row 1: Hardware */}
            <View style={styles.telemetryRow}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="chip" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Dispositivo</Text>
                  <Text style={styles.rowValue}>ESP32-CAM (Sensor OV2640)</Text>
                </View>
              </View>
              <Text style={styles.badgePill}>IoT Node</Text>
            </View>

            <View style={styles.divider} />

            {/* Row 2: Sensor / Algorithm */}
            <View style={styles.telemetryRow}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name={
                      alert.trigger_type === 'person_detected'
                        ? 'account-search'
                        : 'motion-sensor'
                    }
                    size={18}
                    color={
                      alert.trigger_type === 'person_detected'
                        ? Colors.tertiaryActive
                        : Colors.primary
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Sensor / Algoritmo CV</Text>
                  <Text style={styles.rowValue}>
                    {alert.trigger_type === 'person_detected'
                      ? 'OpenCV HOG + Haar Cascades (Detección Humana)'
                      : alert.trigger_type === 'manual_test'
                      ? 'Disparo manual desde App'
                      : 'Diferencia visual de cuadros (Luminancia ESP32)'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Row 3: Mode / Reason */}
            <View style={styles.telemetryRow}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={18} color={Colors.secondaryActive} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Motivo de activación</Text>
                  <Text style={styles.rowValue}>{alert.reason}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Row 4: Email notification */}
            <View style={styles.telemetryRow}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name={alert.email_sent ? 'email-check-outline' : 'email-sync-outline'}
                    size={18}
                    color={alert.email_sent ? Colors.secondaryActive : Colors.outline}
                  />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Notificación por correo</Text>
                  <Text
                    style={[
                      styles.rowValue,
                      { color: alert.email_sent ? Colors.secondaryActive : Colors.outline },
                    ]}
                  >
                    {alert.email_sent ? 'Enviado con foto adjunta' : 'Cooldown o SMTP no requerido'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Details / Logs section */}
          {alert.details && (
            <View style={styles.detailsBox}>
              <Text style={styles.detailsLabel}>Observaciones registradas:</Text>
              <Text style={styles.detailsText}>{alert.details}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTopBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  content: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  statusPillPerson: {
    backgroundColor: '#fee2e2',
  },
  statusPillMotion: {
    backgroundColor: '#fef3c7',
  },
  statusPillTest: {
    backgroundColor: Colors.surfaceContainer,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPillTextPerson: {
    color: Colors.tertiaryActive,
  },
  statusPillTextMotion: {
    color: '#b45309',
  },
  statusPillTextTest: {
    color: Colors.primary,
  },
  alertIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.outline,
    fontFamily: 'monospace',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  dateText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  evidenceContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.inverseSurface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 28, 48, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  imageOverlayTopText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  imageOverlayBottom: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 8,
    borderRadius: BorderRadius.md,
  },
  imageOverlayCaption: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  imageOverlaySub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  noImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.surfaceLow,
  },
  noImageText: {
    color: Colors.outline,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  telemetryCard: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 11,
    color: Colors.outline,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
    marginTop: 1,
  },
  badgePill: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  detailsBox: {
    backgroundColor: Colors.surfaceContainer,
    padding: 12,
    borderRadius: BorderRadius.lg,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  detailsText: {
    fontSize: 13,
    color: Colors.onSurface,
  },
});
