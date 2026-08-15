import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme';
import { ThemedButton } from './Button';
import { ThemedTextBox } from './TextBox';

interface ThemedDateTimePickerProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  onChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function ThemedDateTimePicker({
  value,
  mode = 'datetime',
  onChange,
  label,
  minimumDate,
  maximumDate,
}: ThemedDateTimePickerProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const [currentMode, setCurrentMode] = useState<'date' | 'time'>('date');

  const formatDateTime = (date: Date) => {
    if (mode === 'date') {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } else if (mode === 'time') {
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        // For datetime mode on Android, show time picker after date is selected
        if (mode === 'datetime' && currentMode === 'date') {
          setTempDate(selectedDate);
          setCurrentMode('time');
          // Keep picker open to show time picker next
        } else {
          // For single mode or after time is selected in datetime mode
          setShowPicker(false);
          setCurrentMode('date'); // Reset for next time
          onChange(selectedDate);
        }
      } else {
        // User cancelled
        setShowPicker(false);
        setCurrentMode('date'); // Reset for next time
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowPicker(false);
  };

  if (Platform.OS === 'android') {
    return (
      <View style={styles.container}>
        {label && (
          <ThemedTextBox
            variant="subheading"
            weight="semibold"
            color="primary"
            style={styles.label}
          >
            {label}
          </ThemedTextBox>
        )}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.backgroundTertiary, borderColor: colors.border },
          ]}
          onPress={() => {
            setCurrentMode('date');
            setShowPicker(true);
          }}
          activeOpacity={0.7}
        >
          <ThemedTextBox variant="body" color="primary">
            {formatDateTime(value)}
          </ThemedTextBox>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={currentMode === 'date' ? value : tempDate}
            mode={mode === 'datetime' ? currentMode : mode}
            display="default"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && (
        <ThemedTextBox variant="subheading" weight="semibold" color="primary" style={styles.label}>
          {label}
        </ThemedTextBox>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.backgroundTertiary, borderColor: colors.border },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <ThemedTextBox variant="body" color="primary">
          {formatDateTime(value)}
        </ThemedTextBox>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={handleCancel}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedTextBox variant="subheading" weight="semibold" color="primary">
                {label || 'Select Date & Time'}
              </ThemedTextBox>
            </View>

            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode={mode}
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                textColor={colors.text}
              />
            </View>

            <View style={styles.modalActions}>
              <ThemedButton
                title="Cancel"
                variant="secondary"
                onPress={handleCancel}
                style={styles.actionButton}
              />
              <ThemedButton
                title="Confirm"
                variant="primary"
                onPress={handleConfirm}
                style={styles.actionButton}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  pickerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 0,
  },
  actionButton: {
    flex: 1,
  },
});
