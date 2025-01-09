import React from "react";
import { View, Image, StyleSheet, ViewStyle } from "react-native";

interface UserAvatarProps {
  user: {
    avatar_url?: string;
  };
  size: number;
  showOnlineStatus?: boolean;
  style?: ViewStyle;
}

export function UserAvatar({
  user,
  size,
  showOnlineStatus = false,
  style,
}: UserAvatarProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={
          user.avatar_url
            ? { uri: user.avatar_url }
            : require("@/assets/images/default-avatar.png")
        }
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
      {showOnlineStatus && (
        <View style={[styles.onlineStatus, { right: 0, bottom: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: "#f0f0f0",
  },
  onlineStatus: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
