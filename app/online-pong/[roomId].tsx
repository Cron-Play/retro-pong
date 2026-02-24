
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { IconSymbol } from "@/components/IconSymbol";
import { apiGet, BACKEND_URL, getBearerToken } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

interface RoomDetails {
  id: string;
  host: { id: string; name: string; gameTag: string };
  guest?: { id: string; name: string; gameTag: string };
  status: string;
  gameState?: any;
  createdAt: string;
}

export default function OnlinePongScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    console.log("Connecting to game room:", roomId);
    connectToRoom();

    return () => {
      if (wsRef.current) {
        console.log("Disconnecting from game room");
        wsRef.current.close();
      }
    };
  }, [roomId]);

  const connectToRoom = async () => {
    try {
      // Fetch room details
      console.log("[API] Fetching room details for:", roomId);
      const room = await apiGet<RoomDetails>(`/api/game/${roomId}`);
      console.log("[API] Room details:", room);
      setRoomDetails(room);

      // Determine player number based on user ID
      let pNum: 1 | 2 = 1;
      if (user && room.guest && room.guest.id === user.id) {
        pNum = 2;
      } else if (user && room.host.id === user.id) {
        pNum = 1;
      }
      setPlayerNumber(pNum);

      // Check if opponent is already in the room
      if (room.guest) {
        setOpponentConnected(true);
      }

      // Establish WebSocket connection
      const token = await getBearerToken();
      const wsUrl = BACKEND_URL.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws"));
      const ws = new WebSocket(`${wsUrl}/ws/game/${roomId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] WebSocket connected to room:", roomId);
        // Send bearer token as first message to authenticate
        if (token) {
          ws.send(token);
        }
        setConnected(true);
        setLoading(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WS] Message received:", data.type);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error("[WS] Failed to parse message:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("[WS] WebSocket error:", err);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log("[WS] WebSocket disconnected");
        setConnected(false);
      };
    } catch (err: any) {
      console.error("Error connecting to room:", err);
      setError(err?.message || "Failed to connect to room");
      setLoading(false);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "player_joined":
        console.log("[WS] Player joined:", data.player);
        if (data.player !== playerNumber) {
          setOpponentConnected(true);
        }
        break;
      case "player_left":
        console.log("[WS] Player left:", data.player);
        if (data.player !== playerNumber) {
          setOpponentConnected(false);
        }
        break;
      case "game_state":
        // Game state updates handled in pong.tsx when game is active
        break;
      case "game_over":
        console.log("[WS] Game over, winner:", data.winnerId);
        break;
      default:
        break;
    }
  };

  const handleStartGame = () => {
    console.log("Starting online Pong game in room:", roomId);
    // Navigate to the actual Pong game with online multiplayer mode
    router.push({
      pathname: '/pong',
      params: {
        gameMode: 'onlineMultiplayer',
        roomId: roomId,
        playerNumber: playerNumber?.toString() || '1',
      },
    });
  };

  const handleLeaveRoom = () => {
    console.log("Leaving game room:", roomId);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    router.back();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Connecting to room...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: "Error", headerBackTitle: "Back" }} />
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
          <View style={styles.centerContainer}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={64} color="#ff3b30" />
            <Text style={[styles.loadingText, { color: theme.colors.text, textAlign: 'center' }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.leaveButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const playerNumberText = playerNumber === 1 ? "Player 1" : "Player 2";
  const waitingText = opponentConnected ? "Both players ready!" : "Waiting for opponent...";

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: `Room: ${roomId.substring(0, 8)}...`,
          headerBackTitle: "Leave"
        }} 
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Connection Status */}
            <View style={[styles.statusCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.statusRow}>
                <IconSymbol 
                  ios_icon_name={connected ? "wifi" : "wifi.slash"} 
                  android_material_icon_name={connected ? "wifi" : "wifi-off"} 
                  size={24} 
                  color={connected ? '#00ff00' : '#ff3b30'} 
                />
                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                  {connected ? "Connected" : "Disconnected"}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <IconSymbol 
                  ios_icon_name="person.fill" 
                  android_material_icon_name="person" 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                  You are {playerNumberText}
                </Text>
              </View>
            </View>

            {/* Waiting for Opponent */}
            <View style={styles.waitingContainer}>
              <IconSymbol 
                ios_icon_name="person.2.fill" 
                android_material_icon_name="group" 
                size={80} 
                color={opponentConnected ? '#00ff00' : theme.dark ? '#666' : '#999'} 
              />
              <Text style={[styles.waitingText, { color: theme.colors.text }]}>
                {waitingText}
              </Text>
              {!opponentConnected && (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
              )}
            </View>

            {/* Room Info */}
            <View style={[styles.infoCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Room ID</Text>
              <Text style={[styles.infoValue, { color: theme.dark ? '#98989D' : '#666' }]}>{roomId}</Text>
              {roomDetails && (
                <>
                  <Text style={[styles.infoTitle, { color: theme.colors.text, marginTop: 8 }]}>Host</Text>
                  <Text style={[styles.infoValue, { color: theme.dark ? '#98989D' : '#666' }]}>
                    {roomDetails.host.name} ({roomDetails.host.gameTag})
                  </Text>
                  {roomDetails.guest && (
                    <>
                      <Text style={[styles.infoTitle, { color: theme.colors.text, marginTop: 8 }]}>Guest</Text>
                      <Text style={[styles.infoValue, { color: theme.dark ? '#98989D' : '#666' }]}>
                        {roomDetails.guest.name} ({roomDetails.guest.gameTag})
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {opponentConnected ? (
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: '#00ff00' }]}
                  onPress={handleStartGame}
                >
                  <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={24} color="#000" />
                  <Text style={styles.startButtonText}>Start Game</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.startButton, { backgroundColor: theme.dark ? '#333' : '#ccc', opacity: 0.5 }]}>
                  <Text style={[styles.startButtonText, { color: theme.dark ? '#666' : '#999' }]}>
                    Waiting for opponent...
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.leaveButton, { backgroundColor: '#ff3b30' }]}
                onPress={handleLeaveRoom}
              >
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color="#fff" />
                <Text style={styles.leaveButtonText}>Leave Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  waitingText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonContainer: {
    gap: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
