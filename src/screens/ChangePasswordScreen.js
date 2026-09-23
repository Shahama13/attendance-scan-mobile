import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { changePassword } from "../api/client";
import { colors, radius } from "../theme";

// Mirrors the web portal's "Change password" modal — same endpoint
// (PATCH /api/auth/change-password), same rules: proving the current
// password is what makes this safe without an admin in the loop, and a
// wrong current password comes back as a plain inline error (the
// backend uses 400, not 401, specifically so this never triggers a
// forced logout).
export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (!currentPassword || !newPassword) {
      setError("Enter your current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Password updated</Text>
          <Text style={styles.successText}>
            Use your new password the next time you log in.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 14 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.close}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Change password</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Current password</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.ink40}
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="At least 6 characters"
          placeholderTextColor={colors.ink40}
        />

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.ink40}
        />

        <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Save new password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline from useSafeAreaInsets() instead of a fixed
  // number here — see the component body.
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  close: { color: colors.ink50, fontSize: 14, fontWeight: "600", width: 50 },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink90 },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.ink10 },
  label: { fontSize: 12.5, fontWeight: "600", color: colors.ink55, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.ink15, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.ink90,
  },
  error: { color: colors.bad, fontSize: 13, marginBottom: 4 },
  button: {
    marginTop: 22, backgroundColor: colors.amber, borderRadius: radius.sm,
    paddingVertical: 13, alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  successBox: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 10 },
  successTitle: { fontSize: 18, fontWeight: "700", color: colors.ink90, marginBottom: 8 },
  successText: { fontSize: 13.5, color: colors.ink50, textAlign: "center", marginBottom: 24 },
});