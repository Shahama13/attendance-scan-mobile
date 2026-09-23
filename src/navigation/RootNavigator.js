import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

import LoginScreen from "../screens/LoginScreen";
import MainTabs from "./MainTabs";
import CaptureScreen from "../screens/CaptureScreen";
import ReviewScreen from "../screens/ReviewScreen";
import ScanDetailScreen from "../screens/ScanDetailScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            {/* Home / Scans / Account live inside the bottom tab bar —
                everywhere else in this stack (Capture, Review, ScanDetail,
                ChangePassword) is a focused single task or a drill-into-
                detail, pushed on top of the tabs rather than being a tab
                itself. A screen inside MainTabs can navigate straight to
                any of these by name (e.g. navigation.navigate("Capture"))
                — React Navigation bubbles an unmatched route name up to
                the parent stack automatically. */}
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Capture" component={CaptureScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="Review" component={ReviewScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="ScanDetail" component={ScanDetailScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ presentation: "modal" }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}