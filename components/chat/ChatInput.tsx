import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatInputProps {
  onSubmit: (content: string) => void;
  style?: ViewStyle;
}

const PADDING_BOTTOM = Platform.OS === "ios" ? 0 : 0;

const useGradualAnimation = () => {
  const height = useSharedValue(PADDING_BOTTOM);
  const tabBarHeight = useBottomTabBarHeight();

  useKeyboardHandler({
    onMove: (e) => {
      "worklet";
      height.value = Math.max(e.height, PADDING_BOTTOM + tabBarHeight);
    },
    onEnd: (e) => {
      "worklet";
      height.value = e.height;
    },
  });

  return { height };
};

export function ChatInput({ onSubmit, style }: ChatInputProps) {
  const { height } = useGradualAnimation();
  const [content, setContent] = useState("");
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    try {
      await onSubmit(trimmedContent);
      setContent("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: any) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
      e.preventDefault();
    }
  };

  const fakeView = useAnimatedStyle(() => ({
    height: Math.abs(height.value),
    marginBottom: height.value > 0 ? 0 : PADDING_BOTTOM + tabBarHeight,
  }));

  return (
    <View style={[styles.mainContainer, style]}>
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Type a message..."
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            onKeyPress={Platform.OS === "web" ? handleKeyPress : undefined}
            editable={true}
            autoCapitalize="none"
            autoCorrect={true}
            enablesReturnKeyAutomatically={true}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            !content.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!content.trim()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={24}
            color={
              content.trim() ? Colors.light.text : Colors.light.tabIconDefault
            }
          />
        </TouchableOpacity>
      </View>
      <Animated.View style={fakeView} />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    width: "100%",
    backgroundColor: Colors.light.background,
    position: "relative",
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.light.background,
  },
  inputContainer: {
    flex: 1,
    marginRight: 8,
    backgroundColor: Colors.light.tabIconDefault + "20",
    borderRadius: 20,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  input: {
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    color: Colors.light.text,
  },
  sendButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.tabIconDefault + "20",
  },
});
