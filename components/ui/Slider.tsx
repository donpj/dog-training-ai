import { View } from "react-native";
import { Slider as RNSlider } from "@miblanchard/react-native-slider";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step: number;
}

export function Slider({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step,
}: SliderProps) {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;

  return (
    <View style={{ paddingHorizontal: 8 }}>
      <RNSlider
        value={value}
        onValueChange={(values) => onValueChange(values[0])}
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
