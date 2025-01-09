import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useBottomTabHeight } from "@/hooks/useBottomTabHeight";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { getUserProfile } from "@/services/database";
import { Dog } from "@/types/database";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";

function formatDate(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return "Not specified";
  const date = new Date(dateOfBirth);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function calculateAge(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return "Age unknown";

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return `${age} years old`;
}

export default function ProfileScreen() {
  // Theme and UI hooks
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const tabHeight = useBottomTabHeight();

  // Navigation and Auth hooks
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  // State hooks
  const [loading, setLoading] = useState(true);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);

  // Replace useEffect with useFocusEffect
  useFocusEffect(
    useCallback(() => {
      if (isLoaded && user) {
        console.log("Profile screen focused, reloading data...");
        loadProfile();
      }
    }, [isLoaded, user])
  );

  const loadProfile = async () => {
    try {
      console.log("Loading profile data...");
      const { dogs: userDogs } = await getUserProfile(user!.id);
      console.log("Loaded dogs:", userDogs);
      setDogs(userDogs);
      if (userDogs.length > 0) {
        setSelectedDog(userDogs[0]); // Select the first dog by default
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/auth/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={tintColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: tabHeight,
        }}
      >
        {dogs.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionTitle}>Dog Profile</Text>
              <TouchableOpacity
                onPress={() => router.push("/dogs/new")}
                style={[styles.addDogLink, { borderColor: tintColor }]}
              >
                <Text style={[styles.addDogLinkText, { color: tintColor }]}>
                  + Add New Dog
                </Text>
              </TouchableOpacity>
            </View>
            {dogs.length > 1 && (
              <View style={styles.dogSelector}>
                {dogs.map((dog) => (
                  <TouchableOpacity
                    key={dog.id}
                    style={[
                      styles.dogTab,
                      selectedDog?.id === dog.id && {
                        backgroundColor: tintColor + "20",
                      },
                    ]}
                    onPress={() => setSelectedDog(dog)}
                  >
                    <Text
                      style={[
                        styles.dogTabText,
                        selectedDog?.id === dog.id && { color: tintColor },
                      ]}
                    >
                      {dog.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedDog && (
              <>
                <View style={styles.infoContainer}>
                  <InfoRow label="Name" value={selectedDog.name} />
                  <InfoRow
                    label="Breed"
                    value={selectedDog.breed || "Not specified"}
                  />
                  <InfoRow
                    label="Date of Birth"
                    value={formatDate(selectedDog.date_of_birth)}
                  />
                  <InfoRow
                    label="Weight"
                    value={
                      selectedDog.weight_lbs
                        ? `${selectedDog.weight_lbs} lbs`
                        : "Not specified"
                    }
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: tintColor }]}
                  onPress={() =>
                    router.push({
                      pathname: "/dogs/[id]/edit",
                      params: { id: selectedDog.id },
                    })
                  }
                >
                  <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionTitle}>Dog Profile</Text>
              <TouchableOpacity
                onPress={() => router.push("/dogs/new")}
                style={[styles.addDogLink, { borderColor: tintColor }]}
              >
                <Text style={[styles.addDogLinkText, { color: tintColor }]}>
                  + Add New Dog
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.emptyText}>No Dogs Added</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingText}>Notifications</Text>
            <IconSymbol size={20} name="chevron.right" color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingText}>Privacy</Text>
            <IconSymbol size={20} name="chevron.right" color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleSignOut}
          >
            <Text style={[styles.buttonText, { color: "#FF3B30" }]}>
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    padding: 20,
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    padding: 16,
    //borderTopWidth: StyleSheet.hairlineWidth,
    //borderTopColor: "#ccc",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  dogSelector: {
    flexDirection: "row",
    marginBottom: 16,
  },
  dogTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  dogTabText: {
    fontSize: 16,
    fontWeight: "500",
  },
  infoContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: {
    color: "#666",
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FF3B30",
    marginTop: 16,
  },
  settingButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginBottom: 8,
  },
  settingText: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  addDogLink: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addDogLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
