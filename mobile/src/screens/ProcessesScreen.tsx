import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useConnection } from '../context/ConnectionContext';

interface Process {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
}

export default function ProcessesScreen() {
  const { isConnected, sendApiRequest } = useConnection();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isConnected) {
      loadProcesses();
    }
  }, [isConnected]);

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const data = await sendApiRequest('GET', '/processes');
      setProcesses(data.processes || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load processes');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = (proc: Process) => {
    Alert.alert(
      'Terminate Process',
      `Are you sure you want to terminate ${proc.name} (PID: ${proc.pid})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              await sendApiRequest('POST', `/processes/${proc.pid}/terminate`);
              loadProcesses();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to terminate process');
            }
          },
        },
      ]
    );
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const filteredProcesses = processes.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#9ca3af" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search processes..."
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X color="#9ca3af" size={20} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Process List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredProcesses}
          keyExtractor={(item) => item.pid.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={loadProcesses}
          refreshing={loading}
          renderItem={({ item }) => (
            <View style={styles.processItem}>
              <View style={styles.processInfo}>
                <Text style={styles.processName}>{item.name}</Text>
                <Text style={styles.processDetails}>
                  PID: {item.pid} • RAM: {formatMemory(item.memory_bytes)}
                </Text>
              </View>

              <View style={styles.processActions}>
                <View
                  style={[
                    styles.cpuBadge,
                    item.cpu_percent > 50 && styles.cpuBadgeHigh,
                  ]}
                >
                  <Text style={styles.cpuText}>
                    {item.cpu_percent.toFixed(0)}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.terminateButton}
                  onPress={() => handleTerminate(item)}
                >
                  <Text style={styles.terminateText}>End</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  processItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  processInfo: {
    flex: 1,
  },
  processName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  processDetails: {
    color: '#9ca3af',
    fontSize: 12,
  },
  processActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cpuBadge: {
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cpuBadgeHigh: {
    backgroundColor: '#7f1d1d',
  },
  cpuText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  terminateButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  terminateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
