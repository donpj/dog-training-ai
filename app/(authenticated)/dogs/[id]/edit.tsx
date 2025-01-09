import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { getDogById, updateDog, deleteDog } from "@/services/database";
import { Dog } from "@/types/database";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

export default function EditDogScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dog, setDog] = useState<Dog | null>(null);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [weight, setWeight] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isLoaded && user && id) {
      loadDog();
    }
  }, [isLoaded, user, id]);

  const loadDog = async () => {
    try {
      const dogData = await getDogById(id as string);
      if (dogData) {
        setDog(dogData);
        setName(dogData.name);
        setBreed(dogData.breed || "");
        setDateOfBirth(
          dogData.date_of_birth ? new Date(dogData.date_of_birth) : null
        );
        setWeight(dogData.weight_lbs?.toString() || "");
      }
    } catch (error) {
      console.error("Error loading dog:", error);
      Alert.alert("Error", "Failed to load dog profile");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleDatePress = () => {
    console.log("Opening date picker");
    setShowDatePicker(true);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!dog) return;

    try {
      setSaving(true);
      await updateDog(dog.id.toString(), {
        name,
        breed: breed || undefined,
        date_of_birth: dateOfBirth
          ? dateOfBirth.toISOString().split("T")[0]
          : undefined,
        weight_lbs: weight ? parseInt(weight) : undefined,
      });

      Alert.alert("Success", "Dog profile updated successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error updating dog:", error);
      Alert.alert("Error", "Failed to update dog profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dog) return;

    Alert.alert(
      "Delete Dog",
      "Are you sure you want to delete this dog profile? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await deleteDog(dog.id.toString());
              Alert.alert("Success", "Dog profile deleted successfully", [
                {
                  text: "OK",
                  onPress: () => {
                    router.push({
                      pathname: "/(authenticated)/(tabs)/profile",
                      params: { refresh: Date.now() },
                    });
                  },
                },
              ]);
            } catch (error) {
              console.error("Error deleting dog:", error);
              Alert.alert("Error", "Failed to delete dog profile");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={tintColor} />
      </View>
    );
  }

  if (!dog) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Dog not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Edit Dog Profile",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <IconSymbol name="chevron.left" size={24} color={tintColor} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Dog's name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Breed</Text>
            <TextInput
              style={styles.input}
              value={breed}
              onChangeText={setBreed}
              placeholder="Dog's breed"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            {Platform.OS === "android" ? (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: dateOfBirth ? "#000" : "#999" }}>
                    {dateOfBirth
                      ? formatDate(dateOfBirth)
                      : "Select date of birth"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth || new Date()}
                    mode="date"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            ) : (
              <DateTimePicker
                value={dateOfBirth || new Date()}
                mode="date"
                onChange={handleDateChange}
                maximumDate={new Date()}
                themeVariant={colorScheme === "dark" ? "dark" : "light"}
                accentColor={tintColor}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="Dog's weight"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: tintColor },
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, saving && styles.saveButtonDisabled]}
            onPress={handleDelete}
            disabled={saving}
          >
            <Text style={styles.deleteButtonText}>Delete Dog Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#666",
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#ff3b30",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
