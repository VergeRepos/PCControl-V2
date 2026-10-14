import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Key, Smartphone } from 'lucide-react-native';

interface PairingScreenProps {
  onPaired: () => void;
}

export default function PairingScreen({ onPaired }: PairingScreenProps) {
  const [pcIp, setPcIp] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePair = async () => {
    if (!pcIp.trim() || !pairingCode.trim()) {
      Alert.alert('Error', 'Please enter both IP address and pairing code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://${pcIp.trim()}:8421/api/pairing/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: pairingCode.trim(),
          device_name: 'Mobile Phone',
          device_type: 'mobile',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Pairing failed');
      }

      const credentials = await response.json();

      // Save credentials
      await AsyncStorage.setItem('device_credentials', JSON.stringify(credentials));
      await AsyncStorage.setItem('pc_ip', pcIp.trim());

      Alert.alert('Success', 'Device paired successfully!', [
        { text: 'OK', onPress: onPaired },
      ]);
    } catch (error: any) {
      Alert.alert('Pairing Failed', error.message || 'Could not connect to PC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Smartphone color="#3b82f6" size={48} />
          <Text style={styles.title}>Pair with PC</Text>
          <Text style={styles.subtitle}>
            Enter your PC's IP address and the pairing code displayed on the desktop app
          </Text>
        </View>

        {/* Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PC IP Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor="#6b7280"
              value={pcIp}
              onChangeText={setPcIp}
              autoCapitalize="none"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>6-Digit Pairing Code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="123456"
              placeholderTextColor="#6b7280"
              value={pairingCode}
              onChangeText={setPairingCode}
              maxLength={6}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.pairButton, loading && styles.pairButtonDisabled]}
            onPress={handlePair}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Key color="#fff" size={20} />
                <Text style={styles.pairButtonText}>Pair Device</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Help */}
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>How to get a pairing code:</Text>
          <Text style={styles.helpText}>1. Open PC Control on your computer</Text>
          <Text style={styles.helpText}>2. Go to Security → Device Pairing</Text>
          <Text style={styles.helpText}>3. Click "Generate Pairing Code"</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  pairButtonDisabled: {
    opacity: 0.6,
  },
  pairButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  helpTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
  },
});
