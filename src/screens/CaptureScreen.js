import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { scanSheet, fetchRoster } from "../api/client";
import { colors, radius } from "../theme";

export default function CaptureScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState(null);
  const [scanning, setScanning] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Enable camera access to scan the attendance sheet.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
      exif: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo library permission needed", "Enable photo access to select an existing scan.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const analyze = async () => {
    if (!photo) return;
    setScanning(true);
    try {
      const [ocrResult, roster] = await Promise.all([
        scanSheet({
          campusId: user.campusId,
          photoUri: photo.uri,
          fileName: photo.fileName || "sheet.jpg",
          mimeType: photo.mimeType || "image/jpeg",
        }),
        fetchRoster(user.campusId),
      ]);
      navigation.navigate("Review", { ocrResult, roster, photoUri: photo.uri });
    } catch (err) {
      Alert.alert("Couldn't read the sheet", err.message || "Try retaking the photo with better lighting.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.title}>Scan today's sheet</Text>
      <Text style={styles.subtitle}>
        Lay the signed {user?.campusName || user?.campus_name} sheet flat, fill the frame, and keep the camera steady.
      </Text>

      <View style={styles.previewBox}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <Text style={styles.previewPlaceholder}>No photo yet</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto} disabled={scanning}>
          <Text style={styles.secondaryButtonText}>{photo ? "Retake" : "Open camera"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButtonOutline} onPress={pickFromLibrary} disabled={scanning}>
          <Text style={styles.secondaryButtonOutlineText}>Choose photo</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (!photo || scanning) && styles.primaryButtonDisabled]}
        onPress={analyze}
        disabled={!photo || scanning}
      >
        {scanning ? (
          <View style={styles.row}>
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Reading sheet…</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Analyze sheet</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline from useSafeAreaInsets() instead of a fixed
  // number here — see the component body.
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  title: { fontSize: 19, fontWeight: "700", color: colors.ink90, marginBottom: 6 },
  subtitle: { fontSize: 13.5, color: colors.ink50, marginBottom: 20, lineHeight: 19 },
  previewBox: {
    height: 320, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.ink15,
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: colors.paper,
    marginBottom: 18, overflow: "hidden",
  },
  preview: { width: "100%", height: "100%" },
  previewPlaceholder: { color: colors.ink40, fontSize: 13.5 },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  secondaryButton: {
    flex: 1, backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center",
  },
  secondaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  secondaryButtonOutline: {
    flex: 1, borderWidth: 1, borderColor: colors.ink20 || colors.ink15, borderRadius: radius.sm,
    paddingVertical: 12, alignItems: "center", backgroundColor: colors.paper,
  },
  secondaryButtonOutlineText: { color: colors.ink70, fontWeight: "700", fontSize: 13.5 },
  primaryButton: { backgroundColor: colors.amber, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.navy, fontWeight: "800", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center" },
});