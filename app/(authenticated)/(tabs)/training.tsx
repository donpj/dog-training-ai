import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { getTrainingPlans } from "@/services/database";
import {
  TrainingPlan as DBTrainingPlan,
  TrainingStatus,
  Dog,
} from "@/types/database";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "@/components/ui/IconSymbol";

type TrainingPlanWithDog = DBTrainingPlan & {
  dog: Pick<Dog, "name">;
};

export default function TrainingScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const bottomTabHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [plans, setPlans] = useState<TrainingPlanWithDog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      loadPlans();
    }
  }, [isLoaded, user]);

  const loadPlans = async () => {
    try {
      console.log("Loading plans for user:", user!.id);
      const userPlans = await getTrainingPlans(
        user!.id,
        user!.primaryEmailAddress?.emailAddress
      );
      console.log("Raw plans data:", userPlans);
      setPlans(userPlans);

      // Debug each plan's status
      userPlans.forEach((plan) => {
        console.log(`Plan ${plan.id} status:`, plan.status);
      });
    } catch (error) {
      console.error("Error loading plans:", error);
      Alert.alert("Error", "Failed to load training plans");
    } finally {
      setLoading(false);
    }
  };

  // Filter plans and log the results
  console.log("\n=== FILTERING PLANS ===");
  console.log(
    "All plans before filtering:",
    plans.map((p) => ({
      id: p.id,
      status: p.status,
      title: p.title,
    }))
  );

  const activePlans = plans.filter((plan) => plan.status === "in_progress");
  const completedPlans = plans.filter((plan) => plan.status === "completed");
  const notStartedPlans = plans.filter((plan) => plan.status === "not_started");

  console.log("Filtered results:", {
    total: plans.length,
    active: {
      count: activePlans.length,
      plans: activePlans.map((p) => ({ id: p.id, status: p.status })),
    },
    completed: {
      count: completedPlans.length,
      plans: completedPlans.map((p) => ({ id: p.id, status: p.status })),
    },
    notStarted: {
      count: notStartedPlans.length,
      plans: notStartedPlans.map((p) => ({ id: p.id, status: p.status })),
    },
  });

  // Debug each plan's status
  plans.forEach((plan) => {
    console.log(`Plan ${plan.id}:`, {
      title: plan.title,
      status: plan.status,
      isTypeMatch: typeof plan.status === "string",
      statusEquals: plan.status === "completed",
      statusType: typeof plan.status,
    });
  });

  const renderPlan = (plan: TrainingPlanWithDog) => (
    <TouchableOpacity
      key={plan.id}
      style={styles.planCard}
      onPress={() => router.push(`/training/${plan.id}`)}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <Text style={styles.planDuration}>{plan.duration_weeks} weeks</Text>
      </View>
      <Text style={styles.planDescription} numberOfLines={2}>
        {plan.description}
      </Text>
      <View style={styles.planFooter}>
        <Text style={styles.planDog}>{plan.dog.name}</Text>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: tintColor + "20" },
          ]}
        >
          <Text style={[styles.difficultyText, { color: tintColor }]}>
            {plan.difficulty}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Training Plans</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: tintColor }]}
          onPress={() => router.push("/training/create")}
        >
          <IconSymbol size={20} name="plus" color="white" />
          <Text style={styles.buttonText}>New Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: bottomTabHeight,
        }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Plans</Text>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={tintColor} />
          ) : activePlans.length > 0 ? (
            activePlans.map(renderPlan)
          ) : (
            <Text style={styles.emptyText}>No active training plans</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not Started Plans</Text>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={tintColor} />
          ) : notStartedPlans.length > 0 ? (
            notStartedPlans.map(renderPlan)
          ) : (
            <Text style={styles.emptyText}>No training plans to start</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Plans</Text>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={tintColor} />
          ) : completedPlans.length > 0 ? (
            completedPlans.map(renderPlan)
          ) : (
            <Text style={styles.emptyText}>No completed training plans</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  planDuration: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  planDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  planFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planDog: {
    fontSize: 14,
    fontWeight: "500",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  loading: {
    marginTop: 20,
  },
});
