import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import {
  getBaseUrl,
  setBaseUrl,
  fetchConfig,
  updateConfig,
  triggerManualTestAlert,
  fetchSystemStatus,
} from '../services/api';
import { wsClient } from '../services/websocket';
import { ConfigSettings } from '../types';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onConfigSaved,
}) => {
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [config, setConfig] = useState<ConfigSettings | null>(null);
  const [recipient, setRecipient] = useState('');
  const [cooldown, setCooldown] = useState('60');
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTriggeringTest, setIsTriggeringTest] = useState(false);
  const [wsConnected, setWsConnected] = useState(wsClient.isConnected);
  const [activeTab, setActiveTab] = useState<'config' | 'defense'>('config');

  useEffect(() => {
    if (visible) {
      setServerUrl(getBaseUrl());
      setWsConnected(wsClient.isConnected);
      loadConfig();
    }
  }, [visible]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
      setRecipient(cfg.alert_recipient);
      setCooldown(String(cfg.cooldown_seconds));
      setSmtpEnabled(cfg.smtp_enabled);
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setBaseUrl(serverUrl);
    try {
      const status = await fetchSystemStatus();
      wsClient.connect();
      setWsConnected(true);
      Alert.alert(
        'Conexión Exitosa',
        `Conectado al servidor FastAPI.\nModo: ${status.system_mode}\nESP32 IP: ${status.esp32_ip || 'No asignada aún'}`
      );
    } catch (err: any) {
      Alert.alert('Fallo de conexión', err.message || 'No se pudo conectar al servidor.');
      setWsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setBaseUrl(serverUrl);
    try {
      await updateConfig({
        alert_recipient: recipient.trim(),
        cooldown_seconds: parseInt(cooldown, 10) || 60,
        smtp_enabled: smtpEnabled,
      });
      Alert.alert('Éxito', 'Configuración guardada correctamente.');
      if (onConfigSaved) onConfigSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la configuración.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTest = async () => {
    setIsTriggeringTest(true);
    try {
      const res = await triggerManualTestAlert();
      Alert.alert(
        'Alerta de Prueba Despachada',
        `ID de alerta generado: #${res.alert_id}\nSe ha solicitado la captura al ESP32 y se notificará en la app.`
      );
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      Alert.alert('Error en prueba', err.message || 'Fallo al disparar alerta de prueba.');
    } finally {
      setIsTriggeringTest(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <MaterialCommunityIcons name="shield-account" size={24} color={Colors.primary} />
              <Text style={styles.headerTitle}>Configuración del Sistema</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.outline} />
            </TouchableOpacity>
          </View>

          {/* Subtabs: Config vs Defensa Técnica */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'config' && styles.tabBtnActive]}
              onPress={() => setActiveTab('config')}
            >
              <Text style={[styles.tabText, activeTab === 'config' && styles.tabTextActive]}>
                Ajustes & Red
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'defense' && styles.tabBtnActive]}
              onPress={() => setActiveTab('defense')}
            >
              <Text style={[styles.tabText, activeTab === 'defense' && styles.tabTextActive]}>
                Guía de Defensa Técnica 🎓
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'config' ? (
              <>
                {/* 1. Servidor Backend */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Servidor Backend (FastAPI)</Text>
                  <Text style={styles.sectionDesc}>
                    Dirección IP y puerto donde corre el gateway Python.
                  </Text>
                  <View style={styles.urlInputRow}>
                    <TextInput
                      style={styles.input}
                      value={serverUrl}
                      onChangeText={setServerUrl}
                      placeholder="http://10.162.220.76:8000"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.testBtn}
                      onPress={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.testBtnText}>Probar</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* WebSocket Status */}
                  <View style={styles.statusBox}>
                    <View style={styles.statusLeft}>
                      <View
                        style={[
                          styles.dot,
                          wsConnected ? styles.dotGreen : styles.dotRed,
                        ]}
                      />
                      <Text style={styles.statusBoxText}>
                        WebSocket Push: {wsConnected ? 'Conectado (/ws)' : 'Desconectado'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => wsClient.connect()}
                      style={styles.reconnectBtn}
                    >
                      <Text style={styles.reconnectBtnText}>Reconectar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Disparador de Prueba Rápida */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Demostración / Prueba de Alerta</Text>
                  <Text style={styles.sectionDesc}>
                    Dispara el flujo completo: foto del ESP32, guardado en SQLite, broadcast móvil y correo.
                  </Text>
                  <TouchableOpacity
                    style={[styles.testAlertBtn, isTriggeringTest && { opacity: 0.6 }]}
                    onPress={handleTriggerTest}
                    disabled={isTriggeringTest}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#ffffff" />
                    <Text style={styles.testAlertBtnText}>
                      {isTriggeringTest ? 'Disparando evento...' : 'Disparar Alerta Manual de Prueba'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Notificaciones de Correo SMTP */}
                <View style={styles.section}>
                  <View style={styles.switchHeader}>
                    <Text style={styles.sectionTitle}>Alertas por Correo SMTP</Text>
                    <Switch
                      value={smtpEnabled}
                      onValueChange={setSmtpEnabled}
                      trackColor={{ false: Colors.border, true: Colors.secondaryContainer }}
                      thumbColor={smtpEnabled ? Colors.secondaryActive : '#ffffff'}
                    />
                  </View>

                  <Text style={styles.label}>Destinatario de Alertas</Text>
                  <TextInput
                    style={styles.input}
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="propietario@gmail.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <Text style={[styles.label, { marginTop: 10 }]}>
                    Cooldown entre correos (Segundos)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={cooldown}
                    onChangeText={setCooldown}
                    placeholder="60"
                    keyboardType="numeric"
                  />
                  <Text style={styles.hintText}>
                    Evita spam si hay detecciones continuas de movimiento.
                  </Text>
                </View>

                {/* Save button */}
                <TouchableOpacity
                  style={[styles.saveBtn, isLoading && { opacity: 0.6 }]}
                  onPress={handleSaveConfig}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>Guardar Configuración</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Pestaña: Guía de Defensa Técnica */
              <View style={styles.defenseContainer}>
                <View style={styles.defenseCard}>
                  <Text style={styles.defenseQuestion}>
                    1. ¿Cómo se comunican el ESP32, el Backend y la App Móvil?
                  </Text>
                  <Text style={styles.defenseAnswer}>
                    • <Text style={styles.bold}>Descubrimiento UDP</Text>: El ESP32 emite UDP broadcast en puerto 4210 ("PYTHON_DISCOVER"). Python responde con su IP y puerto.{'\n'}
                    • <Text style={styles.bold}>Streaming MJPEG</Text>: El ESP32 corre un servidor TCP en puerto 81 (`/stream`), transmitiendo imágenes JPEG multipart continuas.{'\n'}
                    • <Text style={styles.bold}>Eventos HTTP</Text>: Al confirmar movimiento, el ESP32 envía `POST /event` al backend, que luego consulta `GET /capture` en el ESP32 para evidencia.{'\n'}
                    • <Text style={styles.bold}>WebSockets</Text>: La app móvil mantiene un socket `/ws` bidireccional no bloqueante para recibir alertas push instantáneas.
                  </Text>
                </View>

                <View style={styles.defenseCard}>
                  <Text style={styles.defenseQuestion}>
                    2. ¿Por qué el streaming MJPEG y el socket no bloquean el servidor?
                  </Text>
                  <Text style={styles.defenseAnswer}>
                    FastAPI utiliza el motor asíncrono ASGI (Starlette + Uvicorn) basado en <Text style={styles.bold}>asyncio</Text>. Las operaciones bloqueantes (como el envío de correos SMTP) se delegan a hilos en segundo plano (`asyncio.to_thread` o `BackgroundTasks`), permitiendo que el stream y las peticiones HTTP se atiendan con concurrencia total.
                  </Text>
                </View>

                <View style={styles.defenseCard}>
                  <Text style={styles.defenseQuestion}>
                    3. ¿Cómo resuelve el sistema el cruce de medianoche en franjas horarias?
                  </Text>
                  <Text style={styles.defenseAnswer}>
                    Si una franja va de 22:00 a 06:00 ({'start > end'}), la condición matemática se bifurca: se considera activa si la hora actual es <Text style={styles.bold}>≥ 22:00 O ≤ 06:00</Text>. Esto garantiza vigilancia ininterrumpida durante la noche.
                  </Text>
                </View>

                <View style={styles.defenseCard}>
                  <Text style={styles.defenseQuestion}>
                    4. ¿Cómo se evita la sobrecarga o spam en el servicio de correo?
                  </Text>
                  <Text style={styles.defenseAnswer}>
                    Se implementa un mecanismo de <Text style={styles.bold}>Cooldown</Text> (por defecto 60s). Si se detecta movimiento mientras el cooldown está activo, el incidente se guarda en SQLite y se alerta por WebSocket a la app, pero el correo SMTP se suprime temporalmente para no saturar la bandeja.
                  </Text>
                </View>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surfaceLowest,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceLow,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.surfaceLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.outline,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceLowest,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  sectionDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 8,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.onSurface,
  },
  testBtn: {
    paddingHorizontal: 14,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginTop: 10,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: Colors.secondaryActive,
  },
  dotRed: {
    backgroundColor: Colors.error,
  },
  statusBoxText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  reconnectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceContainer,
  },
  reconnectBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tertiaryActive,
    height: 46,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginTop: 6,
  },
  testAlertBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  switchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 4,
  },
  saveBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  defenseContainer: {
    gap: 12,
  },
  defenseCard: {
    backgroundColor: Colors.surfaceLowest,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  defenseQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  defenseAnswer: {
    fontSize: 12,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
  },
});
