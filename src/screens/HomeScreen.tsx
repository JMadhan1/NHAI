import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import { getUserCount, getPendingCount, getSuccessfulAuthCount, getAuthAttemptCount } from '../services/StorageService';
import type { RootState } from '../store/store';

const { width } = Dimensions.get('window');

interface Props {
  onNavigate: (screen: string) => void;
}

function getGreeting(): string {
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
        Animated.timing(anim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: color, opacity: 0.3,
          transform: [{ scale: anim }],
          position: 'absolute',
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
};

const ActionCard: React.FC<{
  icon: string;
  label: string;
  sub: string;
  accent: string;
  onPress: () => void;
  wide?: boolean;
}> = ({ icon, label, sub, accent, onPress, wide }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, wide ? styles.cardWide : styles.cardHalf]}>
      <TouchableOpacity
        style={[styles.card, wide && styles.cardWideInner]}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
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

export const HomeScreen: React.FC<Props> = ({ onNavigate }) => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [successRate, setSuccessRate] = useState('–');
  const [totalAuth, setTotalAuth] = useState(0);
  const isOnline = useSelector((s: RootState) => s.sync.isOnline);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [headerAnim]);

  const loadStats = useCallback(async () => {
    try {
      const [users, pending, total, success] = await Promise.all([
        getUserCount(),
        getPendingCount(),
        getAuthAttemptCount(),
        getSuccessfulAuthCount(),
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
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050B18" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── TOP BAR ── */}
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
          <View style={styles.topBarRight}>
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

        {/* ── HERO CLOCK CARD ── */}
        <Animated.View style={[styles.heroCard, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroGreeting}>{getGreeting()}</Text>
            <Text style={styles.heroTitle}>Security Console</Text>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroClock}>{time}</Text>
            <Text style={styles.heroDate}>{date}</Text>
          </View>
          <View style={styles.heroGlow} />
        </Animated.View>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Text style={styles.statNum}>{enrolledCount}</Text>
            <Text style={styles.statLbl}>ENROLLED</Text>
          </View>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={[styles.statNum, { color: '#00E676' }]}>{successRate}</Text>
            <Text style={styles.statLbl}>SUCCESS</Text>
          </View>
          <View style={[styles.statCard, pendingSync > 0 ? styles.statCardOrange : styles.statCardDim]}>
            <Text style={[styles.statNum, { color: pendingSync > 0 ? '#FFB300' : '#fff' }]}>{pendingSync}</Text>
            <Text style={styles.statLbl}>PENDING</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalAuth}</Text>
            <Text style={styles.statLbl}>TOTAL AUTH</Text>
          </View>
        </View>

        {/* ── PRIMARY ACTION ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onNavigate('Auth')}
          activeOpacity={0.88}
        >
          <View style={styles.primaryBtnLeft}>
            <View style={styles.primaryBtnIcon}>
              <Text style={{ fontSize: 26 }}>🔐</Text>
            </View>
            <View>
              <Text style={styles.primaryBtnTitle}>Authenticate Face</Text>
              <Text style={styles.primaryBtnSub}>Liveness check · 128D matching · AES-256</Text>
            </View>
          </View>
          <View style={styles.primaryBtnArrow}>
            <Text style={styles.primaryBtnArrowText}>›</Text>
          </View>
        </TouchableOpacity>

        {/* ── ACTION GRID ── */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actionGrid}>
          <ActionCard
            icon="👤"
            label="Enroll User"
            sub="Register new face"
            accent="#7B2FFF"
            onPress={() => onNavigate('Enroll')}
          />
          <ActionCard
            icon="📋"
            label="Auth Log"
            sub="View history"
            accent="#00D4FF"
            onPress={() => onNavigate('History')}
          />
          <ActionCard
            icon="🛡️"
            label="Admin Panel"
            sub="Users & sync"
            accent="#FF6B35"
            onPress={() => onNavigate('Admin')}
          />
          <ActionCard
            icon="⚙️"
            label="Settings"
            sub="Configure app"
            accent="#A0AEC0"
            onPress={() => onNavigate('Settings')}
          />
        </View>

        {/* ── NEURAL ENGINE STATUS ── */}
        <Text style={styles.sectionLabel}>NEURAL ENGINE</Text>
        <View style={styles.engineCard}>
          {[
            { icon: '🧠', label: 'BlazeFace Detector', status: 'ACTIVE', color: '#00E676' },
            { icon: '🔬', label: 'MobileFaceNet 128D', status: 'ACTIVE', color: '#00E676' },
            { icon: '👁️', label: 'Liveness Anti-Spoof', status: 'ACTIVE', color: '#00E676' },
            { icon: '🔒', label: 'AES-256 SQLCipher', status: 'SECURE', color: '#00D4FF' },
            { icon: '☁️', label: 'AWS Sync Bridge', status: isOnline ? 'ONLINE' : 'STANDBY', color: isOnline ? '#00E676' : '#FFB300' },
          ].map((item, i) => (
            <View key={i} style={[styles.engineRow, i < 4 && styles.engineRowBorder]}>
              <Text style={styles.engineIcon}>{item.icon}</Text>
              <Text style={styles.engineLabel}>{item.label}</Text>
              <View style={[styles.engineBadge, { borderColor: item.color + '55', backgroundColor: item.color + '15' }]}>
                <Text style={[styles.engineStatus, { color: item.color }]}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── PENDING SYNC ALERT ── */}
        {pendingSync > 0 && (
          <TouchableOpacity style={styles.alertBanner} onPress={() => onNavigate('Admin')}>
            <View style={styles.alertLeft}>
              <PulseDot color="#FFB300" />
              <Text style={styles.alertText}>
                {pendingSync} record{pendingSync !== 1 ? 's' : ''} waiting to sync to AWS
              </Text>
            </View>
            <Text style={styles.alertAction}>Sync Now →</Text>
          </TouchableOpacity>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>VisorAI · Hackathon 7.0 · Offline-First</Text>
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

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#00D4FF22',
    borderWidth: 1.5, borderColor: '#00D4FF55',
    justifyContent: 'center', alignItems: 'center',
  },
  brandLogoText: { fontSize: 18, fontWeight: '900', color: '#00D4FF' },
  brandName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  brandTag: { fontSize: 8, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  netBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: CARD_BG, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  netText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  gearBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  gearIcon: { fontSize: 16, color: '#718096' },

  heroCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    overflow: 'hidden',
  },
  heroTop: { marginBottom: 12 },
  heroGreeting: { fontSize: 11, color: '#4A5568', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
  heroBottom: { gap: 3 },
  heroClock: { fontSize: 42, fontWeight: '300', color: '#fff', fontVariant: ['tabular-nums'], letterSpacing: 2 },
  heroDate: { fontSize: 12, color: '#4A5568', fontWeight: '500' },
  heroGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(0,212,255,0.06)',
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: CARD_BG,
    borderRadius: 14, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  statCardBlue: { borderColor: 'rgba(0,212,255,0.2)', backgroundColor: 'rgba(0,212,255,0.06)' },
  statCardGreen: { borderColor: 'rgba(0,230,118,0.2)', backgroundColor: 'rgba(0,230,118,0.05)' },
  statCardOrange: { borderColor: 'rgba(255,179,0,0.25)', backgroundColor: 'rgba(255,179,0,0.07)' },
  statCardDim: {},
  statNum: { fontSize: 22, fontWeight: '900', color: '#00D4FF', marginBottom: 3 },
  statLbl: { fontSize: 8, color: '#4A5568', fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0062FF',
    borderRadius: 18, padding: 18, marginBottom: 20,
    shadowColor: '#0062FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 12,
  },
  primaryBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  primaryBtnIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 3 },
  primaryBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  primaryBtnArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnArrowText: { fontSize: 22, color: '#fff', marginTop: -2 },

  sectionLabel: {
    fontSize: 10, color: '#4A5568', fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10, marginTop: 4,
  },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  cardWide: { width: '100%' },
  cardHalf: { width: (width - 32 - 10) / 2 },
  card: {
    backgroundColor: CARD_BG, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12,
  },
  cardWideInner: {},
  cardIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  cardIconText: { fontSize: 20 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardSub: { fontSize: 11, color: '#4A5568' },
  cardArrow: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  cardArrowText: { fontSize: 20, marginTop: -2 },

  engineCard: {
    backgroundColor: CARD_BG, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, marginBottom: 20,
  },
  engineRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  engineRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  engineIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  engineLabel: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  engineBadge: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  engineStatus: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,179,0,0.08)',
    borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,179,0,0.25)',
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  alertText: { fontSize: 13, color: '#FFB300', fontWeight: '600', flex: 1 },
  alertAction: { fontSize: 12, color: '#FFB300', fontWeight: '800' },

  footer: { alignItems: 'center', paddingTop: 8, gap: 4 },
  footerText: { fontSize: 11, color: '#2D3748', fontWeight: '600', letterSpacing: 0.5 },
  footerSub: { fontSize: 10, color: '#1E2840' },
});
