import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { submitAttendance } from "../api/client";
import { enqueueSubmission } from "../utils/offlineQueue";
import { colors, radius } from "../theme";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Merge the OCR result's rows with the roster: every active employee gets
// a row (defaulting to absent) even if OCR somehow missed them, and each
// OCR row is matched onto its employee by employeeCode.
function buildInitialRows(roster, ocrRecords) {
  const byCode = new Map(ocrRecords.map((r) => [r.employeeCode, r]));
  return roster.map((emp) => {
    const ocrRow = byCode.get(emp.employee_code);
    return {
      employeeId: emp.id,
      employeeCode: emp.employee_code,
      nameEn: emp.name_en,
      present: ocrRow?.present ?? false,
      signatureDetected: ocrRow?.signatureDetected ?? false,
      signatureMatchScore: ocrRow?.signatureMatchScore ?? null,
      needsReview: ocrRow?.needsReview ?? true, // no OCR match at all -> definitely needs a human look
      nameMatchConfidence: ocrRow?.nameMatchConfidence ?? 0,
    };
  });
}

export default function ReviewScreen({ route, navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { ocrResult, roster, photoUri } = route.params;
  const [rows, setRows] = useState(() => buildInitialRows(roster, ocrResult.records));
  const [submitting, setSubmitting] = useState(false);
  // Pre-fill from what the OCR service read; if it couldn't read a date at
  // all, this starts blank and the supervisor must enter one — either way,
  // this is only ever a convenience check. The backend re-checks against
  // its own clock at submit time regardless of what's shown here.
  const [sheetDate, setSheetDate] = useState(ocrResult.sheetDate?.parsed ?? "");

  const presentCount = useMemo(() => rows.filter((r) => r.present).length, [rows]);
  const absentCount = rows.length - presentCount;
  const dateMatchesToday = sheetDate === todayISO();

  const updateRow = (employeeId, patch) => {
    setRows((prev) => prev.map((r) => (r.employeeId === employeeId ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    if (!dateMatchesToday) return; // belt-and-suspenders — the button is disabled for this too

    const payload = {
      campusId: user.campusId,
      date: sheetDate,
      imageUrl: null, // no object storage wired up yet — see backend README
      records: rows.map((r) => ({
        employeeId: r.employeeId,
        present: r.present,
        signatureDetected: r.signatureDetected,
        signatureMatchScore: r.signatureMatchScore,
      })),
    };

    setSubmitting(true);
    try {
      await submitAttendance(payload);
      // ReviewScreen is a sibling of the "Main" tab navigator in the root
      // stack (not a screen inside it), so a bare "Home" route name won't
      // resolve here — it has to be targeted through the parent stack.
      navigation.navigate("Main", { screen: "Home" });
      Alert.alert("Submitted", `${presentCount} present — sent to the portal.`);
    } catch (err) {
      if (err.isNetworkError) {
        await enqueueSubmission(payload);
        navigation.navigate("Main", { screen: "Home" });
        Alert.alert("Saved offline", "No connection — this sheet will submit automatically once you're back online.");
      } else if (err.status === 409) {
        Alert.alert("Already submitted", "A sheet for this site and date was already submitted.");
      } else if (err.status === 422) {
        // The server's own date check rejected it — this can happen even
        // after the client-side check passed, if the device's clock is
        // wrong. The server's message already explains what it saw.
        Alert.alert("Rejected", err.message || "This sheet's date doesn't match today.");
      } else {
        Alert.alert("Submit failed", err.message || "Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Review extracted data</Text>
        <Text style={styles.subtitle}>Confirm each row, or correct a misread name.</Text>
      </View>

      {!dateMatchesToday && (
        <View style={styles.dateBanner}>
          <Text style={styles.dateBannerTitle}>
            {sheetDate ? "This sheet isn't dated today" : "Couldn't read a date"}
          </Text>
          <Text style={styles.dateBannerText} numberOfLines={2}>
            {sheetDate ? `Reads ${sheetDate}, but today is ${todayISO()}.` : "Enter the date from the sheet's header."}
          </Text>
          <TextInput
            style={styles.dateInput}
            value={sheetDate}
            onChangeText={setSheetDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.ink40}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}

      {/* Compact, single-line status strip — these used to be full paragraph
          banners that, stacked together, could take up half the screen
          before a supervisor ever saw the roster. The detail lives in the
          rows themselves (red border = marked absent) so the strip only
          needs to say "look below", not repeat the explanation. A low
          signature-match score is shown as plain text under a row instead —
          it's informational, not something that needs a border, since a
          low-confidence match can still be a correct "present". */}
      {(ocrResult.totalsMatch === false || absentCount > 0) && (
        <View style={styles.statusStrip}>
          {ocrResult.totalsMatch === false && (
            <View style={styles.statusPillBad}>
              <Text style={styles.statusPillTextBad} numberOfLines={1}>
                Printed total {ocrResult.totalPresentPrinted} ≠ signed {ocrResult.totalPresentComputed}
              </Text>
            </View>
          )}
          {absentCount > 0 && (
            <View style={styles.statusPillWarn}>
              <Text style={styles.statusPillTextWarn} numberOfLines={1}>
                {absentCount} marked absent below
              </Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 12 }}>
        {rows.map((r) => (
          <View
            key={r.employeeId}
            style={[styles.row, !r.present && styles.rowAbsent]}
          >
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.nameEn}</Text>
                <Text style={styles.code}>{r.employeeCode}</Text>
              </View>
              <TouchableOpacity
                style={[styles.presentToggle, r.present ? styles.presentToggleOn : styles.presentToggleOff]}
                onPress={() => updateRow(r.employeeId, { present: !r.present })}
              >
                <Text style={r.present ? styles.presentToggleTextOn : styles.presentToggleTextOff}>
                  {r.present ? "Present" : "Absent"}
                </Text>
              </TouchableOpacity>
            </View>

            {r.present && r.signatureMatchScore != null && (
              <Text style={styles.sigMatch}>
                Signature match ~{Math.round(r.signatureMatchScore * 100)}%
                {r.signatureMatchScore < 0.15 ? " — worth a second look" : ""}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Manpower Present</Text>
          <Text style={styles.totalValue}>{presentCount} / {rows.length}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, (submitting || !dateMatchesToday) && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={submitting || !dateMatchesToday}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {dateMatchesToday ? "Submit to portal" : "Fix the sheet date to submit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline from useSafeAreaInsets() instead of a fixed
  // number here — see the component body.
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink90 },
  subtitle: { fontSize: 13, color: colors.ink50, marginTop: 4 },
  dateBanner: { backgroundColor: colors.badBg, marginHorizontal: 18, borderRadius: radius.sm, padding: 10, marginBottom: 8 },
  dateBannerTitle: { color: colors.bad, fontSize: 13, fontWeight: "700", marginBottom: 3 },
  dateBannerText: { color: colors.bad, fontSize: 12, lineHeight: 15, marginBottom: 7 },
  dateInput: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.bad, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: colors.ink90,
  },
  // A compact single-line pill per issue, not a full paragraph banner —
  // the old version could add up to nearly half the screen height before
  // any of the roster was visible. The pill just says "something needs a
  // look"; the row itself (amber border) carries the actual detail.
  statusStrip: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 18, marginBottom: 8 },
  statusPillBad: { backgroundColor: colors.badBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillTextBad: { color: colors.bad, fontSize: 11.5, fontWeight: "600" },
  statusPillWarn: { backgroundColor: colors.warnBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillTextWarn: { color: colors.warn, fontSize: 11.5, fontWeight: "600" },
  list: { flex: 1, paddingHorizontal: 18, marginTop: 6 },
  row: {
    backgroundColor: colors.paper, borderRadius: radius.md, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.ink08,
  },
  // Absent is the only thing that gets a visible border now — a low
  // signature-match score is shown as text under the row instead (see
  // sigMatch below), since it doesn't by itself mean anything is wrong.
  rowAbsent: { opacity: 0.7, borderColor: colors.bad, borderWidth: 1.5 },
  rowTop: { flexDirection: "row", alignItems: "flex-start" },
  name: { fontSize: 13.5, fontWeight: "700", color: colors.ink90 },
  code: { fontSize: 11.5, color: colors.ink40, marginTop: 2 },
  presentToggle: { borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  presentToggleOn: { backgroundColor: colors.goodBg },
  presentToggleOff: { backgroundColor: colors.badBg },
  presentToggleTextOn: { color: colors.good, fontWeight: "700", fontSize: 12 },
  presentToggleTextOff: { color: colors.bad, fontWeight: "700", fontSize: 12 },
  sigMatch: { fontSize: 11.5, color: colors.ink45, marginTop: 8 },
  footer: {
    padding: 18, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.ink10, backgroundColor: colors.paper,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  totalLabel: { fontSize: 13.5, fontWeight: "600", color: colors.ink70 },
  totalValue: { fontSize: 13.5, fontWeight: "700", color: colors.ink90 },
  submitButton: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  submitButtonDisabled: { backgroundColor: colors.ink25 },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});