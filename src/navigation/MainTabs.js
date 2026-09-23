import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import ScansScreen from "../screens/ScansScreen";
import AccountScreen from "../screens/AccountScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

// Maps each tab's route name to its base Ionicons name — the actual icon
// swaps to the filled variant when that tab is focused (see tabBarIcon
// below), which is the usual iOS/Android convention for a bottom tab bar.
const TAB_ICONS = {
  Home: "home",
  Scans: "document-text",
  Account: "person",
};

// The three places a supervisor actually needs to go, always one tap
// away instead of buried behind links in a screen header: today's task,
// the full submission history, and their own account (site/campus,
// change password, log out). Capture/Review/ScanDetail/ChangePassword
// stay as full-screen pushes on top of this (see RootNavigator.js) since
// they're either a focused single task or a drill-into-detail, not a
// place a supervisor "lives."
export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.ink40,
        tabBarStyle: {
          borderTopColor: colors.ink10,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: "600" },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={`${TAB_ICONS[route.name]}${focused ? "" : "-outline"}`} size={21} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scans" component={ScansScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}