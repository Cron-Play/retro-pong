
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';

// Retro color palette
const COLORS = {
  background: '#0a0a0a',
  foreground: '#00ff00',
  accent: '#00cc00',
  dim: '#004400',
};

type GameMode = 'singlePlayer' | 'localMultiplayer';
type Difficulty = 'easy' | 'medium' | 'hard';

export default function PongMenuScreen() {
  console.log('User opened Pong menu');
  const router = useRouter();
  const theme = useTheme();

  const [gameMode, setGameMode] = useState<GameMode>('singlePlayer');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [scanlines, setScanlines] = useState(false);
  const [pixelatedFont, setPixelatedFont] = useState(false);
  const [ballTrail, setBallTrail] = useState(false);

  const handleStartGame = () => {
    console.log('User starting game with settings:', {
      gameMode,
      difficulty,
      scanlines,
      pixelatedFont,
      ballTrail,
    });

    router.push({
      pathname: '/pong',
      params: {
        gameMode,
        difficulty,
        scanlines: scanlines.toString(),
        pixelatedFont: pixelatedFont.toString(),
        ballTrail: ballTrail.toString(),
      },
    });
  };

  const gameModeText = gameMode === 'singlePlayer' ? 'Single Player' : 'Local Multiplayer';
  const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Pong Settings',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.foreground,
          headerTitleStyle: {
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>GAME MODE</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              gameMode === 'singlePlayer' && styles.optionButtonActive,
            ]}
            onPress={() => setGameMode('singlePlayer')}
          >
            <Text
              style={[
                styles.optionButtonText,
                gameMode === 'singlePlayer' && styles.optionButtonTextActive,
              ]}
            >
              SINGLE PLAYER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              gameMode === 'localMultiplayer' && styles.optionButtonActive,
            ]}
            onPress={() => setGameMode('localMultiplayer')}
          >
            <Text
              style={[
                styles.optionButtonText,
                gameMode === 'localMultiplayer' && styles.optionButtonTextActive,
              ]}
            >
              LOCAL MULTIPLAYER
            </Text>
          </TouchableOpacity>
        </View>

        {gameMode === 'singlePlayer' && (
          <>
            <Text style={styles.sectionTitle}>AI DIFFICULTY</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.optionButton, difficulty === 'easy' && styles.optionButtonActive]}
                onPress={() => setDifficulty('easy')}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    difficulty === 'easy' && styles.optionButtonTextActive,
                  ]}
                >
                  EASY
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, difficulty === 'medium' && styles.optionButtonActive]}
                onPress={() => setDifficulty('medium')}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    difficulty === 'medium' && styles.optionButtonTextActive,
                  ]}
                >
                  MEDIUM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, difficulty === 'hard' && styles.optionButtonActive]}
                onPress={() => setDifficulty('hard')}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    difficulty === 'hard' && styles.optionButtonTextActive,
                  ]}
                >
                  HARD
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>VISUAL ENHANCEMENTS</Text>
        <View style={styles.toggleContainer}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Scanline Effect</Text>
            <Switch
              value={scanlines}
              onValueChange={setScanlines}
              trackColor={{ false: COLORS.dim, true: COLORS.accent }}
              thumbColor={scanlines ? COLORS.foreground : '#888'}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Pixelated Font</Text>
            <Switch
              value={pixelatedFont}
              onValueChange={setPixelatedFont}
              trackColor={{ false: COLORS.dim, true: COLORS.accent }}
              thumbColor={pixelatedFont ? COLORS.foreground : '#888'}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Ball Trail Effect</Text>
            <Switch
              value={ballTrail}
              onValueChange={setBallTrail}
              trackColor={{ false: COLORS.dim, true: COLORS.accent }}
              thumbColor={ballTrail ? COLORS.foreground : '#888'}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
          <Text style={styles.startButtonText}>START GAME</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>CONTROLS</Text>
          {gameMode === 'singlePlayer' ? (
            <>
              <Text style={styles.infoText}>
                {Platform.OS === 'web' ? '↑ ↓ Arrow keys' : 'Swipe left side'} - Player 1
              </Text>
              <Text style={styles.infoText}>AI controls Player 2</Text>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                {Platform.OS === 'web' ? '↑ ↓ Arrow keys' : 'Swipe left side'} - Player 1
              </Text>
              <Text style={styles.infoText}>
                {Platform.OS === 'web' ? 'W S keys' : 'Swipe right side'} - Player 2
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  buttonGroup: {
    gap: 12,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: COLORS.dim,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: COLORS.foreground,
    backgroundColor: COLORS.dim,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dim,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  optionButtonTextActive: {
    color: COLORS.foreground,
  },
  toggleContainer: {
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.dim,
  },
  toggleLabel: {
    fontSize: 16,
    color: COLORS.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  startButton: {
    marginTop: 40,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderWidth: 3,
    borderColor: COLORS.foreground,
    backgroundColor: COLORS.dim,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 3,
  },
  infoBox: {
    marginTop: 32,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.dim,
    backgroundColor: 'rgba(0, 68, 0, 0.2)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
});
