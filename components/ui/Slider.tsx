import { View } from "react-native";
import Slider from "@react-native-community/slider";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step: number;
}

export function CustomSlider({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step,
}: CustomSliderProps) {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;

  return (
    <View style={{ paddingHorizontal: 8 }}>
      <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={tintColor}
        maximumTrackTintColor="#E9E9EB"
        thumbTintColor={tintColor}
      />
    </View>
  );
}
