import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { Preferences } from '../types';

const WHISPER_FREQUENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'silent', label: 'Silent' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'active', label: 'Active' },
  { value: 'aggressive', label: 'Aggressive' },
];

const DEFAULT_PREFERENCES: Preferences = {
  whisperFrequency: 'active',
  digestTime: '20:00',
  digestEnabled: true,
  defaultMode: 'meeting',
  timezone: 'UTC',
};

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await api.get<Preferences>('preferences');
      if (prefs) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...prefs });
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = useCallback(
    async (updates: Partial<Preferences>) => {
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);
      setIsSaving(true);
      try {
        await api.put('preferences', newPrefs);
      } catch {
        setPreferences(preferences);
        Alert.alert('Error', 'Failed to save preferences');
      } finally {
        setIsSaving(false);
      }
    },
    [preferences]
  );

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        {isSaving && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PROFILE</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          {/* Digest Enabled */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="newspaper-outline" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>Daily Digest</Text>
            </View>
            <Switch
              value={preferences.digestEnabled}
              onValueChange={(value) => savePreferences({ digestEnabled: value })}
              trackColor={{ false: colors.surfaceHover, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          <View style={styles.divider} />

          {/* Whisper Frequency */}
          <View style={styles.settingBlock}>
            <View style={styles.settingInfo}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>Whisper Frequency</Text>
            </View>
            <View style={styles.optionGroup}>
              {WHISPER_FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionPill,
                    preferences.whisperFrequency === opt.value && styles.optionPillActive,
                  ]}
                  onPress={() => savePreferences({ whisperFrequency: opt.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      preferences.whisperFrequency === opt.value && styles.optionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.dangerText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Angel AI v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Built with Expo SDK 54</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingBlock: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  optionGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingLeft: spacing.xl + spacing.sm,
    flexWrap: 'wrap',
  },
  optionPill: {
    backgroundColor: colors.surfaceHover,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionPillActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.primary,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  dangerText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  appInfoText: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  appInfoSubtext: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
  },
});
