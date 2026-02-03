
import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  console.log('User viewing home screen');
  const theme = useTheme();
  const router = useRouter();

  const handlePlayPong = () => {
    console.log('User tapped Play Pong button');
    router.push('/pong-menu');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Classic Pong
      </Text>
      <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
        Enhanced Retro Edition
      </Text>
      
      <TouchableOpacity 
        style={[styles.playButton, { borderColor: theme.colors.text }]}
        onPress={handlePlayPong}
      >
        <Text style={[styles.playButtonText, { color: theme.colors.text }]}>
          PLAY PONG
        </Text>
      </TouchableOpacity>

      <View style={styles.features}>
        <Text style={[styles.featureText, { color: theme.dark ? '#98989D' : '#666' }]}>
          • Single player & local multiplayer
        </Text>
        <Text style={[styles.featureText, { color: theme.dark ? '#98989D' : '#666' }]}>
          • AI difficulty settings (Easy/Medium/Hard)
        </Text>
        <Text style={[styles.featureText, { color: theme.dark ? '#98989D' : '#666' }]}>
          • Pause, reset, and resume controls
        </Text>
        <Text style={[styles.featureText, { color: theme.dark ? '#98989D' : '#666' }]}>
          • Optional retro visual effects
        </Text>
        <Text style={[styles.featureText, { color: theme.dark ? '#98989D' : '#666' }]}>
          • Smooth 60 FPS animation
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  playButton: {
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderWidth: 3,
    borderRadius: 0,
    marginBottom: 40,
  },
  playButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  features: {
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
  },
});
