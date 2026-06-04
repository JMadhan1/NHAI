import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, Dimensions, StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import { getUserCount, getPendingCount, getSuccessfulAuthCount, getAuthAttemptCount } from '../services/StorageService';
import type { RootState } from '../store/store';

const { width } = Dimensions.get('window');

interface Props {
  onNavigate: (screen: string) => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const PulseDot: React.FC<{ color: string }> = ({ color }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.7, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 10, height: 10, borderRadius: 5,
        backgroundColor: color, opacity: 0.25, transform: [{ scale: anim }],
      }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
};

const AnimatedStatCard: React.FC<{
  label: string; val: string; color: string; index: number;
}> = ({ label, val, color, index }) => {
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 8,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <Text style={[styles.statNum, { color }]}>{val}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </Animated.View>
  );
};

const ActionCard: React.FC<{
  icon: string; label: string; sub: string; accent: string; onPress: () => void; index: number;
}> = ({ icon, label, sub, accent, onPress, index }) => {
  const sc = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 80),
      Animated.parallel([
        Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.cardHalf,
        {
          opacity: fadeAnim,
          transform: [
            { scale: sc },
            { rotateY: rotateAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={() => Animated.spring(sc, { toValue: 0.92, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
          <Text style={styles.cardIconText}>{icon}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
        <View style={[styles.cardArrow, { backgroundColor: accent + '18' }]}>
          <Text style={[styles.cardArrowText, { color: accent }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedEngineRow: React.FC<{
  icon: string;
  label: string;
  status: string;
  color: string;
  index: number;
  hasBorder: boolean;
}> = ({ icon, label, status, color, index, hasBorder }) => {
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 120),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.engineRow,
        hasBorder && styles.engineRowBorder,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <Text style={styles.engineIcon}>{icon}</Text>
      <Text style={styles.engineLabel}>{label}</Text>
      <View style={[styles.engineBadge, { borderColor: color + '55', backgroundColor: color + '15' }]}>
        <Text style={[styles.engineStatus, { color }]}>{status}</Text>
      </View>
    </Animated.View>
  );
};

const AnimatedPrimaryButton: React.FC<{
  icon: string;
  title: string;
  sub: string;
  onPress: () => void;
  style?: any;
  iconBgColor?: string;
  arrowBgColor?: string;
  arrowColor?: string;
  titleColor?: string;
}> = ({
  icon,
  title,
  sub,
  onPress,
  style,
  iconBgColor = 'rgba(255,255,255,0.18)',
  arrowBgColor = 'rgba(255,255,255,0.2)',
  arrowColor = '#fff',
  titleColor = '#fff',
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={style}
        onPress={onPress}
        activeOpacity={0.88}
      >
        <View style={styles.primaryLeft}>
          <View style={[styles.primaryIcon, { backgroundColor: iconBgColor }]}>
            <Text style={{ fontSize: 26 }}>{icon}</Text>
          </View>
          <View>
            <Text style={[styles.primaryTitle, { color: titleColor }]}>{title}</Text>
            <Text style={styles.primarySub}>{sub}</Text>
          </View>
        </View>
        <View style={[styles.primaryArrow, { backgroundColor: arrowBgColor }]}>
          <Text style={[styles.primaryArrowText, { color: arrowColor }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedAlertBanner: React.FC<{
  count: number;
  onPress: () => void;
}> = ({ count, onPress }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: bounceAnim }],
      }}
    >
      <TouchableOpacity style={styles.alertBanner} onPress={onPress}>
        <View style={styles.alertLeft}>
          <PulseDot color="#FFB300" />
          <Text style={styles.alertText}>{count} record{count !== 1 ? 's' : ''} waiting to sync</Text>
        </View>
        <Text style={styles.alertAction}>Sync →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const HomeScreen: React.FC<Props> = ({ onNavigate }) => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [successRate, setSuccessRate] = useState('–');
  const [totalAuth, setTotalAuth] = useState(0);
  const isOnline = useSelector((s: RootState) => s.sync.isOnline);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
    ]).start();

    const rotateInterval = setInterval(() => {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();
    }, 8100);

    return () => clearInterval(rotateInterval);
  }, [fadeAnim, scaleAnim, rotateAnim]);

  const loadStats = useCallback(async () => {
    try {
      const [users, pending, total, success] = await Promise.all([
        getUserCount(), getPendingCount(), getAuthAttemptCount(), getSuccessfulAuthCount(),
      ]);
      setEnrolledCount(users);
      setPendingSync(pending);
      setTotalAuth(total);
      setSuccessRate(total > 0 ? `${Math.round((success / total) * 100)}%` : '–');
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDate(now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.brandGroup}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLogoText}>V</Text>
            </View>
            <View>
              <Text style={styles.brandName}>VisorAI</Text>
              <Text style={styles.brandTag}>VISION · IDENTITY · SECURITY</Text>
            </View>
          </View>
          <View style={styles.topRight}>
            <View style={styles.netBadge}>
              <PulseDot color={isOnline ? '#00E676' : '#FFB300'} />
              <Text style={[styles.netText, { color: isOnline ? '#00E676' : '#FFB300' }]}>
                {isOnline ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
            <TouchableOpacity style={styles.gearBtn} onPress={() => onNavigate('Settings')}>
              <Text style={styles.gearIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* HERO CARD */}
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.heroGreeting}>{getGreeting().toUpperCase()}</Text>
            <Text style={styles.heroTitle}>Security Console</Text>
          </View>
          <Text style={styles.heroClock}>{time}</Text>
          <Text style={styles.heroDate}>{date}</Text>
          <View style={styles.heroGlow} />
        </Animated.View>

        {/* STATS */}
        <View style={styles.statsRow}>
          {[
            { label: 'ENROLLED', val: `${enrolledCount}`, color: '#00D4FF' },
            { label: 'SUCCESS', val: successRate, color: '#00E676' },
            { label: 'PENDING', val: `${pendingSync}`, color: pendingSync > 0 ? '#FFB300' : '#fff' },
            { label: 'AUTH TOTAL', val: `${totalAuth}`, color: '#fff' },
          ].map((item, idx) => (
            <AnimatedStatCard key={item.label} label={item.label} val={item.val} color={item.color} index={idx} />
          ))}
        </View>

        {/* PRIMARY — AUTHENTICATE */}
        <AnimatedPrimaryButton
          icon="🔐"
          title="Authenticate Face"
          sub="Liveness · 192D matching · AES-256"
          onPress={() => onNavigate('Auth')}
          style={styles.primaryBtn}
        />

        {/* EMPLOYEE DASHBOARD — SECONDARY PRIMARY */}
        <AnimatedPrimaryButton
          icon="👤"
          title="Employee Dashboard"
          sub="Leave · Attendance · Check-in / Check-out"
          onPress={() => onNavigate('EmployeeDashboard')}
          style={styles.empBtn}
          iconBgColor="rgba(123,47,255,0.18)"
          arrowBgColor="rgba(123,47,255,0.2)"
          arrowColor="#C4B5FD"
          titleColor="#C4B5FD"
        />

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actionGrid}>
          <ActionCard icon="➕" label="Enroll User" sub="Register new face" accent="#7B2FFF" onPress={() => onNavigate('Enroll')} index={0} />
          <ActionCard icon="📋" label="Auth Log" sub="View history" accent="#00D4FF" onPress={() => onNavigate('History')} index={1} />
          <ActionCard icon="🛡️" label="Admin Panel" sub="Sync & manage" accent="#FF6B35" onPress={() => onNavigate('Admin')} index={2} />
          <ActionCard icon="👥" label="Manage Staff" sub="All employees" accent="#00E676" onPress={() => onNavigate('EmployeeManagement')} index={3} />
        </View>

        {/* NEURAL ENGINE */}
        <Text style={styles.sectionLabel}>NEURAL ENGINE STATUS</Text>
        <View style={styles.engineCard}>
          {[
            { icon: '🧠', label: 'BlazeFace Detection', status: 'ACTIVE', color: '#00E676' },
            { icon: '🔬', label: 'MobileFaceNet 192D', status: 'ACTIVE', color: '#00E676' },
            { icon: '👁️', label: 'Liveness Anti-Spoof', status: 'ACTIVE', color: '#00E676' },
            { icon: '🔒', label: 'AES-256 SQLCipher', status: 'SECURE', color: '#00D4FF' },
            { icon: '☁️', label: 'AWS Sync Bridge', status: isOnline ? 'ONLINE' : 'STANDBY', color: isOnline ? '#00E676' : '#FFB300' },
          ].map((item, i) => (
            <AnimatedEngineRow
              key={i}
              icon={item.icon}
              label={item.label}
              status={item.status}
              color={item.color}
              index={i}
              hasBorder={i < 4}
            />
          ))}
        </View>

        {/* PENDING SYNC ALERT */}
        {pendingSync > 0 && (
          <AnimatedAlertBanner count={pendingSync} onPress={() => onNavigate('Admin')} />
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerMain}>VisorAI · Hackathon 7.0</Text>
          <Text style={styles.footerBuilt}>Built by J Madhan</Text>
          <Text style={styles.footerSub}>Powered by TFLite · SQLCipher · React Native</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const CARD_BG = 'rgba(13,21,48,0.95)';
const BORDER = 'rgba(255,255,255,0.07)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050B18' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#00D4FF22', borderWidth: 1.5, borderColor: '#00D4FF55',
    justifyContent: 'center', alignItems: 'center',
  },
  brandLogoText: { fontSize: 18, fontWeight: '900', color: '#00D4FF' },
  brandName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  brandTag: { fontSize: 8, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  netBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: CARD_BG, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
  },
  netText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  gearBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  gearIcon: { fontSize: 16, color: '#718096' },

  heroCard: {
    backgroundColor: CARD_BG, borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', overflow: 'hidden',
  },
  heroGreeting: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 12 },
  heroClock: { fontSize: 40, fontWeight: '300', color: '#fff', fontVariant: ['tabular-nums'], letterSpacing: 2, marginBottom: 4 },
  heroDate: { fontSize: 12, color: '#4A5568' },
  heroGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,212,255,0.06)',
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  statNum: { fontSize: 20, fontWeight: '900', color: '#00D4FF', marginBottom: 3 },
  statLbl: { fontSize: 7, color: '#4A5568', fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0062FF', borderRadius: 18, padding: 18, marginBottom: 10,
    shadowColor: '#0062FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 12,
  },
  empBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a0a3a', borderRadius: 18, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(123,47,255,0.3)',
    shadowColor: '#7B2FFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  primaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  primaryIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  primaryTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  primarySub: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  primaryArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  primaryArrowText: { fontSize: 22, color: '#fff', marginTop: -2 },

  sectionLabel: { fontSize: 10, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  cardHalf: { width: (width - 32 - 10) / 2 },
  card: {
    backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  cardIconWrap: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 18 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardSub: { fontSize: 10, color: '#4A5568' },
  cardArrow: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  cardArrowText: { fontSize: 18, marginTop: -2 },

  engineCard: {
    backgroundColor: CARD_BG, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, marginBottom: 20,
  },
  engineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  engineRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  engineIcon: { fontSize: 17, width: 24, textAlign: 'center' },
  engineLabel: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  engineBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  engineStatus: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,179,0,0.08)', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,179,0,0.25)',
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  alertText: { fontSize: 13, color: '#FFB300', fontWeight: '600' },
  alertAction: { fontSize: 12, color: '#FFB300', fontWeight: '800' },

  footer: { alignItems: 'center', paddingTop: 8, gap: 3 },
  footerDivider: { width: 40, height: 1, backgroundColor: '#1E2840', marginBottom: 8 },
  footerMain: { fontSize: 11, color: '#2D3748', fontWeight: '600', letterSpacing: 0.5 },
  footerBuilt: { fontSize: 12, color: '#4A5568', fontWeight: '700', letterSpacing: 0.5 },
  footerSub: { fontSize: 10, color: '#1E2840' },
});
