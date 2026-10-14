import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  PanResponder,
} from 'react-native';
import { MousePointer, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useConnection } from '../context/ConnectionContext';

export default function RemoteScreen() {
  const { isConnected, sendApiRequest } = useConnection();
  const lastX = useRef(0);
  const lastY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        lastX.current = evt.nativeEvent.locationX;
        lastY.current = evt.nativeEvent.locationY;
      },
      onPanResponderMove: (evt) => {
        const deltaX = (evt.nativeEvent.locationX - lastX.current) * 1.5;
        const deltaY = (evt.nativeEvent.locationY - lastY.current) * 1.5;

        lastX.current = evt.nativeEvent.locationX;
        lastY.current = evt.nativeEvent.locationY;

        if (isConnected) {
          sendApiRequest('POST', '/input/mouse/move', {
            x: Math.round(deltaX),
            y: Math.round(deltaY),
            relative: true,
          }).catch(() => {});
        }
      },
    })
  ).current;

  const handleClick = (button: 'left' | 'right') => {
    if (isConnected) {
      sendApiRequest('POST', '/input/mouse/click', {
        button,
        action: 'click',
      }).catch(() => {});
    }
  };

  const handleScroll = (delta: number) => {
    if (isConnected) {
      sendApiRequest('POST', '/input/mouse/scroll', {
        delta,
        horizontal: false,
      }).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Touchpad</Text>
        <Text style={styles.subtitle}>Drag to move cursor, tap for buttons</Text>
      </View>

      {/* Touch Area */}
      <View style={styles.touchAreaContainer}>
        <View style={styles.touchArea} {...panResponder.panHandlers}>
          <MousePointer color="#6b7280" size={48} />
          <Text style={styles.touchHint}>Touchpad Area</Text>
        </View>

        {/* Scroll Bar */}
        <View style={styles.scrollContainer}>
          <TouchableOpacity
            style={styles.scrollButton}
            onPress={() => handleScroll(-120)}
          >
            <ChevronUp color="#fff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scrollButton}
            onPress={() => handleScroll(120)}
          >
            <ChevronDown color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mouse Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.mouseButton, styles.leftButton]}
          onPress={() => handleClick('left')}
        >
          <Text style={styles.buttonText}>Left Click</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mouseButton, styles.rightButton]}
          onPress={() => handleClick('right')}
        >
          <Text style={styles.buttonText}>Right Click</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  touchAreaContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  touchArea: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchHint: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 12,
  },
  scrollContainer: {
    width: 60,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2d2d2d',
    justifyContent: 'space-between',
    padding: 8,
  },
  scrollButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    height: 100,
  },
  mouseButton: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftButton: {
    borderRightWidth: 1,
    borderColor: '#1e1e1e',
  },
  rightButton: {
    borderLeftWidth: 1,
    borderColor: '#1e1e1e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
