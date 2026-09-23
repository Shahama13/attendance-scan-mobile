import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AT</Text>
        </View>
        <Text style={styles.company}>Attendance Portal</Text>
        {/* Not tied to any specific site on purpose — at login time the app
            doesn't know who's signing in yet, so it can't know their site
            or campus. Which site/campus a supervisor belongs to is shown
            after login, on the Account tab, pulled from their own record. */}
        <Text style={styles.subtitle}>Login with your supervisor account</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="sup.north"
          placeholderTextColor={colors.ink40}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.ink40}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Site supervisors only. Contact Muscat admin for access.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  badge: {
    width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.amber,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  badgeText: { fontWeight: "800", fontSize: 20, color: colors.navy },
  company: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: 20 },
  label: { fontSize: 12.5, fontWeight: "600", color: colors.ink55, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.ink15, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.ink90,
  },
  error: { color: colors.bad, fontSize: 13, marginTop: 14 },
  button: {
    marginTop: 22, backgroundColor: colors.navy, borderRadius: radius.sm,
    paddingVertical: 13, alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  footer: { color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", marginTop: 20 },
});