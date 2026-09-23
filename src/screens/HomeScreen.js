import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { fetchAttendanceHistory } from "../api/client";
import { flushQueue, getQueueSize } from "../utils/offlineQueue";
import { colors, radius } from "../theme";

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStartISO = () => todayISO().slice(0, 8) + "01";
const dayOfMonth = () => Number(todayISO().slice(8, 10));

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Identity (name/role), assignment (site/campus), and settings all moved
// to the Account tab — this screen is deliberately just "what do I need
// to do today, and is this month on track," not a second place to see
// who's logged in.
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [todaysSheet, setTodaysSheet] = useState(null);
  const [monthSubmitted, setMonthSubmitted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      await flushQueue(); // silently retry any offline-queued sheets whenever the screen is opened
      const [todayPage, monthPage, qSize] = await Promise.all([
        fetchAttendanceHistory({ from: todayISO(), to: todayISO(), limit: 1 }),
        // Only the count is needed for the "this month" stat below, so
        // limit: 1 avoids pulling every sheet's full row just to total them.
        fetchAttendanceHistory({ from: monthStartISO(), to: todayISO(), limit: 1 }),
        getQueueSize(),
      ]);
      setTodaysSheet(todayPage.sheets[0] || null);
      setMonthSubmitted(monthPage.total);
      setQueueSize(qSize);
    } catch (err) {
      // A load failure shouldn't block the supervisor from scanning today's sheet.
      console.warn("Failed to load home summary:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const syncNow = async () => {
    setSyncing(true);
    try {
      const result = await flushQueue();
      if (result.submitted > 0 || result.dropped > 0) {
        Alert.alert(
          "Sync complete",
          `${result.submitted} sheet(s) submitted.` +
            (result.dropped > 0 ? ` ${result.dropped} could not be submitted and were removed.` : "") +
            (result.remaining > 0 ? ` ${result.remaining} still waiting for a connection.` : "")
        );
      } else if (result.remaining > 0) {
        Alert.alert("Still offline", "Could not reach the server yet — will keep trying.");
      }
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const daysElapsed = dayOfMonth();
  const monthPct = Math.max(0, Math.min(100, Math.round((monthSubmitted / daysElapsed) * 100)));
  const firstName = (user?.fullName || user?.full_name || "").split(" ")[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.greeting}>
        {greeting()}
        {firstName ? `, ${firstName}` : ""}
      </Text>

      {queueSize > 0 && (
        <TouchableOpacity style={styles.queueBanner} onPress={syncNow} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator color={colors.warn} />
          ) : (
            <Text style={styles.queueBannerText}>
              {queueSize} sheet{queueSize > 1 ? "s" : ""} waiting to sync — tap to retry
            </Text>
          )}
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />
      ) : (
        <>
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>Today — {fmtDate(todayISO())}</Text>
            {todaysSheet ? (
              <>
                <Text style={styles.todayStatus}>Submitted · {todaysSheet.total_present} present</Text>
                <Text style={styles.todaySub}>
                  {todaysSheet.status === "verified" ? "Verified by admin" : "Waiting on admin review"}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.todayStatusPending}>Not submitted yet</Text>
                <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate("Capture")}>
                  <Text style={styles.scanButtonText}>Scan today's sheet</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.monthCard}>
            <View style={styles.monthHeaderRow}>
              <Text style={styles.monthLabel}>This month</Text>
              <Text style={styles.monthValue}>
                {monthSubmitted} / {daysElapsed} days
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${monthPct}%` }]} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline from useSafeAreaInsets() instead of a fixed
  // number here — see the component body.
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  greeting: { fontSize: 20, fontWeight: "700", color: colors.ink90, marginBottom: 18 },
  queueBanner: {
    backgroundColor: colors.warnBg, borderRadius: radius.sm, padding: 12, marginBottom: 14,
    alignItems: "center",
  },
  queueBannerText: { color: colors.warn, fontWeight: "600", fontSize: 13 },
  todayCard: {
    backgroundColor: colors.paper, borderRadius: radius.lg, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: colors.ink10,
  },
  todayLabel: { fontSize: 12.5, color: colors.ink50, fontWeight: "600", marginBottom: 6 },
  todayStatus: { fontSize: 17, fontWeight: "700", color: colors.good },
  todayStatusPending: { fontSize: 17, fontWeight: "700", color: colors.ink70, marginBottom: 14 },
  todaySub: { fontSize: 13, color: colors.ink45, marginTop: 2 },
  scanButton: { backgroundColor: colors.amber, borderRadius: radius.sm, paddingVertical: 13, alignItems: "center" },
  scanButtonText: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  monthCard: {
    backgroundColor: colors.paper, borderRadius: radius.lg, padding: 18,
    borderWidth: 1, borderColor: colors.ink10,
  },
  monthHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  monthLabel: { fontSize: 12.5, color: colors.ink50, fontWeight: "600" },
  monthValue: { fontSize: 13, color: colors.ink70, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.ink10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: colors.amber },
});