
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
import { Stack } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
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

export default function PongScreen() {
  console.log('User opened Pong game');

  // Game state
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');

  // Ball position and velocity
  const ballX = useRef(SCREEN_WIDTH / 2);
  const ballY = useRef(SCREEN_HEIGHT / 2);
  const ballVelocityX = useRef(INITIAL_BALL_SPEED);
  const ballVelocityY = useRef(INITIAL_BALL_SPEED);
  const ballSpeed = useRef(INITIAL_BALL_SPEED);

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
  const touchY = useRef<number | null>(null);

  // Pan responder for mobile paddle control
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        touchY.current = evt.nativeEvent.pageY;
      },
      onPanResponderMove: (evt) => {
        touchY.current = evt.nativeEvent.pageY;
        const newY = Math.max(
          0,
          Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, evt.nativeEvent.pageY - PADDLE_HEIGHT / 2)
        );
        paddle1Y.current = newY;
        paddle1AnimY.value = newY;
      },
      onPanResponderRelease: () => {
        touchY.current = null;
      },
    })
  ).current;

  // Keyboard controls for desktop
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        const moveSpeed = 20;
        if (e.key === 'ArrowUp') {
          paddle1Y.current = Math.max(0, paddle1Y.current - moveSpeed);
          paddle1AnimY.value = paddle1Y.current;
        } else if (e.key === 'ArrowDown') {
          paddle1Y.current = Math.min(SCREEN_HEIGHT - PADDLE_HEIGHT, paddle1Y.current + moveSpeed);
          paddle1AnimY.value = paddle1Y.current;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // Reset ball to center
  const resetBall = (scoringPlayer: number) => {
    console.log('Ball reset after score by player', scoringPlayer);
    ballX.current = SCREEN_WIDTH / 2;
    ballY.current = SCREEN_HEIGHT / 2;
    ballAnimX.value = SCREEN_WIDTH / 2;
    ballAnimY.value = SCREEN_HEIGHT / 2;

    // Reset speed
    ballSpeed.current = INITIAL_BALL_SPEED;

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
    setGameOver(false);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setWinner('');
    resetBall(Math.random() > 0.5 ? 1 : 2);
  };

  // AI for paddle 2
  const updateAI = () => {
    const targetY = ballY.current - PADDLE_HEIGHT / 2;
    const diff = targetY - paddle2Y.current;
    const aiSpeed = 4;

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
    if (!gameStarted || gameOver) return;

    // Update AI
    updateAI();

    // Update ball position
    ballX.current += ballVelocityX.current;
    ballY.current += ballVelocityY.current;

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

    // Right paddle (AI/Player 2)
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
        setWinner('Player 2 (AI)');
        console.log('Player 2 wins the game');
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
    if (gameStarted && !gameOver) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameStarted, gameOver, player1Score, player2Score]);

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Game area */}
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        {/* Center line */}
        <View style={styles.centerLine} />

        {/* Score display */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{player1ScoreText}</Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={styles.scoreText}>{player2ScoreText}</Text>
        </View>

        {/* Paddles */}
        <Animated.View style={[styles.paddle, styles.paddle1, paddle1Style]} />
        <Animated.View style={[styles.paddle, styles.paddle2, paddle2Style]} />

        {/* Ball */}
        {gameStarted && !gameOver && <Animated.View style={[styles.ball, ballStyle]} />}

        {/* Start screen */}
        {!gameStarted && (
          <View style={styles.overlay}>
            <Text style={styles.title}>PONG</Text>
            <Text style={styles.subtitle}>Classic Retro Edition</Text>
            <TouchableOpacity style={styles.button} onPress={startGame}>
              <Text style={styles.buttonText}>START GAME</Text>
            </TouchableOpacity>
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                {Platform.OS === 'web' ? 'Use ↑ ↓ arrow keys' : 'Swipe to move paddle'}
              </Text>
              <Text style={styles.instructionText}>First to {WINNING_SCORE} wins</Text>
            </View>
          </View>
        )}

        {/* Game over screen */}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.title}>GAME OVER</Text>
            <Text style={styles.winnerText}>{winner} WINS!</Text>
            <View style={styles.finalScore}>
              <Text style={styles.finalScoreText}>{player1ScoreText}</Text>
              <Text style={styles.finalScoreSeparator}>-</Text>
              <Text style={styles.finalScoreText}>{player2ScoreText}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={startGame}>
              <Text style={styles.buttonText}>PLAY AGAIN</Text>
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scoreSeparator: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.dim,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: -10,
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderWidth: 3,
    borderColor: COLORS.foreground,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  winnerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  finalScoreSeparator: {
    fontSize: 56,
    fontWeight: 'bold',
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
