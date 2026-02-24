
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPut, apiDelete } from "@/utils/api";

interface Friend {
  id: string;
  name: string;
  gameTag: string;
  avatar?: string;
  status: 'accepted';
  createdAt: string;
}

interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    name: string;
    gameTag: string;
    avatar?: string;
  };
  createdAt: string;
}

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchFriends = async () => {
    console.log("[API] Fetching friends list...");
    try {
      const data = await apiGet<Friend[]>("/api/friends");
      console.log("[API] Friends fetched:", data);
      setFriends(data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingRequests = async () => {
    console.log("[API] Fetching pending friend requests...");
    try {
      const data = await apiGet<FriendRequest[]>("/api/friends/pending");
      console.log("[API] Pending requests fetched:", data);
      setPendingRequests(data);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    console.log("[API] Accepting friend request:", requestId);
    try {
      await apiPut(`/api/friends/${requestId}/accept`, {});
      console.log("[API] Friend request accepted");
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      fetchFriends();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    console.log("[API] Rejecting friend request:", requestId);
    try {
      await apiPut(`/api/friends/${requestId}/reject`, {});
      console.log("[API] Friend request rejected");
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!selectedFriend) return;
    console.log("[API] Removing friend:", selectedFriend.id);
    try {
      await apiDelete(`/api/friends/${selectedFriend.id}`);
      console.log("[API] Friend removed");
      setFriends(prev => prev.filter(f => f.id !== selectedFriend.id));
      setShowRemoveModal(false);
      setSelectedFriend(null);
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
    fetchPendingRequests();
  };

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.requestCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
      <View style={styles.requestInfo}>
        <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={48} color={theme.colors.primary} />
        <View style={styles.requestText}>
          <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.fromUser.name}</Text>
          <Text style={[styles.friendGameTag, { color: theme.dark ? '#98989D' : '#666' }]}>{item.fromUser.gameTag}</Text>
        </View>
      </View>
      <View style={styles.requestButtons}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: '#00ff00' }]}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectButton, { backgroundColor: '#ff3b30' }]}
          onPress={() => handleRejectRequest(item.id)}
        >
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.friendCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
      onPress={() => {
        setSelectedFriend(item);
        setShowRemoveModal(true);
      }}
    >
      <View style={styles.friendInfo}>
        <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={48} color={theme.colors.primary} />
        <View style={styles.friendText}>
          <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.friendGameTag, { color: theme.dark ? '#98989D' : '#666' }]}>{item.gameTag}</Text>
        </View>
      </View>
      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={20} color={theme.dark ? '#666' : '#999'} />
    </TouchableOpacity>
  );

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
        {/* Add Friend Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push("/add-friend")}
        >
          <IconSymbol ios_icon_name="person.badge.plus" android_material_icon_name="person-add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Friend</Text>
        </TouchableOpacity>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pending Requests</Text>
            {pendingRequests.map(request => (
              <React.Fragment key={request.id}>
                {renderFriendRequest({ item: request })}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Friends List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Friends ({friends.length})
          </Text>
          {friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="person.2" android_material_icon_name="group" size={64} color={theme.dark ? '#666' : '#999'} />
              <Text style={[styles.emptyText, { color: theme.dark ? '#666' : '#999' }]}>
                No friends yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.dark ? '#666' : '#999' }]}>
                Add friends by their game tag
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              renderItem={renderFriend}
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

      {/* Remove Friend Modal */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Remove Friend</Text>
            <Text style={[styles.modalMessage, { color: theme.dark ? '#98989D' : '#666' }]}>
              Are you sure you want to remove {selectedFriend?.name} from your friends list?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.dark ? '#333' : '#eee' }]}
                onPress={() => {
                  setShowRemoveModal(false);
                  setSelectedFriend(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ff3b30' }]}
                onPress={handleRemoveFriend}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Remove</Text>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
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
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  requestText: {
    flex: 1,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendGameTag: {
    fontSize: 14,
    marginTop: 2,
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
