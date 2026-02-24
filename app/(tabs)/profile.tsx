
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { apiGet, apiPut } from "@/utils/api";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  gameTag: string;
  avatar?: string;
  wins: number;
  losses: number;
  totalGames: number;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGameTag, setEditGameTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    console.log("[API] Fetching user profile...");
    setLoading(true);
    try {
      const data = await apiGet<UserProfile>("/api/profile");
      console.log("[API] Profile fetched:", data);
      setProfile(data);
      setEditName(data.name || "");
      setEditGameTag(data.gameTag || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    console.log("[API] Saving profile:", { name: editName, gameTag: editGameTag });
    setSaving(true);
    try {
      const updated = await apiPut<UserProfile>("/api/profile", {
        name: editName,
        gameTag: editGameTag,
      });
      console.log("[API] Profile updated:", updated);
      setProfile(updated);
      setEditMode(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setSaveError(error?.message || "Failed to save profile. Game tag may already be taken.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    console.log("User signing out...");
    try {
      await signOut();
      router.replace("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setShowSignOutModal(false);
    }
  };

  if (!user && !authLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <IconSymbol ios_icon_name="person.circle" android_material_icon_name="person" size={80} color={theme.colors.text} />
          <Text style={[styles.notLoggedInText, { color: theme.colors.text }]}>Not logged in</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || authLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const winRate = profile && profile.totalGames > 0 
    ? ((profile.wins / profile.totalGames) * 100).toFixed(1) 
    : "0.0";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        {/* Profile Header */}
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={80} color={theme.colors.primary} />
          
          {editMode ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.dark ? '#444' : '#ccc' }]}
                value={editName}
                onChangeText={(t) => { setEditName(t); setSaveError(""); }}
                placeholder="Name"
                placeholderTextColor={theme.dark ? '#666' : '#999'}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: saveError ? '#ff3b30' : (theme.dark ? '#444' : '#ccc') }]}
                value={editGameTag}
                onChangeText={(t) => { setEditGameTag(t); setSaveError(""); }}
                placeholder="Game Tag"
                placeholderTextColor={theme.dark ? '#666' : '#999'}
                autoCapitalize="characters"
              />
              {saveError ? (
                <Text style={{ color: '#ff3b30', fontSize: 13, textAlign: 'center' }}>{saveError}</Text>
              ) : null}
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: theme.dark ? '#444' : '#ccc' }]}
                  onPress={() => {
                    setEditMode(false);
                    setSaveError("");
                    setEditName(profile?.name || "");
                    setEditGameTag(profile?.gameTag || "");
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.name}</Text>
              <Text style={[styles.gameTag, { color: theme.dark ? '#98989D' : '#666' }]}>{profile?.gameTag}</Text>
              <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>{profile?.email}</Text>
              <TouchableOpacity
                style={[styles.editButton, { borderColor: theme.colors.primary }]}
                onPress={() => setEditMode(true)}
              >
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={16} color={theme.colors.primary} />
                <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </GlassView>

        {/* Stats Section */}
        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#00ff00' }]}>{profile?.wins}</Text>
              <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ff0000' }]}>{profile?.losses}</Text>
              <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>Losses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{profile?.totalGames}</Text>
              <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ffaa00' }]}>{winRate}%</Text>
              <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>Win Rate</Text>
            </View>
          </View>
        </GlassView>

        {/* Multiplayer Section */}
        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Multiplayer</Text>
          
          <TouchableOpacity
            style={[styles.menuButton, { borderBottomColor: theme.dark ? '#333' : '#eee' }]}
            onPress={() => router.push("/friends")}
          >
            <View style={styles.menuButtonLeft}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="group" size={24} color={theme.colors.primary} />
              <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>Friends</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={20} color={theme.dark ? '#666' : '#999'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { borderBottomColor: theme.dark ? '#333' : '#eee' }]}
            onPress={() => router.push("/game-lobby")}
          >
            <View style={styles.menuButtonLeft}>
              <IconSymbol ios_icon_name="gamecontroller.fill" android_material_icon_name="videogame-asset" size={24} color={theme.colors.primary} />
              <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>Game Lobby</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={20} color={theme.dark ? '#666' : '#999'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push("/add-friend")}
          >
            <View style={styles.menuButtonLeft}>
              <IconSymbol ios_icon_name="person.badge.plus" android_material_icon_name="person-add" size={24} color={theme.colors.primary} />
              <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>Add Friend</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="arrow-forward" size={20} color={theme.dark ? '#666' : '#999'} />
          </TouchableOpacity>
        </GlassView>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: '#ff3b30' }]}
          onPress={() => setShowSignOutModal(true)}
        >
          <IconSymbol ios_icon_name="arrow.right.square" android_material_icon_name="logout" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sign Out</Text>
            <Text style={[styles.modalMessage, { color: theme.dark ? '#98989D' : '#666' }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.dark ? '#333' : '#eee' }]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ff3b30' }]}
                onPress={handleSignOut}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Sign Out</Text>
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
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gameTag: {
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editContainer: {
    width: '100%',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButtonText: {
    fontSize: 16,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notLoggedInText: {
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
