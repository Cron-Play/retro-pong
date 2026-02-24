
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { apiPost } from "@/utils/api";

export default function AddFriendScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [gameTag, setGameTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAddFriend = async () => {
    if (!gameTag.trim()) {
      setError("Please enter a game tag");
      return;
    }

    console.log("Sending friend request to:", gameTag);
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      console.log("[API] Sending friend request to:", gameTag.trim());
      const result = await apiPost<{ success: boolean; friendship: any }>("/api/friends/request", {
        gameTag: gameTag.trim(),
      });
      console.log("[API] Friend request sent:", result);
      setSuccess(true);
      setGameTag("");
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      console.error("Error sending friend request:", err);
      const msg = err?.message || "";
      if (msg.includes("404") || msg.includes("not found")) {
        setError("No player found with that game tag");
      } else if (msg.includes("400") || msg.includes("already")) {
        setError("Friend request already sent or you are already friends");
      } else {
        setError(err.message || "Failed to send friend request");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol ios_icon_name="person.badge.plus.fill" android_material_icon_name="person-add" size={80} color={theme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Add Friend</Text>
          <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
            Enter your friend&apos;s game tag to send a friend request
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { 
                  color: theme.colors.text,
                  borderColor: error ? '#ff3b30' : (theme.dark ? '#444' : '#ccc'),
                  backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                }
              ]}
              value={gameTag}
              onChangeText={(text) => {
                setGameTag(text);
                setError("");
              }}
              placeholder="PLAYER#1234"
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            {success ? (
              <View style={styles.successContainer}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={20} color="#00ff00" />
                <Text style={styles.successText}>Friend request sent!</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary },
              (loading || !gameTag.trim()) && styles.buttonDisabled
            ]}
            onPress={handleAddFriend}
            disabled={loading || !gameTag.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color="#fff" />
                <Text style={styles.buttonText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
            <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
              Game tags are unique identifiers. You can find yours on your profile page.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  successText: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
