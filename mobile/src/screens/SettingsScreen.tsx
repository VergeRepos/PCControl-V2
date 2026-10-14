import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Info, Shield, Wifi } from 'lucide-react-native';
import { useConnection } from '../context/ConnectionContext';

export default function SettingsScreen() {
  const { isConnected, pcInfo, disconnect } = useConnection();

  const handleUnpair = () => {
    Alert.alert(
      'Unpair Device',
      'Are you sure you want to unpair this device? You will need to pair again to control your PC.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            disconnect();
            await AsyncStorage.clear();
            // App will re-render to pairing screen
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Connection Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Wifi color="#3b82f6" size={20} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Status</Text>
                <Text style={styles.rowValue}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>

            {pcInfo && (
              <View style={[styles.row, styles.rowBorder]}>
                <Info color="#9ca3af" size={20} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>PC IP Address</Text>
                  <Text style={styles.rowValue}>{pcInfo.ip}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Shield color="#22c55e" size={20} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Encryption</Text>
                <Text style={styles.rowValue}>TLS 1.3 Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Unpair Button */}
        <TouchableOpacity style={styles.unpairButton} onPress={handleUnpair}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.unpairText}>Unpair Device</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>PC Control Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  rowValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  unpairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
    marginTop: 12,
  },
  unpairText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    marginTop: 32,
  },
});
