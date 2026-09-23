import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme";

function roleLabel(role) {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

// Where identity, assignment (site/campus), and account-level actions
// live — pulled out of the Home screen's header so Home can just be
// "today's task" and this can be "who am I / where do I work / settings."
export default function AccountScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const fullName = user?.fullName || user?.full_name || "";

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + 14 }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.title}>Account</Text>

      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{fullName.charAt(0).toUpperCase() || "?"}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.role}>{roleLabel(user?.role)}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Assignment</Text>
      <View style={styles.card}>
        <InfoRow label="Site" value={user?.siteName || user?.site_name} />
        <View style={styles.divider} />
        <InfoRow label="Campus" value={user?.campusName || user?.campus_name} />
      </View>

      <Text style={styles.sectionLabel}>Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate("ChangePassword")}>
          <Ionicons name="key-outline" size={18} color={colors.ink55} style={styles.actionIcon} />
          <Text style={styles.actionLabel}>Change password</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.ink25} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionRow} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.bad} style={styles.actionIcon} />
          <Text style={[styles.actionLabel, { color: colors.bad }]}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink90, marginBottom: 18 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.ink10,
    marginBottom: 24,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink90 },
  role: { fontSize: 12.5, color: colors.ink50, marginTop: 2 },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.ink40,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ink10,
    marginBottom: 24,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoLabel: { fontSize: 13.5, color: colors.ink55, fontWeight: "600" },
  infoValue: { fontSize: 13.5, color: colors.ink90, fontWeight: "600", flexShrink: 1, marginLeft: 12 },
  divider: { height: 1, backgroundColor: colors.ink08, marginLeft: 16 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionIcon: { width: 26 },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink90 },
});