import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Activity, LayoutDashboard, MonitorPlay, Settings, Key } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from './screens/DashboardScreen';
import ProcessesScreen from './screens/ProcessesScreen';
import RemoteScreen from './screens/RemoteScreen';
import SettingsScreen from './screens/SettingsScreen';
import PairingScreen from './screens/PairingScreen';
import { ConnectionProvider } from './context/ConnectionContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e1e1e',
          borderTopColor: '#2d2d2d',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Processes"
        component={ProcessesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Remote"
        component={RemoteScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MonitorPlay color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isPaired, setIsPaired] = useState<boolean | null>(null);

  useEffect(() => {
    checkPairingStatus();
  }, []);

  const checkPairingStatus = async () => {
    try {
      const credentials = await AsyncStorage.getItem('device_credentials');
      setIsPaired(!!credentials);
    } catch (error) {
      console.error('Failed to check pairing status:', error);
      setIsPaired(false);
    }
  };

  if (isPaired === null) {
    return null; // Or loading splash screen
  }

  return (
    <ConnectionProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isPaired ? (
            <Stack.Screen name="Pairing">
              {(props) => <PairingScreen {...props} onPaired={() => setIsPaired(true)} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ConnectionProvider>
  );
}
