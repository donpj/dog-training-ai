import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useAlertStore } from "@/utils/alert";

const Register = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const alertStore = useAlertStore();

  const [emailAddress, setEmailAddress] = useState("");
  const [confirmEmailAddress, setConfirmEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return;
    }

    if (emailAddress !== confirmEmailAddress) {
      alertStore.showAlert({
        title: "Error",
        message: "Email addresses do not match",
        onConfirm: () => {},
      });
      return;
    }
    if (password !== confirmPassword) {
      alertStore.showAlert({
        title: "Error",
        message: "Passwords do not match",
        onConfirm: () => {},
      });
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be 8+ characters");
      return;
    } else {
      setPasswordError("");
    }

    setLoading(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      alertStore.showAlert({
        title: "Error",
        message: err.errors[0]?.message || "An error occurred",
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        console.log("Verification complete!");
      } else {
        console.log("Verification failed:", completeSignUp);
      }
    } catch (err) {
      console.error("Error verifying email:", err);
    }
  };

  return (
    <View style={styles.container}>
      <Spinner visible={loading} />

      {!pendingVerification ? (
        <>
          <TextInput
            autoCapitalize="none"
            placeholder="Email Address"
            value={emailAddress}
            onChangeText={setEmailAddress}
            style={styles.inputField}
          />
          <TextInput
            autoCapitalize="none"
            placeholder="Confirm Email Address"
            value={confirmEmailAddress}
            onChangeText={setConfirmEmailAddress}
            style={styles.inputField}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.inputField}
          />
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.inputField}
          />

          <Button
            onPress={onSignUpPress}
            title="Sign up"
            color={Colors.primary}
          />
        </>
      ) : (
        <>
          <TextInput
            value={code}
            placeholder="Verification Code"
            style={styles.inputField}
            onChangeText={setCode}
          />
          <Button
            onPress={onPressVerify}
            title="Verify Email"
            color={Colors.primary}
          />
        </>
      )}

      <Link href="/auth/sign-in" asChild>
        <Pressable style={styles.button}>
          <Text>Already have an account? Sign In</Text>
        </Pressable>
      </Link>
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
  errorText: {
    color: "red",
    marginBottom: 8,
  },
});

export default Register;
