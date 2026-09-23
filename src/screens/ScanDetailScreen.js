import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAttendanceSheet } from "../api/client";
import { colors, radius } from "../theme";

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Read-only view of one previously-submitted scan — what a "View all
// scans" row opens into. There's no edit here on purpose: the backend
// has no endpoint to change a sheet after submission (only admin/HR can
// verify it), so this is strictly "what did I already send in."
export default function ScanDetailScreen({ route, navigation }) {
  const { sheetId, sheetDate } = route.params;
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAttendanceSheet(sheetId);
      setSheet(data);
    } catch (err) {
      setError(err.message || "Could not load this scan.");
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{"‹ Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{fmtDate(sheet?.sheet_date || sheetDate)}</Text>
        {sheet && <Text style={styles.subtitle}>{sheet.campus_name}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={colors.navy} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total present</Text>
              <Text style={styles.summaryValue}>{sheet.total_present}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Status</Text>
              <View style={[styles.pill, sheet.status === "verified" ? styles.pillGood : styles.pillWarn]}>
                <Text style={[styles.pillText, sheet.status === "verified" ? styles.pillTextGood : styles.pillTextWarn]}>
                  {sheet.status === "verified" ? "Verified" : "Pending review"}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Submitted</Text>
              <Text style={styles.summaryValueSmall}>{fmtTime(sheet.submitted_at)}</Text>
            </View>
            {sheet.verified_at && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Verified</Text>
                <Text style={styles.summaryValueSmall}>{fmtTime(sheet.verified_at)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.listTitle}>Employees ({sheet.records.length})</Text>
          <FlatList
            data={sheet.records}
            keyExtractor={(item) => String(item.employee_id)}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={[styles.row, !item.present && styles.rowAbsent]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name_en}</Text>
                  <Text style={styles.code}>{item.employee_code}</Text>
                </View>
                {item.present ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.times}>
                      {item.clock_in?.slice(0, 5) || "--:--"} – {item.clock_out?.slice(0, 5) || "--:--"}
                    </Text>
                    {item.signature_match_score != null && (
                      <Text style={styles.sigScore}>
                        signature match {Math.round(item.signature_match_score * 100)}%
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.absentLabel}>Absent</Text>
                )}
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline from useSafeAreaInsets() instead of a fixed
  // number here — see the component body.
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, marginBottom: 12 },
  back: { color: colors.ink50, fontSize: 14, fontWeight: "600", marginBottom: 10 },
  title: { fontSize: 19, fontWeight: "700", color: colors.ink90 },
  subtitle: { fontSize: 13, color: colors.ink50, marginTop: 2 },
  errorBox: { paddingHorizontal: 18, marginTop: 20 },
  errorText: { color: colors.bad, fontSize: 13.5, marginBottom: 12 },
  retryButton: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 11, alignItems: "center" },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  summaryCard: {
    marginHorizontal: 18, backgroundColor: colors.paper, borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: colors.ink10, marginBottom: 18,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  summaryLabel: { fontSize: 12.5, color: colors.ink50, fontWeight: "600" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: colors.ink90 },
  summaryValueSmall: { fontSize: 13, color: colors.ink70, fontWeight: "600" },
  listTitle: { fontSize: 13.5, fontWeight: "700", color: colors.ink70, marginBottom: 10, paddingHorizontal: 18 },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.paper,
    borderRadius: radius.sm, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.ink08,
  },
  rowAbsent: { opacity: 0.55 },
  name: { fontSize: 13.5, fontWeight: "700", color: colors.ink90 },
  code: { fontSize: 11.5, color: colors.ink40, marginTop: 2 },
  times: { fontSize: 12.5, color: colors.ink70, fontWeight: "600" },
  sigScore: { fontSize: 10.5, color: colors.ink45, marginTop: 3 },
  absentLabel: { fontSize: 12.5, color: colors.bad, fontWeight: "700" },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillGood: { backgroundColor: colors.goodBg },
  pillWarn: { backgroundColor: colors.warnBg },
  pillText: { fontSize: 11.5, fontWeight: "700" },
  pillTextGood: { color: colors.good },
  pillTextWarn: { color: colors.warn },
});