import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/colors';

const SECTIONS = [
  {
    title: null,
    content:
      'Your Privacy Matters:\nStatFlow is designed to respect your privacy. Your stats, data, and activity remain on your device unless you choose to share them.',
  },
  {
    title: '1. Information We Collect',
    content: null,
    subsections: [
      {
        title: '1.1 Personal Information',
        body: 'StatFlow does not require you to create an account or provide personal information such as your name or email to use the app.',
      },
      {
        title: '1.2 App Data',
        bullets: [
          'Storage: Player stats, game data, and app settings are stored locally on your device.',
          'No Required Cloud Storage: Your data is not automatically uploaded to external servers.',
          'Your Control: You can edit, export, or delete your data at any time.',
        ],
      },
      {
        title: '1.3 Device Permissions',
        body: 'StatFlow may request access to device features such as storage. These permissions are only used to support app functionality and are fully controlled by you.',
      },
    ],
  },
  {
    title: '2. Advertising and App Tracking Transparency',
    content: null,
    subsections: [
      {
        title: '2.1 How We Use Ads',
        body: 'StatFlow is supported by ads. We use Google AdMob to display advertisements within the app.',
      },
      {
        title: '2.2 App Tracking Transparency (ATT)',
        body: 'StatFlow will request permission before tracking your activity across apps and websites.\n\nIf you allow tracking:\nAds may be personalized using your device identifier (IDFA).\n\nIf you deny tracking:\nYou will still see ads, but they will be non-personalized.',
      },
      {
        title: '2.3 What AdMob May Collect',
        bullets: [
          'Device advertising identifier (IDFA)',
          'IP address or approximate location',
          'Device type and OS version',
          'App usage and ad interactions',
        ],
        footer: 'This data is handled by Google.',
        link: {
          label: 'Google Privacy Policy',
          url: 'https://policies.google.com/privacy',
        },
      },
    ],
  },
  {
    title: '3. Data Storage and Security',
    content: null,
    subsections: [
      {
        title: '3.1 Local Data',
        body: 'Your stats and app data are stored locally on your device.',
      },
      {
        title: '3.2 Data Deletion',
        bullets: [
          'You can delete your data in the app.',
          'Deleting the app removes all stored data.',
        ],
      },
    ],
  },
  {
    title: '4. Third-Party Services',
    content: null,
    subsections: [
      {
        title: '4.1 Google AdMob',
        body: 'StatFlow uses Google AdMob for ads.',
        link: {
          label: 'Google Privacy Policy',
          url: 'https://policies.google.com/privacy',
        },
      },
      {
        title: '4.2 No Additional Tracking',
        body: 'We do not use additional third-party tracking services.',
      },
    ],
  },
  {
    title: "5. Children's Privacy",
    content:
      'StatFlow does not knowingly collect personal information from children under 13.',
  },
  {
    title: '6. Your Rights',
    content: 'We do not store personal data on our servers.',
  },
  {
    title: '7. Changes to This Policy',
    content: 'We may update this policy as the app evolves.',
  },
  {
    title: '8. Contact',
    content: 'Christian App Empire LLC',
    email: 'ChristianAppEmpire@gmail.com',
  },
];

function LinkButton({ label, url }: { label: string; url: string }) {
  return (
    <TouchableOpacity
      onPress={() => {
        void Linking.openURL(url);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.link}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSubtitle}>
          StatFlow — Track Stats with Purpose
        </Text>
      </View>

      {SECTIONS.map((section, idx) => (
        <View key={idx} style={styles.sectionCard}>
          {section.title && (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}

          {section.content && (
            <Text style={styles.bodyText}>{section.content}</Text>
          )}

          {section.email && (
            <TouchableOpacity
              onPress={() => {
                void Linking.openURL(`mailto:${section.email}`);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.emailLink}>{section.email}</Text>
            </TouchableOpacity>
          )}

          {'subsections' in section &&
            section.subsections?.map((sub, sIdx) => (
              <View key={sIdx} style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{sub.title}</Text>
                {'body' in sub && sub.body && (
                  <Text style={styles.bodyText}>{sub.body}</Text>
                )}
                {'bullets' in sub &&
                  sub.bullets?.map((bullet, bIdx) => (
                    <View key={bIdx} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                {'footer' in sub && sub.footer && (
                  <Text style={styles.footerNote}>{sub.footer}</Text>
                )}
                {'link' in sub && sub.link && (
                  <LinkButton label={sub.link.label} url={sub.link.url} />
                )}
              </View>
            ))}
        </View>
      ))}

      <Text style={styles.lastUpdated}>Last Updated: April 2026</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 12,
  },
  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.gold,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.gold,
    marginBottom: 12,
  },
  subsection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  footerNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  link: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '600' as const,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  emailLink: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '600' as const,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});
