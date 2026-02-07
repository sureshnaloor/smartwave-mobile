import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { AppState, type AppStateStatus, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { ProfilePermissionsProvider, useProfilePermissions } from "./src/context/ProfilePermissionsContext";
import SignInScreen from "./src/screens/SignInScreen";
import HomeScreen from "./src/screens/HomeScreen";
import EmployeeHomeScreen from "./src/screens/EmployeeHomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import WalletScreen from "./src/screens/WalletScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import DigitalCardScreen from "./src/screens/DigitalCardScreen";
import QRCodeScreen from "./src/screens/QRCodeScreen";
import PassesScreen from "./src/screens/PassesScreen";
import PassDetailScreen from "./src/screens/PassDetailScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function HomeStack() {
  const { colors } = useTheme();
  const { canEditProfile } = useProfilePermissions();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600", color: colors.text },
      }}
    >
      <Stack.Screen
        name="HomeView"
        options={({ navigation }) => ({
          title: "Home",
          headerRight: () =>
            canEditProfile ? (
              <TouchableOpacity onPress={() => navigation.navigate("EditProfile")}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Edit</Text>
              </TouchableOpacity>
            ) : null,
        })}
      >
        {({ navigation }) =>
          canEditProfile ? (
            <HomeScreen onEdit={() => navigation.navigate("EditProfile")} navigation={navigation} />
          ) : (
            <EmployeeHomeScreen navigation={navigation} />
          )
        }
      </Stack.Screen>
      <Stack.Screen
        name="EditProfile"
        component={ProfileScreen}
        options={{ title: "Edit profile" }}
      />
      <Stack.Screen
        name="DigitalCard"
        component={DigitalCardScreen}
        options={{ title: "Digital Card" }}
      />
      <Stack.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{ title: "QR Code" }}
      />
      <Stack.Screen
        name="Passes"
        component={PassesScreen}
        options={{ title: "Passes & Access" }}
      />
      <Stack.Screen
        name="PassDetail"
        component={PassDetailScreen}
        options={{ title: "Pass Details" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => {
        const drawer = (navigation.getParent() as any)?.getParent?.() ?? navigation.getParent();
        return {
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600", color: colors.text },
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => drawer?.openDrawer?.()}
              style={styles.menuButton}
            >
              <Text style={[styles.menuIcon, { color: colors.text }]}>☰</Text>
            </TouchableOpacity>
          ),
        };
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: "Home", headerShown: false, tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{ title: "Add to Wallet", tabBarLabel: "Wallet" }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: "Settings", tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
}

function CustomDrawerContent({ navigation }: any) {
  const { colors } = useTheme();
  const { signOut, token } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!token) return;
    const loadUnreadCount = async () => {
      try {
        const { getNotifications } = await import("./src/api/client");
        const notifications = await getNotifications(token, false);
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
      } catch (e) {
        // Silently fail - notifications are optional
      }
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  return (
    <View style={[styles.drawer, { backgroundColor: colors.card }]}>
      <View style={styles.drawerContent}>
        <TouchableOpacity
          style={[styles.drawerItem, { borderBottomColor: colors.border }]}
          onPress={() => { navigation.navigate("Main", { screen: "HomeTab" }); navigation.closeDrawer(); }}
        >
          <Text style={[styles.drawerItemText, { color: colors.text }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.drawerItem, { borderBottomColor: colors.border }]}
          onPress={() => {
            navigation.navigate("Main", {
              screen: "HomeTab",
              params: {
                screen: "HomeView",
                params: {
                  screen: "Passes",
                },
              },
            });
            navigation.closeDrawer();
          }}
        >
          <View style={styles.drawerItemWithBadge}>
            <Text style={[styles.drawerItemText, { color: colors.text }]}>Passes & Access</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.drawerItem, { borderBottomColor: colors.border }]}
          onPress={() => {
            navigation.navigate("Main", {
              screen: "HomeTab",
              params: {
                screen: "HomeView",
                params: {
                  screen: "Notifications",
                },
              },
            });
            navigation.closeDrawer();
          }}
        >
          <View style={styles.drawerItemWithBadge}>
            <Text style={[styles.drawerItemText, { color: colors.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.drawerItem, { borderBottomColor: colors.border }]}
          onPress={() => { navigation.navigate("Main", { screen: "WalletTab" }); navigation.closeDrawer(); }}
        >
          <Text style={[styles.drawerItemText, { color: colors.text }]}>Add to Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.drawerItem, { borderBottomColor: colors.border }]}
          onPress={() => { navigation.navigate("Main", { screen: "SettingsTab" }); navigation.closeDrawer(); }}
        >
          <Text style={[styles.drawerItemText, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.drawerItem, styles.signOut, { borderTopColor: colors.border }]}
        onPress={() => { navigation.closeDrawer(); signOut(); }}
      >
        <Text style={[styles.drawerItemText, { color: colors.error }]}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === "dark" ? "light" : "dark"} />;
}

function AppNavigator() {
  const { token, user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show sign-in if no token, or if token exists but user couldn't be loaded (network error, invalid token, etc.)
  if (!token || !user) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600", color: colors.text },
        }}
      >
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: "SmartWave" }} />
      </Stack.Navigator>
    );
  }

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: { width: 280 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Main" component={MainTabs} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  menuButton: { paddingHorizontal: 16, paddingVertical: 8, justifyContent: "center" },
  menuIcon: { fontSize: 22 },
  drawer: { flex: 1, paddingTop: 56 },
  drawerContent: { flex: 1 },
  drawerItem: { padding: 18, borderBottomWidth: 1 },
  drawerItemText: { fontSize: 16 },
  drawerItemWithBadge: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  badgeText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  signOut: { borderBottomWidth: 0, borderTopWidth: 1, marginTop: "auto" },
});

/** Read only the token query param from the Google auth redirect URL. Do not use state, code, or any other param. */
function extractTokenFromUrl(url: string | null): string | null {
  if (!url || !url.includes("token=")) return null;
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    return token ? token.trim() : null;
  } catch {
    return null;
  }
}

function DeepLinkAuthHandler() {
  const { completeSignInWithToken } = useAuth();
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      // Only the token query param from redirect URL; never state, code, or Google token.
      const token = extractTokenFromUrl(url);
      if (token) {
        if (__DEV__) console.warn("[DeepLink] Captured token length:", token.length);
        await completeSignInWithToken(token);
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [completeSignInWithToken]);
  return null;
}

export default function App() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") WebBrowser.maybeCompleteAuthSession();
    });
    return () => sub.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DeepLinkAuthHandler />
        <ThemeProvider>
          <ProfilePermissionsProvider>
          <NavigationContainer>
            <>
              <ThemedStatusBar />
              <AppNavigator />
            </>
          </NavigationContainer>
          </ProfilePermissionsProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}