import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Button,
  Pressable,
  Text,
} from "react-native";
import Spinner from "react-native-loading-spinner-overlay";
import { Colors } from "@/constants/Colors";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";

const Login = () => {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: appleAuth } = useOAuth({ strategy: "oauth_apple" });

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) {
      return;
    }
    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      // This indicates the user is signed in
      await setActive({ session: completeSignIn.createdSessionId });
      router.push("/(authenticated)/(tabs)/boards"); // Navigate to the index page
    } catch (err: any) {
      alert(err.errors ? err.errors[0].message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onSelectAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    const selectedAuth = {
      oauth_google: googleAuth,
      oauth_apple: appleAuth,
    }[strategy];

    try {
      const { createdSessionId, setActive: oauthSetActive } =
        await selectedAuth();
      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId });
        router.push("/(authenticated)/(tabs)/boards");
      }
    } catch (err) {
      console.error("OAuth error", err);
    }
  };

  const snapPoints = ["25%"];

  const handlePresentModal = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  return (
    <View style={styles.container}>
      <Spinner visible={loading} />

      <TextInput
        autoCapitalize="none"
        placeholder="youremail@example.dev"
        value={emailAddress}
        onChangeText={setEmailAddress}
        style={styles.inputField}
      />
      <TextInput
        placeholder="password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.inputField}
      />

      <Button onPress={onSignInPress} title="Login" color={Colors.primary} />

      <Link href="/auth/reset" asChild>
        <Pressable style={styles.button}>
          <Text>Forgot password?</Text>
        </Pressable>
      </Link>
      <Link href="/auth/sign-up" asChild>
        <Pressable style={styles.button}>
          <Text>Create Account</Text>
        </Pressable>
      </Link>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ borderRadius: 50 }}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBtn}
            onPress={() => onSelectAuth("oauth_google")}
          >
            <Text style={styles.btnText}>Continue with Google</Text>
          </Pressable>
          <Pressable
            style={styles.modalBtn}
            onPress={() => onSelectAuth("oauth_apple")}
          >
            <Text style={styles.btnText}>Continue with Apple</Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  inputField: {
    marginVertical: 4,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#fff",
  },
  button: {
    margin: 8,
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    alignItems: "center",
    padding: 20,
  },
  modalBtn: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginVertical: 8,
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
  },
});

export default Login;
