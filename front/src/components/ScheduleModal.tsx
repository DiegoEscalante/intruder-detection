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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { Schedule, ScheduleCreate } from '../types';

interface ScheduleModalProps {
  visible: boolean;
  editingSchedule: Schedule | null;
  onClose: () => void;
  onSave: (data: ScheduleCreate, id?: number) => Promise<void>;
}

const DAY_LABELS = [
  { day: 0, label: 'L' },
  { day: 1, label: 'M' },
  { day: 2, label: 'X' },
  { day: 3, label: 'J' },
  { day: 4, label: 'V' },
  { day: 5, label: 'S' },
  { day: 6, label: 'D' },
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  editingSchedule,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri default
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('06:00');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingSchedule) {
      setName(editingSchedule.name);
      setSelectedDays(editingSchedule.days);
      setStartTime(editingSchedule.start_time);
      setEndTime(editingSchedule.end_time);
      setEnabled(editingSchedule.enabled);
    } else {
      setName('Vigilancia Nocturna');
      setSelectedDays([0, 1, 2, 3, 4]);
      setStartTime('22:00');
      setEndTime('06:00');
      setEnabled(true);
    }
  }, [editingSchedule, visible]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        Alert.alert('Atención', 'Debes seleccionar al menos un día.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const validateTime = (val: string): boolean => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un nombre para la franja.');
      return;
    }
    if (!validateTime(startTime) || !validateTime(endTime)) {
      Alert.alert('Formato de hora inválido', 'Utiliza el formato HH:MM de 24 horas (ej. 22:00, 06:00).');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          days: selectedDays,
          start_time: startTime,
          end_time: endTime,
          enabled,
        },
        editingSchedule ? editingSchedule.id : undefined
      );
      onClose();
    } catch (err: any) {
      Alert.alert('Error guardando', err.message || 'No se pudo guardar la franja.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <MaterialCommunityIcons name="alarm-check" size={22} color={Colors.primary} />
              <Text style={styles.headerTitle}>
                {editingSchedule ? 'Editar horario' : 'Configurar nuevo horario'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.outline} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de la franja</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Nocturno semanal, Fin de semana"
                placeholderTextColor={Colors.outline}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Days Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Días aplicables</Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map(({ day, label }) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayBtn,
                        isSelected ? styles.dayBtnSelected : styles.dayBtnUnselected,
                      ]}
                      onPress={() => toggleDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected ? styles.dayTextSelected : styles.dayTextUnselected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Ranges (Start & End) */}
            <View style={styles.timesRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Hora de Inicio (24h)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="22:00"
                  placeholderTextColor={Colors.outline}
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Hora de Fin (24h)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="06:00"
                  placeholderTextColor={Colors.outline}
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.midnightInfo}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.midnightText}>
                Soporta cruce de medianoche automáticamente (ej. 22:00 a 06:00).
              </Text>
            </View>

            {/* Enable Switch */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Habilitar inmediatamente</Text>
                <Text style={styles.switchSub}>El ESP32 responderá en esta franja</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: Colors.border, true: Colors.secondaryContainer }}
                thumbColor={enabled ? Colors.secondaryActive : '#ffffff'}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>
                  {editingSchedule ? 'Actualizar horario' : 'Guardar horario'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surfaceLowest,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
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
  content: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.onSurface,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnSelected: {
    backgroundColor: Colors.primary,
  },
  dayBtnUnselected: {
    backgroundColor: Colors.surfaceLow,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: Colors.onPrimary,
  },
  dayTextUnselected: {
    color: Colors.onSurfaceVariant,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLow,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  midnightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    padding: 10,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginBottom: Spacing.md,
  },
  midnightText: {
    fontSize: 11,
    color: Colors.primary,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    padding: 12,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  switchSub: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 2,
  },
  actionsRow: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  saveBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
});
