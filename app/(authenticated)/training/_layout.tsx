import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

export default function TrainingLayout() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: tintColor,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/session"
        options={{
          headerShown: true,
          title: "Training Session",
          headerBackTitle: "Back",
          presentation: "fullScreenModal",
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
