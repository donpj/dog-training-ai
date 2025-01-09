import { TouchableOpacity, Text } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: selected ? tintColor : "#E9E9EB",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: selected ? "#fff" : "#000",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
