import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  Cpu,
  Activity,
  HardDrive,
  Network,
  Power,
  RotateCcw,
  Moon,
  Lock,
} from 'lucide-react-native';
import { useConnection } from '../context/ConnectionContext';

export default function DashboardScreen() {
  const { isConnected, stats, pcInfo, sendApiRequest } = useConnection();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handlePowerAction = (action: string, title: string) => {
    Alert.alert(
      `Confirm ${title}`,
      `Are you sure you want to ${action.toLowerCase()} your PC?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: title,
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(action);
            try {
              await sendApiRequest('POST', `/power/${action}`);
              Alert.alert('Success', `${title} command sent`);
            } catch (error: any) {
              Alert.alert('Error', error.message || `Failed to ${action}`);
            } finally {
              setLoadingAction(null);
            }
          },
        },
      ]
    );
  };

  const formatNetworkSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec) return '0 KB/s';
    const mbps = (bytesPerSec * 8) / (1024 * 1024);
    return `${mbps.toFixed(1)} Mbps`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{pcInfo?.hostname || 'Desktop PC'}</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? '#22c55e' : '#ef4444' },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          {/* CPU */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Cpu color="#3b82f6" size={24} />
              <Text style={styles.cardTitle}>CPU</Text>
            </View>
            <Text style={styles.statValue}>
              {stats?.cpu?.usage_percent?.toFixed(0) || '0'}%
            </Text>
            {stats?.cpu?.temperature && (
              <Text style={styles.statSubtext}>
                {stats.cpu.temperature.toFixed(0)}°C
              </Text>
            )}
          </View>

          {/* GPU */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Activity color="#22c55e" size={24} />
              <Text style={styles.cardTitle}>GPU</Text>
            </View>
            <Text style={styles.statValue}>
              {stats?.gpu?.usage_percent?.toFixed(0) || '0'}%
            </Text>
            {stats?.gpu?.temperature && (
              <Text style={styles.statSubtext}>
                {stats.gpu.temperature.toFixed(0)}°C
              </Text>
            )}
          </View>

          {/* RAM */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <HardDrive color="#a855f7" size={24} />
              <Text style={styles.cardTitle}>RAM</Text>
            </View>
            <Text style={styles.statValue}>
              {stats?.memory?.usage_percent?.toFixed(0) || '0'}%
            </Text>
          </View>

          {/* Network */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Network color="#f97316" size={24} />
              <Text style={styles.cardTitle}>Network</Text>
            </View>
            <Text style={styles.statValueSmall}>
              ↓ {formatNetworkSpeed(stats?.network?.download_bytes_per_sec)}
            </Text>
            <Text style={styles.statSubtext}>
              ↑ {formatNetworkSpeed(stats?.network?.upload_bytes_per_sec)}
            </Text>
          </View>
        </View>

        {/* Quick Power Controls */}
        <Text style={styles.sectionTitle}>Power Controls</Text>
        <View style={styles.powerGrid}>
          <TouchableOpacity
            style={[styles.powerButton, styles.lockButton]}
            onPress={() => handlePowerAction('lock', 'Lock')}
            disabled={!isConnected || !!loadingAction}
          >
            <Lock color="#fff" size={24} />
            <Text style={styles.powerButtonText}>Lock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.powerButton, styles.sleepButton]}
            onPress={() => handlePowerAction('sleep', 'Sleep')}
            disabled={!isConnected || !!loadingAction}
          >
            <Moon color="#fff" size={24} />
            <Text style={styles.powerButtonText}>Sleep</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.powerButton, styles.restartButton]}
            onPress={() => handlePowerAction('restart', 'Restart')}
            disabled={!isConnected || !!loadingAction}
          >
            <RotateCcw color="#fff" size={24} />
            <Text style={styles.powerButtonText}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.powerButton, styles.shutdownButton]}
            onPress={() => handlePowerAction('shutdown', 'Shut Down')}
            disabled={!isConnected || !!loadingAction}
          >
            <Power color="#fff" size={24} />
            <Text style={styles.powerButtonText}>Shut Down</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  powerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  powerButton: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockButton: {
    backgroundColor: '#3b82f6',
  },
  sleepButton: {
    backgroundColor: '#8b5cf6',
  },
  restartButton: {
    backgroundColor: '#f59e0b',
  },
  shutdownButton: {
    backgroundColor: '#ef4444',
  },
  powerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
