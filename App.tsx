import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import SignInScreen from "./src/screens/SignInScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import WalletScreen from "./src/screens/WalletScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function HomeStack() {
  const { colors } = useTheme();
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
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate("EditProfile")}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Edit</Text>
            </TouchableOpacity>
          ),
        })}
      >
        {({ navigation }) => <HomeScreen onEdit={() => navigation.navigate("EditProfile")} />}
      </Stack.Screen>
      <Stack.Screen
        name="EditProfile"
        component={ProfileScreen}
        options={{ title: "Edit profile" }}
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
  const { signOut } = useAuth();
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
  const { token, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) return null;

  if (!token) {
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
  signOut: { borderBottomWidth: 0, borderTopWidth: 1, marginTop: "auto" },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationContainer>
            <>
              <ThemedStatusBar />
              <AppNavigator />
            </>
          </NavigationContainer>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}