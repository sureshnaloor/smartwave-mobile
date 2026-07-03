import { Alert, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { getPublicProfileUrl } from "../config";

export function buildPublicProfileUrl(shorturl: string | null | undefined): string | null {
  if (!shorturl?.trim()) return null;
  return getPublicProfileUrl(shorturl.trim());
}

export async function openPublicProfile(shorturl: string | null | undefined): Promise<boolean> {
  const url = buildPublicProfileUrl(shorturl);
  if (!url) {
    Alert.alert(
      "Profile link not ready",
      "Your public profile link is still being set up. Save your profile on the web app or try again shortly."
    );
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Error", "Could not open your profile link.");
      return false;
    }
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      enableBarCollapsing: true,
    });
    return true;
  } catch {
    Alert.alert("Error", "Could not open your profile in the browser.");
    return false;
  }
}

export async function copyPublicProfileLink(shorturl: string | null | undefined): Promise<boolean> {
  const url = buildPublicProfileUrl(shorturl);
  if (!url) {
    Alert.alert(
      "Profile link not ready",
      "Your public profile link is still being set up. Try again shortly."
    );
    return false;
  }
  await Clipboard.setStringAsync(url);
  Alert.alert("Copied", "Profile link copied to clipboard.");
  return true;
}
