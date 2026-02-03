
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  PanResponder,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;
const INITIAL_BALL_SPEED = 5;
const SPEED_INCREMENT = 0.3;
const WINNING_SCORE = 11;

// Retro color palette
const COLORS = {
  background: '#0a0a0a',
  foreground: '#00ff00',
  accent: '#00cc00',
  dim: '#004400',
};

// AI difficulty settings
const AI_SPEEDS = {
  easy: 2.5,
  medium: 4,
  hard: 6,
};

export default function PongScreen() {
  console.log('User opened Pong game');
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse params
  const gameMode = (params.gameMode as string) || 'singlePlayer';
  const difficulty = (params.difficulty as string) || 'medium';
  const scanlines = params.scanlines === 'true';
  const pixelatedFont = params.pixelatedFont === 'true';
  const ballTrail = params.ballTrail === 'true';

  const isMultiplayer = gameMode === 'localMultiplayer';
  const aiSpeed = AI_SPEEDS[difficulty as keyof typeof AI_SPEEDS] || AI_SPEEDS.medium;

  // Game state
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');

  // Ball position and velocity
  const ballX = useRef(SCREEN_WIDTH / 2);
  const ballY = useRef(SCREEN_HEIGHT / 2);
  const ballVelocityX = useRef(INITIAL_BALL_SPEED);
  const ballVelocityY = useRef(INITIAL_BALL_SPEED);
  const ballSpeed = useRef(INITIAL_BALL_SPEED);

  // Ball trail positions (for trail effect)
  const [trailPositions, setTrailPositions] = useState<Array<{ x: number; y: number }>>([]);

  // Paddle positions
  const paddle1Y = useRef(SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const paddle2Y = useRef(SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2);

  // Animated values for rendering
  const ballAnimX = useSharedValue(SCREEN_WIDTH / 2);
  const ballAnimY = useSharedValue(SCREEN_HEIGHT / 2);
  const paddle1AnimY = useSharedValue(SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const paddle2AnimY = useSharedValue(SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2);

  // Animation frame reference
  const animationFrameId = useRef<number | null>(null);

  // Touch tracking for mobile controls
  const touchY1 = useRef<number | null>(null);
  const touchY2 = useRef<number | null>(null);

  // Pan responder for Player 1 (left side)
  const panResponder1 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.pageX < SCREEN_WIDTH / 2,
      onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.pageX < SCREEN_WIDTH / 2,
      onPanResponderGrant: (evt) => {
        touchY1.current = evt.nativeEvent.pageY;
      },
      onPanResponderMove: (evt) => {
        touchY1.current = evt.nativeEvent.pageY;
        const newY = Math.max(
          0,
          Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, evt.nativeEvent.pageY - PADDLE_HEIGHT / 2)
        );
        paddle1Y.current = newY;
        paddle1AnimY.value = newY;
      },
      onPanResponderRelease: () => {
        touchY1.current = null;
      },
    })
  ).current;

  // Pan responder for Player 2 (right side, multiplayer only)
  const panResponder2 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.pageX >= SCREEN_WIDTH / 2,
      onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.pageX >= SCREEN_WIDTH / 2,
      onPanResponderGrant: (evt) => {
        touchY2.current = evt.nativeEvent.pageY;
      },
      onPanResponderMove: (evt) => {
        touchY2.current = evt.nativeEvent.pageY;
        const newY = Math.max(
          0,
          Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, evt.nativeEvent.pageY - PADDLE_HEIGHT / 2)
        );
        paddle2Y.current = newY;
        paddle2AnimY.value = newY;
      },
      onPanResponderRelease: () => {
        touchY2.current = null;
      },
    })
  ).current;

  // Keyboard controls for desktop
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        const moveSpeed = 20;
        
        // Player 1 controls (Arrow keys)
        if (e.key === 'ArrowUp') {
          paddle1Y.current = Math.max(0, paddle1Y.current - moveSpeed);
          paddle1AnimY.value = paddle1Y.current;
        } else if (e.key === 'ArrowDown') {
          paddle1Y.current = Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, paddle1Y.current + moveSpeed);
          paddle1AnimY.value = paddle1Y.current;
        }

        // Player 2 controls (W/S keys for multiplayer)
        if (isMultiplayer) {
          if (e.key === 'w' || e.key === 'W') {
            paddle2Y.current = Math.max(0, paddle2Y.current - moveSpeed);
            paddle2AnimY.value = paddle2Y.current;
          } else if (e.key === 's' || e.key === 'S') {
            paddle2Y.current = Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, paddle2Y.current + moveSpeed);
            paddle2AnimY.value = paddle2Y.current;
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMultiplayer]);

  // Reset ball and paddles to center
  const resetBall = (scoringPlayer: number) => {
    console.log('Ball and paddles reset after score by player', scoringPlayer);
    
    // Reset ball to center
    ballX.current = SCREEN_WIDTH / 2;
    ballY.current = SCREEN_HEIGHT / 2;
    ballAnimX.value = SCREEN_WIDTH / 2;
    ballAnimY.value = SCREEN_HEIGHT / 2;

    // Reset paddles to center
    paddle1Y.current = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle2Y.current = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle1AnimY.value = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle2AnimY.value = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;

    // Reset speed
    ballSpeed.current = INITIAL_BALL_SPEED;

    // Clear trail
    setTrailPositions([]);

    // Random direction
    const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
    const direction = scoringPlayer === 1 ? 1 : -1;
    ballVelocityX.current = Math.cos(angle) * ballSpeed.current * direction;
    ballVelocityY.current = Math.sin(angle) * ballSpeed.current;
  };

  // Start game
  const startGame = () => {
    console.log('User started Pong game');
    setGameStarted(true);
    setGamePaused(false);
    setGameOver(false);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setWinner('');
    resetBall(Math.random() > 0.5 ? 1 : 2);
  };

  // Pause/Resume game
  const togglePause = () => {
    console.log('User toggled pause:', !gamePaused);
    setGamePaused(!gamePaused);
  };

  // Reset game
  const resetGame = () => {
    console.log('User reset game');
    setGameStarted(false);
    setGamePaused(false);
    setGameOver(false);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setWinner('');
    setTrailPositions([]);
    
    // Reset positions
    ballX.current = SCREEN_WIDTH / 2;
    ballY.current = SCREEN_HEIGHT / 2;
    ballAnimX.value = SCREEN_WIDTH / 2;
    ballAnimY.value = SCREEN_HEIGHT / 2;
    paddle1Y.current = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle2Y.current = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle1AnimY.value = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    paddle2AnimY.value = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
  };

  // AI for paddle 2 (single player mode only)
  const updateAI = () => {
    if (isMultiplayer) return;

    const targetY = ballY.current - PADDLE_HEIGHT / 2;
    const diff = targetY - paddle2Y.current;

    if (Math.abs(diff) > aiSpeed) {
      paddle2Y.current += diff > 0 ? aiSpeed : -aiSpeed;
    } else {
      paddle2Y.current = targetY;
    }

    paddle2Y.current = Math.max(0, Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, paddle2Y.current));
    paddle2AnimY.value = paddle2Y.current;
  };

  // Game loop
  const gameLoop = () => {
    if (!gameStarted || gameOver || gamePaused) return;

    // Update AI (single player only)
    if (!isMultiplayer) {
      updateAI();
    }

    // Update ball position
    ballX.current += ballVelocityX.current;
    ballY.current += ballVelocityY.current;

    // Update trail effect
    if (ballTrail) {
      setTrailPositions((prev) => {
        const newTrail = [{ x: ballX.current, y: ballY.current }, ...prev];
        return newTrail.slice(0, 8); // Keep last 8 positions
      });
    }

    // Ball collision with top/bottom walls
    if (ballY.current <= 0 || ballY.current >= SCREEN_HEIGHT - BALL_SIZE) {
      ballVelocityY.current *= -1;
      ballY.current = Math.max(0, Math.min(SCREEN_HEIGHT - BALL_SIZE, ballY.current));
      console.log('Ball bounced off wall');
    }

    // Ball collision with paddles
    // Left paddle (Player 1)
    if (
      ballX.current <= PADDLE_WIDTH &&
      ballY.current + BALL_SIZE >= paddle1Y.current &&
      ballY.current <= paddle1Y.current + PADDLE_HEIGHT
    ) {
      ballVelocityX.current = Math.abs(ballVelocityX.current);

      // Change angle based on where ball hits paddle
      const hitPos = (ballY.current - paddle1Y.current) / PADDLE_HEIGHT;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      ballSpeed.current += SPEED_INCREMENT;
      ballVelocityX.current = Math.cos(angle) * ballSpeed.current;
      ballVelocityY.current = Math.sin(angle) * ballSpeed.current;

      console.log('Ball hit player 1 paddle, speed increased to', ballSpeed.current);
    }

    // Right paddle (Player 2 / AI)
    if (
      ballX.current >= SCREEN_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      ballY.current + BALL_SIZE >= paddle2Y.current &&
      ballY.current <= paddle2Y.current + PADDLE_HEIGHT
    ) {
      ballVelocityX.current = -Math.abs(ballVelocityX.current);

      // Change angle based on where ball hits paddle
      const hitPos = (ballY.current - paddle2Y.current) / PADDLE_HEIGHT;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      ballSpeed.current += SPEED_INCREMENT;
      ballVelocityX.current = -Math.cos(angle) * ballSpeed.current;
      ballVelocityY.current = Math.sin(angle) * ballSpeed.current;

      console.log('Ball hit player 2 paddle, speed increased to', ballSpeed.current);
    }

    // Scoring
    if (ballX.current <= 0) {
      console.log('Player 2 scored');
      const newScore = player2Score + 1;
      setPlayer2Score(newScore);
      if (newScore >= WINNING_SCORE) {
        setGameOver(true);
        const winnerName = isMultiplayer ? 'Player 2' : 'Player 2 (AI)';
        setWinner(winnerName);
        console.log(winnerName, 'wins the game');
      } else {
        resetBall(2);
      }
    } else if (ballX.current >= SCREEN_WIDTH - BALL_SIZE) {
      console.log('Player 1 scored');
      const newScore = player1Score + 1;
      setPlayer1Score(newScore);
      if (newScore >= WINNING_SCORE) {
        setGameOver(true);
        setWinner('Player 1');
        console.log('Player 1 wins the game');
      } else {
        resetBall(1);
      }
    }

    // Update animated values
    ballAnimX.value = ballX.current;
    ballAnimY.value = ballY.current;

    // Continue loop
    animationFrameId.current = requestAnimationFrame(gameLoop);
  };

  // Start/stop game loop
  useEffect(() => {
    if (gameStarted && !gameOver && !gamePaused) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameStarted, gameOver, gamePaused, player1Score, player2Score]);

  // Animated styles
  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ballAnimX.value }, { translateY: ballAnimY.value }],
  }));

  const paddle1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: paddle1AnimY.value }],
  }));

  const paddle2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: paddle2AnimY.value }],
  }));

  const player1ScoreText = player1Score.toString();
  const player2ScoreText = player2Score.toString();
  const pausedText = 'PAUSED';
  const gameModeText = isMultiplayer ? 'Local Multiplayer' : 'Single Player';
  const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const fontFamily = pixelatedFont
    ? Platform.OS === 'ios'
      ? 'Courier'
      : 'monospace'
    : Platform.OS === 'ios'
    ? 'Courier'
    : 'monospace';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Game area */}
      <View
        style={styles.gameArea}
        {...(isMultiplayer ? {} : panResponder1.panHandlers)}
      >
        {/* Scanline effect overlay */}
        {scanlines && <View style={styles.scanlines} pointerEvents="none" />}

        {/* Center line */}
        <View style={styles.centerLine} />

        {/* Score display */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { fontFamily }]}>{player1ScoreText}</Text>
          <Text style={[styles.scoreSeparator, { fontFamily }]}>-</Text>
          <Text style={[styles.scoreText, { fontFamily }]}>{player2ScoreText}</Text>
        </View>

        {/* Control buttons (during gameplay) */}
        {gameStarted && !gameOver && (
          <View style={styles.controlButtons}>
            <TouchableOpacity style={styles.controlButton} onPress={togglePause}>
              <Text style={[styles.controlButtonText, { fontFamily }]}>
                {gamePaused ? '▶' : '❚❚'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={resetGame}>
              <Text style={[styles.controlButtonText, { fontFamily }]}>↻</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Paddles */}
        <Animated.View style={[styles.paddle, styles.paddle1, paddle1Style]} />
        <Animated.View style={[styles.paddle, styles.paddle2, paddle2Style]} />

        {/* Ball trail effect */}
        {ballTrail &&
          gameStarted &&
          !gameOver &&
          !gamePaused &&
          trailPositions.map((pos, index) => {
            const opacity = 1 - index / trailPositions.length;
            const scale = 1 - index / trailPositions.length * 0.5;
            return (
              <View
                key={index}
                style={[
                  styles.ballTrail,
                  {
                    left: pos.x,
                    top: pos.y,
                    opacity: opacity * 0.6,
                    transform: [{ scale }],
                  },
                ]}
              />
            );
          })}

        {/* Ball */}
        {gameStarted && !gameOver && !gamePaused && (
          <Animated.View style={[styles.ball, ballStyle]} />
        )}

        {/* Touch areas for multiplayer */}
        {isMultiplayer && gameStarted && !gameOver && (
          <>
            <View style={styles.touchAreaLeft} {...panResponder1.panHandlers} />
            <View style={styles.touchAreaRight} {...panResponder2.panHandlers} />
          </>
        )}

        {/* Paused overlay */}
        {gamePaused && (
          <View style={styles.pausedOverlay}>
            <Text style={[styles.pausedText, { fontFamily }]}>{pausedText}</Text>
            <TouchableOpacity style={styles.button} onPress={togglePause}>
              <Text style={[styles.buttonText, { fontFamily }]}>RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={resetGame}>
              <Text style={[styles.buttonText, { fontFamily }]}>QUIT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Start screen */}
        {!gameStarted && (
          <View style={styles.overlay}>
            <Text style={[styles.title, { fontFamily }]}>PONG</Text>
            <Text style={[styles.subtitle, { fontFamily }]}>Classic Retro Edition</Text>
            <View style={styles.gameInfo}>
              <Text style={[styles.gameInfoText, { fontFamily }]}>{gameModeText}</Text>
              {!isMultiplayer && (
                <Text style={[styles.gameInfoText, { fontFamily }]}>
                  AI: {difficultyText}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.button} onPress={startGame}>
              <Text style={[styles.buttonText, { fontFamily }]}>START GAME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => router.back()}
            >
              <Text style={[styles.buttonText, { fontFamily }]}>SETTINGS</Text>
            </TouchableOpacity>
            <View style={styles.instructions}>
              {isMultiplayer ? (
                <>
                  <Text style={[styles.instructionText, { fontFamily }]}>
                    {Platform.OS === 'web' ? '↑ ↓ / W S keys' : 'Swipe left/right sides'}
                  </Text>
                  <Text style={[styles.instructionText, { fontFamily }]}>
                    First to {WINNING_SCORE} wins
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.instructionText, { fontFamily }]}>
                    {Platform.OS === 'web' ? 'Use ↑ ↓ arrow keys' : 'Swipe to move paddle'}
                  </Text>
                  <Text style={[styles.instructionText, { fontFamily }]}>
                    First to {WINNING_SCORE} wins
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Game over screen */}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={[styles.title, { fontFamily }]}>GAME OVER</Text>
            <Text style={[styles.winnerText, { fontFamily }]}>{winner} WINS!</Text>
            <View style={styles.finalScore}>
              <Text style={[styles.finalScoreText, { fontFamily }]}>{player1ScoreText}</Text>
              <Text style={[styles.finalScoreSeparator, { fontFamily }]}>-</Text>
              <Text style={[styles.finalScoreText, { fontFamily }]}>{player2ScoreText}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={startGame}>
              <Text style={[styles.buttonText, { fontFamily }]}>PLAY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => router.back()}
            >
              <Text style={[styles.buttonText, { fontFamily }]}>MENU</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  scanlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: Platform.OS === 'web'
      ? 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)'
      : undefined,
    zIndex: 1000,
  },
  centerLine: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 1,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.dim,
  },
  scoreContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  scoreSeparator: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.dim,
  },
  controlButtons: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: COLORS.foreground,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 18,
    color: COLORS.foreground,
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: COLORS.foreground,
  },
  paddle1: {
    left: 0,
  },
  paddle2: {
    right: 0,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: COLORS.foreground,
    borderRadius: BALL_SIZE / 2,
  },
  ballTrail: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: COLORS.foreground,
    borderRadius: BALL_SIZE / 2,
  },
  touchAreaLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH / 2,
    backgroundColor: 'transparent',
  },
  touchAreaRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH / 2,
    backgroundColor: 'transparent',
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    zIndex: 200,
  },
  pausedText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.foreground,
    letterSpacing: 8,
    marginBottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.foreground,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.accent,
    marginTop: -10,
  },
  gameInfo: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  gameInfoText: {
    fontSize: 16,
    color: COLORS.accent,
  },
  button: {
    marginTop: 10,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderWidth: 3,
    borderColor: COLORS.foreground,
    backgroundColor: 'transparent',
  },
  buttonSecondary: {
    borderColor: COLORS.dim,
    marginTop: 5,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.foreground,
    letterSpacing: 2,
  },
  instructions: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.accent,
  },
  winnerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.foreground,
    letterSpacing: 4,
  },
  finalScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginTop: 10,
  },
  finalScoreText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  finalScoreSeparator: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
});
