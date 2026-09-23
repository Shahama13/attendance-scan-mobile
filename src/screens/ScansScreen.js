import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { fetchAttendanceHistory } from "../api/client";
import { colors, radius } from "../theme";

const PAGE_SIZE = 20;

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Every scan the supervisor's campus has ever submitted, in one place —
// the "Recent submissions" list on Home only shows the last handful;
// this is the full, scrollable history, newest first, loaded a page at
// a time from GET /api/attendance (already scoped server-side to the
// supervisor's own campus).
export default function ScansScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [sheets, setSheets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirstPage = useCallback(async () => {
    try {
      const page = await fetchAttendanceHistory({ limit: PAGE_SIZE, offset: 0 });
      setSheets(page.sheets);
      setTotal(page.total);
    } catch (err) {
      console.warn("Failed to load scans:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFirstPage();
  };

  const loadMore = async () => {
    if (loadingMore || sheets.length >= total) return;
    setLoadingMore(true);
    try {
      const page = await fetchAttendanceHistory({ limit: PAGE_SIZE, offset: sheets.length });
      setSheets((prev) => [...prev, ...page.sheets]);
    } catch (err) {
      console.warn("Failed to load more scans:", err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Scans</Text>
        <Text style={styles.subtitle}>
          {user?.campusName || user?.campus_name || "Your campus"} · {total} submission{total === 1 ? "" : "s"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={colors.navy} />
      ) : (
        <FlatList
          data={sheets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 18, paddingTop: 6, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={<Text style={styles.emptyText}>No scans submitted yet.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.navy} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("ScanDetail", { sheetId: item.id, sheetDate: item.sheet_date })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowDate}>{fmtDate(item.sheet_date)}</Text>
                <Text style={styles.rowMeta}>
                  {item.total_present} present
                  {item.submitted_by_name ? ` · scanned by ${item.submitted_by_name}` : ""}
                </Text>
              </View>
              <View style={[styles.pill, item.status === "verified" ? styles.pillGood : styles.pillWarn]}>
                <Text style={[styles.pillText, item.status === "verified" ? styles.pillTextGood : styles.pillTextWarn]}>
                  {item.status === "verified" ? "Verified" : "Pending"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline from useSafeAreaInsets() instead of a fixed
  // number here — see the component body.
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink90 },
  subtitle: { fontSize: 13, color: colors.ink50, marginTop: 4 },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.paper,
    borderRadius: radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.ink08,
  },
  rowDate: { fontSize: 14, fontWeight: "700", color: colors.ink90 },
  rowMeta: { fontSize: 12, color: colors.ink50, marginTop: 3 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10 },
  pillGood: { backgroundColor: colors.goodBg },
  pillWarn: { backgroundColor: colors.warnBg },
  pillText: { fontSize: 11.5, fontWeight: "700" },
  pillTextGood: { color: colors.good },
  pillTextWarn: { color: colors.warn },
  emptyText: { color: colors.ink40, fontSize: 13, textAlign: "center", marginTop: 30 },
});