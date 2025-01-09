import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol, IconSymbolName } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useUser } from "@clerk/clerk-expo";
import { getTrainingPlans, getTrainingSteps } from "@/services/database";
import { useRouter } from "expo-router";
import type { TrainingPlan, TrainingStep } from "@/types/database";
import { useBottomTabHeight } from "@/hooks/useBottomTabHeight";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const tabHeight = useBottomTabHeight();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null);
  const [steps, setSteps] = useState<TrainingStep[]>([]);
  const [activePlans, setActivePlans] = useState<TrainingPlan[]>([]);
  const [stepsMap, setStepsMap] = useState<Map<string, TrainingStep[]>>(
    new Map()
  );

  useEffect(() => {
    if (isLoaded && user) {
      loadTrainingData();
    }
  }, [isLoaded, user]);

  const loadTrainingData = async () => {
    try {
      setLoading(true);
      if (!user) {
        throw new Error("No user found");
      }

      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      if (!primaryEmail) {
        throw new Error("No primary email found");
      }

      // Get all plans
      const plans = await getTrainingPlans(user.id, primaryEmail);
      console.log("Fetched plans:", JSON.stringify(plans, null, 2));

      // Filter for active plans
      const activePlans = plans.filter((plan) => plan.status === "in_progress");
      console.log("Active plans:", JSON.stringify(activePlans, null, 2));

      setActivePlans(activePlans);
      setCurrentPlan(activePlans[0]);

      // Load steps for all active plans
      const stepsPromises = activePlans.map((plan) =>
        getTrainingSteps(plan.id)
      );
      const allSteps = await Promise.all(stepsPromises);
      console.log("All steps:", JSON.stringify(allSteps, null, 2));

      // Create a map of plan ID to steps
      const newStepsMap = new Map();
      allSteps.forEach((steps, index) => {
        newStepsMap.set(activePlans[index].id.toString(), steps);
      });
      setStepsMap(newStepsMap);
      setSteps(allSteps.flat());
    } catch (error) {
      console.error("Error loading training data:", error);
      setActivePlans([]);
      setStepsMap(new Map());
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (planSteps: TrainingStep[]) => {
    if (!planSteps.length) return 0;
    const completedSteps = planSteps.filter((step) => step.completed).length;
    return (completedSteps / planSteps.length) * 100;
  };

  const getCurrentStep = (planSteps: TrainingStep[]) => {
    if (!planSteps.length) return null;
    return (
      planSteps.find((step) => !step.completed) ||
      planSteps[planSteps.length - 1]
    );
  };

  const currentStep = getCurrentStep(steps);
  const progress = calculateProgress(steps);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: tabHeight,
        }}
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitle}>Let's continue training</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Training</Text>
          {loading ? (
            <ActivityIndicator size="large" color={tintColor} />
          ) : activePlans?.length > 0 ? (
            <>
              {activePlans.map((plan) => {
                const planSteps = stepsMap.get(plan.id.toString()) || [];
                const progress = calculateProgress(planSteps);
                const currentStep = getCurrentStep(planSteps);

                return (
                  <View
                    key={plan.id}
                    style={[styles.progressCard, { marginBottom: 16 }]}
                  >
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressTitle}>{plan.title}</Text>
                      <Text style={styles.progressSubtitle}>
                        {currentStep
                          ? `Day ${currentStep.day_number}`
                          : "Complete!"}
                      </Text>
                      <Text style={styles.dogName}>
                        {(plan as any).dog?.name}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${progress}%`, backgroundColor: tintColor },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: tintColor }]}
                      onPress={() => {
                        if (currentStep) {
                          router.push(`/training/${plan.id}/session`);
                        }
                      }}
                    >
                      <Text style={styles.buttonText}>
                        {currentStep ? "Continue Training" : "View Summary"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.progressCard}>
              <Text style={styles.noTrainingText}>No active training plan</Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: tintColor }]}
                onPress={() => router.push("/training/create")}
              >
                <Text style={styles.buttonText}>Create New Plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="paperplane.fill"
              label="Ask Trainer"
              tintColor={tintColor}
              onPress={() => router.push("/(tabs)/chat")}
            />
            <QuickActionButton
              icon="chevron.right"
              label="New Plan"
              tintColor={tintColor}
              onPress={() => router.push("/training/create")}
            />
            <QuickActionButton
              icon="house.fill"
              label="My Plans"
              tintColor={tintColor}
              onPress={() => router.push("/(tabs)/training")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Tips</Text>
          <View style={styles.tipCard}>
            <IconSymbol size={24} name="house.fill" color={tintColor} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Consistency is Key</Text>
              <Text style={styles.tipText}>
                Remember to maintain regular training sessions at the same time
                each day for better results.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickActionButton({
  icon,
  label,
  tintColor,
  onPress,
}: {
  icon: IconSymbolName;
  label: string;
  tintColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View
        style={[styles.iconContainer, { backgroundColor: tintColor + "20" }]}
      >
        <IconSymbol size={24} name={icon} color={tintColor} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E9E9EB",
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
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
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    color: "#666",
  },
  tipCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  noTrainingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  dogName: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
