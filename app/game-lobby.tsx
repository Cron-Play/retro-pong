
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost, apiPut } from "@/utils/api";

interface GameRoom {
  id: string;
  host: {
    id: string;
    name: string;
    gameTag: string;
  };
  guest?: {
    id: string;
    name: string;
    gameTag: string;
  };
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
}

interface GameInvite {
  id: string;
  roomId: string;
  fromUser: {
    name: string;
    gameTag: string;
  };
  createdAt: string;
}

export default function GameLobbyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeRooms, setActiveRooms] = useState<GameRoom[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [friendGameTag, setFriendGameTag] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    console.log("Fetching game lobby data...");
    try {
      await Promise.all([fetchActiveRooms(), fetchGameInvites()]);
    } catch (error) {
      console.error("Error fetching lobby data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveRooms = async () => {
    console.log("[API] Fetching active game rooms...");
    try {
      const data = await apiGet<GameRoom[]>("/api/game/active");
      console.log("[API] Active rooms fetched:", data);
      setActiveRooms(data);
    } catch (error) {
      console.error("Error fetching active rooms:", error);
    }
  };

  const fetchGameInvites = async () => {
    console.log("[API] Fetching game invites...");
    try {
      const data = await apiGet<GameInvite[]>("/api/game/invites");
      console.log("[API] Game invites fetched:", data);
      setGameInvites(data);
    } catch (error) {
      console.error("Error fetching game invites:", error);
    }
  };

  const handleCreateRoom = async () => {
    console.log("[API] Creating new game room...");
    setCreatingRoom(true);
    try {
      const result = await apiPost<{ roomId: string; hostId: string; status: string }>("/api/game/create", {});
      console.log("[API] Game room created:", result);
      router.push(`/online-pong/${result.roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleInviteFriend = async () => {
    if (!selectedRoomId || !friendGameTag.trim()) return;
    
    console.log("[API] Inviting friend to room:", selectedRoomId, friendGameTag);
    setInviting(true);
    setInviteError("");
    try {
      const result = await apiPost<{ inviteId: string }>(`/api/game/${selectedRoomId}/invite`, {
        friendGameTag: friendGameTag.trim(),
      });
      console.log("[API] Friend invited:", result);
      setShowInviteModal(false);
      setFriendGameTag("");
      setSelectedRoomId(null);
    } catch (error: any) {
      console.error("Error inviting friend:", error);
      const msg = error?.message || "";
      if (msg.includes("404")) {
        setInviteError("Player not found with that game tag");
      } else if (msg.includes("403")) {
        setInviteError("You are not the host of this room");
      } else {
        setInviteError(error?.message || "Failed to send invite");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, roomId: string) => {
    console.log("[API] Accepting game invite:", inviteId);
    try {
      const result = await apiPut<{ roomId: string; room: any }>(`/api/game/invites/${inviteId}/accept`, {});
      console.log("[API] Game invite accepted:", result);
      setGameInvites(prev => prev.filter(inv => inv.id !== inviteId));
      router.push(`/online-pong/${result.roomId}`);
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    console.log("[API] Rejecting game invite:", inviteId);
    try {
      await apiPut(`/api/game/invites/${inviteId}/reject`, {});
      console.log("[API] Game invite rejected");
      setGameInvites(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (error) {
      console.error("Error rejecting invite:", error);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    console.log("Joining game room:", roomId);
    router.push(`/online-pong/${roomId}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderInvite = ({ item }: { item: GameInvite }) => (
    <View style={[styles.inviteCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
      <View style={styles.inviteInfo}>
        <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={40} color={theme.colors.primary} />
        <View style={styles.inviteText}>
          <Text style={[styles.inviteTitle, { color: theme.colors.text }]}>Game Invite</Text>
          <Text style={[styles.inviteFrom, { color: theme.dark ? '#98989D' : '#666' }]}>
            From: {item.fromUser.name} ({item.fromUser.gameTag})
          </Text>
        </View>
      </View>
      <View style={styles.inviteButtons}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: '#00ff00' }]}
          onPress={() => handleAcceptInvite(item.id, item.roomId)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectButton, { backgroundColor: '#ff3b30' }]}
          onPress={() => handleRejectInvite(item.id)}
        >
          <Text style={styles.rejectButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRoom = ({ item }: { item: GameRoom }) => {
    const isHost = item.host.id === user?.id;
    const statusText = item.status === 'waiting' ? 'Waiting for player...' : 'In Progress';
    const statusColor = item.status === 'waiting' ? '#ffaa00' : '#00ff00';

    return (
      <TouchableOpacity
        style={[styles.roomCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        onPress={() => handleJoinRoom(item.id)}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomInfo}>
            <IconSymbol ios_icon_name="gamecontroller.fill" android_material_icon_name="videogame-asset" size={40} color={theme.colors.primary} />
            <View style={styles.roomText}>
              <Text style={[styles.roomHost, { color: theme.colors.text }]}>
                Host: {item.host.name}
              </Text>
              {item.guest && (
                <Text style={[styles.roomGuest, { color: theme.dark ? '#98989D' : '#666' }]}>
                  Guest: {item.guest.name}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        {isHost && item.status === 'waiting' && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: theme.colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedRoomId(item.id);
              setShowInviteModal(true);
            }}
          >
            <IconSymbol ios_icon_name="person.badge.plus" android_material_icon_name="person-add" size={16} color="#fff" />
            <Text style={styles.inviteButtonText}>Invite Friend</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.container}>
        {/* Create Room Button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary, opacity: creatingRoom ? 0.7 : 1 }]}
          onPress={handleCreateRoom}
          disabled={creatingRoom}
        >
          {creatingRoom ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={24} color="#fff" />
          )}
          <Text style={styles.createButtonText}>{creatingRoom ? "Creating..." : "Create Game Room"}</Text>
        </TouchableOpacity>

        {/* Game Invites Section */}
        {gameInvites.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Game Invites</Text>
            {gameInvites.map(invite => (
              <React.Fragment key={invite.id}>
                {renderInvite({ item: invite })}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Active Rooms Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Your Game Rooms ({activeRooms.length})
          </Text>
          {activeRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="gamecontroller" android_material_icon_name="videogame-asset" size={64} color={theme.dark ? '#666' : '#999'} />
              <Text style={[styles.emptyText, { color: theme.dark ? '#666' : '#999' }]}>
                No active game rooms
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.dark ? '#666' : '#999' }]}>
                Create a room to start playing
              </Text>
            </View>
          ) : (
            <FlatList
              data={activeRooms}
              renderItem={renderRoom}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
        </View>
      </View>

      {/* Invite Friend Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Invite Friend</Text>
            <Text style={[styles.modalMessage, { color: theme.dark ? '#98989D' : '#666' }]}>
              Enter your friend&apos;s game tag to invite them
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { 
                  color: theme.colors.text,
                  borderColor: inviteError ? '#ff3b30' : (theme.dark ? '#444' : '#ccc'),
                  backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }
              ]}
              value={friendGameTag}
              onChangeText={(t) => { setFriendGameTag(t); setInviteError(""); }}
              placeholder="PLAYER#1234"
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              autoCapitalize="characters"
            />
            {inviteError ? (
              <Text style={{ color: '#ff3b30', fontSize: 13, textAlign: 'center' }}>{inviteError}</Text>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.dark ? '#333' : '#eee' }]}
                onPress={() => {
                  setShowInviteModal(false);
                  setFriendGameTag("");
                  setSelectedRoomId(null);
                  setInviteError("");
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleInviteFriend}
                disabled={inviting || !friendGameTag.trim()}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inviteCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteText: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteFrom: {
    fontSize: 14,
    marginTop: 2,
  },
  inviteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  roomCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  roomHeader: {
    gap: 12,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomText: {
    flex: 1,
  },
  roomHost: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomGuest: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
