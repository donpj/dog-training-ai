import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useUser } from "@clerk/clerk-expo";
import { generateChatResponse } from "@/services/openai";
import { saveChatMessage, getChatHistory } from "@/services/database";
import type { ChatMessage } from "@/types/database";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Link, useRouter } from "expo-router";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { ChatInput } from "@/components/chat/ChatInput";
import Markdown from "react-native-markdown-display";

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const { user, isLoaded } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const bottomTabHeight = useBottomTabBarHeight();
  const router = useRouter();
  const height = useSharedValue(0);

  useKeyboardHandler({
    onMove: (e) => {
      "worklet";
      height.value = Math.max(e.height, bottomTabHeight);
    },
    onEnd: (e) => {
      "worklet";
      height.value = e.height;
    },
  });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: -height.value }],
  }));

  useEffect(() => {
    if (isLoaded && user) {
      loadChatHistory();
    }
  }, [isLoaded, user]);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(user!.id);
      console.log("Loaded chat history:", history);
      setMessages(history);
      // Scroll to bottom after chat history is loaded
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error("Failed to load chat history:", error);
      Alert.alert("Error", "Failed to load chat history");
    }
  };

  // Add effect to scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || loading || !user) {
      console.log("Send prevented:", {
        messageEmpty: !message.trim(),
        loading,
        userMissing: !user,
      });
      return;
    }

    const userMessage = message;
    setMessage("");
    setLoading(true);

    try {
      // Get AI response
      const aiResponse = await generateChatResponse(userMessage);
      // Save to database
      const savedMessage = await saveChatMessage({
        user_id: user.id,
        message: userMessage,
        ai_response: aiResponse,
      });
      // Update UI
      setMessages((prev) => [...prev, savedMessage]);
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Chat error:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send message"
      );

      // Show error in chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          user_id: user.id,
          message: userMessage,
          ai_response: "Sorry, I encountered an error. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat with AI Trainer</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            Please sign in to use the chat feature
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: tintColor }]}
            onPress={() => router.push("/auth/sign-in")}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/auth/sign-up")}>
              <Text style={[styles.signUpLink, { color: tintColor }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ask AI Trainer</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }}
      >
        {messages.map((msg) => (
          <View key={msg.id}>
            <View style={[styles.messageBubble, styles.userMessage]}>
              <Markdown style={userMarkdownStyles}>{msg.message}</Markdown>
            </View>
            <View style={[styles.messageBubble, styles.aiMessage]}>
              <Markdown style={markdownStyles}>{msg.ai_response}</Markdown>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.aiMessage]}>
            <ActivityIndicator color={tintColor} />
          </View>
        )}
      </ScrollView>

      <ChatInput
        onSubmit={async (content) => {
          if (!content.trim() || loading || !user) return;

          setLoading(true);
          try {
            console.log("Sending message to OpenAI:", content);
            // Pass the last 10 messages as context and user ID
            const chatContext = messages.slice(-10);
            const aiResponse = await generateChatResponse(
              content,
              chatContext,
              user.id
            );

            const savedMessage = await saveChatMessage({
              user_id: user.id,
              message: content,
              ai_response: aiResponse,
            });

            setMessages((prev) => [...prev, savedMessage]);
            // Ensure scroll to bottom happens after the message is added
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } catch (error) {
            console.error("Chat error:", error);
            Alert.alert(
              "Error",
              error instanceof Error ? error.message : "Failed to send message"
            );

            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                user_id: user.id,
                message: content,
                ai_response: "Sorry, I encountered an error. Please try again.",
                created_at: new Date().toISOString(),
              },
            ]);
          } finally {
            setLoading(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

// Custom Markdown styles
const markdownStyles = {
  body: {
    color: "#000",
    fontSize: 16,
  },
  paragraph: {
    fontSize: 16,
    marginVertical: 0,
    lineHeight: 22,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  bullet: {
    marginRight: 4,
  },
  listItem: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  strong: {
    fontWeight: "700" as const,
    fontSize: 16,
  },
  em: {
    fontStyle: "italic" as const,
    fontSize: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    marginVertical: 0,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: "#ccc",
    paddingLeft: 8,
    marginLeft: 0,
    marginTop: 4,
    marginBottom: 4,
    fontSize: 16,
  },
};

// Custom Markdown styles for user messages (light text)
const userMarkdownStyles = {
  ...markdownStyles,
  body: {
    color: "#fff",
    fontSize: 16,
  },
  text: {
    ...markdownStyles.text,
    color: "#fff",
  },
  blockquote: {
    ...markdownStyles.blockquote,
    borderLeftColor: "#fff",
    color: "#fff",
  },
  strong: {
    ...markdownStyles.strong,
    color: "#fff",
  },
  em: {
    ...markdownStyles.em,
    color: "#fff",
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    position: "relative",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  signInButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 16,
  },
  signInButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  signUpContainer: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
  },
  signUpText: {
    fontSize: 16,
    color: "#666",
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: "600",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#E9E9EB",
  },
  mainContainer: {
    width: "100%",
    backgroundColor: "#ffffff",
    position: "absolute",
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 36,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
