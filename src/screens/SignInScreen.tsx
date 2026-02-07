import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "../context/AuthContext";
import { GOOGLE_WEB_CLIENT_ID, API_BASE } from "../config";
import { getGoogleAuthStart } from "../api/client";

WebBrowser.maybeCompleteAuthSession();

const ENTERPRISE_HINT =
  "For company (corporate) employees. Sign in with the work email and password provided by your company admin.";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generatePKCE(): Promise<{ code_verifier: string; code_challenge: string }> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const code_verifier = base64UrlEncode(bytes);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    code_verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  const code_challenge = digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { code_verifier, code_challenge };
}

/** Read only the token query param from the redirect URL. Do not use state, code, or Google token. */
function getTokenFromRedirectUrl(url: string): string | null {
  if (!url || !url.includes("token=")) return null;
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (token) return token.trim();
  } catch {
    // Custom scheme URLs (e.g. smartwave://redirect?token=xxx) may not parse in all environments
  }
  // Fallback: extract token= from the string (handles scheme-only and any parsing quirks)
  const match = url.match(/[?&]token=([^&?#]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { signIn, completeSignInWithToken, signInWithApple } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let cancelled = false;
    (async () => {
      try {
        const AppleAuth = await import("expo-apple-authentication");
        const ok = await AppleAuth.default.isAvailableAsync();
        if (!cancelled) setAppleAvailable(ok);
      } catch {
        if (!cancelled) setAppleAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      console.warn("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set; Google sign-in will not work.");
    }
  }, []);

  const handleCredentialsSignIn = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      setError("Google sign-in is not configured.");
      return;
    }
    setError("");
    setGoogleLoading(true);
    try {
      // Use explicit scheme + path so production redirect is well-formed (smartwave://redirect?token=...)
      const returnUrl =
        AuthSession.makeRedirectUri({
          scheme: "smartwave",
          path: "redirect",
        }) || AuthSession.makeRedirectUri();
      if (__DEV__) console.warn("[Google sign-in] returnUrl:", returnUrl);
      const { code_verifier, code_challenge } = await generatePKCE();
      const { authUrl } = await getGoogleAuthStart(returnUrl, code_challenge, code_verifier);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      if (result.type === "success" && result.url) {
        const token = getTokenFromRedirectUrl(result.url);
        if (__DEV__ && token) console.warn("[Google sign-in] Captured token length:", token.length);
        if (token) {
          await completeSignInWithToken(token);
        } else {
          setError("Sign-in completed but no token received.");
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User cancelled
      } else {
        setError("Google sign-in was cancelled or failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError("");
    setAppleLoading(true);
    if (__DEV__) console.log("[Apple Sign-In] Starting…");
    try {
      const AppleAuth = await import("expo-apple-authentication");
      const credential = await AppleAuth.default.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.EMAIL,
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      const identityToken = credential.identityToken ?? null;
      if (identityToken) {
        if (__DEV__) console.log("[Apple Sign-In] Got identity token, calling backend…");
        await signInWithApple(identityToken);
      } else {
        setError("Apple sign-in did not return a token.");
      }
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "ERR_REQUEST_CANCELED") {
        // User cancelled – do nothing
      } else if (code === "ERR_REQUEST_FAILED" || (e as Error).message?.includes("request")) {
        setError(
          "Sign in with Apple failed. Make sure you’re signed into an Apple ID in Settings on this device."
        );
      } else {
        const msg = e instanceof Error ? e.message : "Apple sign-in failed";
        setError(msg);
      }
      if (__DEV__) console.warn("[Apple Sign-In] Error:", e);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>SmartWave</Text>
        <Text style={styles.subtitle}>Choose the option that matches your profile.</Text>

        {/* Corporate / company sign-in */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Corporate sign-in</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Text style={styles.enterpriseHint}>{ENTERPRISE_HINT}</Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={handleCredentialsSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign in with email</Text>
            )}
          </TouchableOpacity>
          <View style={styles.adminHintContainer}>
            <Text style={styles.adminHintTitle}>Admins</Text>
            <Text style={styles.adminHintText}>
              For Admin and Public Admin access to manage corporate profiles, continue on the web admin portal.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.adminButton]}
              onPress={() => WebBrowser.openBrowserAsync(`${API_BASE.replace(/\/$/, "")}/admin/login`)}
            >
              <Text style={styles.buttonText}>Open Admin sign-in (web)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Retail / individual sign-in */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Retail / individual sign-in</Text>
          <Text style={styles.googleHint}>
            Use your personal Google account to access SmartWave.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.buttonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {Platform.OS === "ios" && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, styles.appleButton, (appleLoading || !appleAvailable) && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={appleLoading || !appleAvailable}
            >
              {appleLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.buttonText}>
                    {appleAvailable ? "Continue with Apple" : "Sign in with Apple (device only)"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>Requires an Apple ID signed in on this device (Settings → Apple ID).</Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {__DEV__ && (
          <View style={styles.devHint}>
            <Text style={styles.devHintTitle}>Google OAuth (backend redirect)</Text>
            <Text style={styles.devHintLabel}>Add this exact URI in Google Cloud Console → Credentials → OAuth Web client → Authorized redirect URIs:</Text>
            <Text style={styles.devHintUrl} selectable>
              {`${API_BASE.replace(/\/$/, "")}/api/mobile/auth/google/callback`}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => Clipboard.setStringAsync(`${API_BASE.replace(/\/$/, "")}/api/mobile/auth/google/callback`)}
            >
              <Text style={styles.copyButtonText}>Copy URI</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center" },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#94a3b8", textAlign: "center", marginBottom: 28 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#94a3b8", marginBottom: 10 },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
  },
  enterpriseHint: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  buttonSecondary: { backgroundColor: "#334155" },
  googleButton: { backgroundColor: "#4285F4" },
  appleButton: { backgroundColor: "#000" },
  appleIcon: { color: "#fff", fontSize: 20, fontWeight: "600" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: { color: "#4285F4", fontSize: 16, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#334155" },
  dividerText: { color: "#64748b", paddingHorizontal: 12, fontSize: 14 },
  googleHint: { fontSize: 12, color: "#94a3b8", marginBottom: 12 },
  hint: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 8 },
  error: { color: "#f87171", marginTop: 16, textAlign: "center" },
  devHint: {
    marginTop: 32,
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  devHintTitle: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 6 },
  devHintWarn: { fontSize: 11, color: "#fbbf24", marginBottom: 8, fontWeight: "600" },
  devHintLabel: { fontSize: 11, color: "#64748b", marginBottom: 6 },
  devHintUrl: { fontSize: 11, color: "#3b82f6", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginBottom: 8 },
  copyButton: {
    alignSelf: "flex-start",
    backgroundColor: "#334155",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  copyButtonText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  devHintTerminal: { fontSize: 10, color: "#64748b", fontStyle: "italic" },
});
