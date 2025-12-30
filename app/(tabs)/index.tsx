import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayPicker } from "@/components/day-picker";
import { OfflineBanner } from "@/components/offline-banner";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useLanguage } from "@/contexts/language-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DEFAULT_CHECKPOINTS } from "@/constants/checkpoints";
import { Colors, Radius, Shadows, Spacing, Typography, Layout } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useResponsive } from "@/hooks/use-responsive";
import { useSettings } from "@/hooks/use-storage";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { scanFromGallery } from "@/services/qr-scanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_BUTTON_SIZE = 80; // Slightly smaller, more refined
const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = 100;

interface RecentScan {
  id: string;
  participantName: string;
  checkpointNumber: number;
  timestamp: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ScannerScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { isDesktop, containerWidth } = useResponsive();
  const { t } = useLanguage();

  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    message: string;
    participantName?: string;
  } | null>(null);
  const [showCheckpointPicker, setShowCheckpointPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<1 | 2 | "all">("all");

  const { settings, updateSettings } = useSettings();
  const { participants, scanLogs, addScan } = useOfflineSync();

  // Animation values
  const scrollY = useSharedValue(0);
  const scanButtonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  // Pulse animation for scan button
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.2], [0.6, 0]),
  }));

  const scanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanButtonScale.value }],
  }));

  // Get recent scans for display
  const recentScans: RecentScan[] = scanLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, isDesktop ? 20 : 10)
    .map((log) => {
      const participant = participants.find((p) => p.id === log.participantId);
      const checkpoint = DEFAULT_CHECKPOINTS.find((c) => c.id === log.checkpointId);
      return {
        id: log.id,
        participantName: participant?.name || "Unknown Pilgrim",
        checkpointNumber: checkpoint?.number || log.checkpointId,
        timestamp: log.timestamp,
      };
    });

  const currentCheckpoint = DEFAULT_CHECKPOINTS.find(
    (c) => c.id === settings.currentCheckpoint
  );

  const filteredCheckpoints = selectedDay === "all"
    ? DEFAULT_CHECKPOINTS
    : DEFAULT_CHECKPOINTS.filter((c) => c.day === selectedDay);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (isProcessing) return;
      setIsProcessing(true);

      const participant = participants.find((p) => p.qrToken === data);

      if (!participant) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastScanResult({
          success: false,
          message: "Participant not found",
        });
        setIsScannerOpen(false);
        setIsProcessing(false);
        return;
      }

      const result = await addScan(
        participant.id,
        settings.currentCheckpoint
      );

      if (result.duplicate) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setLastScanResult({
          success: false,
          message: `Already scanned here`,
          participantName: participant.name,
        });
      } else if (result.success) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLastScanResult({
          success: true,
          message: `Check-in Complete`,
          participantName: participant.name,
        });
      }

      setIsScannerOpen(false);
      setIsProcessing(false);
    },
    [isProcessing, participants, addScan, settings.currentCheckpoint]
  );

  const openScanner = async () => {
    scanButtonScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
    
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setLastScanResult({
          success: false,
          message: "Camera permission denied",
        });
        return;
      }
    }
    setLastScanResult(null);
    setIsScannerOpen(true);
  };

  const handleGalleryScan = useCallback(async () => {
      if (isProcessing) return;
      setIsProcessing(true);
      setIsScannerOpen(false);
  
      try {
        const result = await scanFromGallery();
        
        if (!result.success || !result.data) {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          setLastScanResult({
            success: false,
            message: result.error || "Could not read QR code",
          });
          setIsProcessing(false);
          return;
        }
  
        // Process the scanned QR data
        const participant = participants.find((p) => p.qrToken === result.data);
  
        if (!participant) {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          setLastScanResult({
            success: false,
            message: "Participant not found",
          });
          setIsProcessing(false);
          return;
        }
  
        const scanResult = await addScan(
          participant.id,
          settings.currentCheckpoint
        );
  
        if (scanResult.duplicate) {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          setLastScanResult({
            success: false,
            message: `Already scanned here`,
            participantName: participant.name,
          });
        } else if (scanResult.success) {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setLastScanResult({
            success: true,
            message: `Check-in Complete`,
            participantName: participant.name,
          });
        }
      } catch (error) {
        console.error("Gallery scan error:", error);
        setLastScanResult({
          success: false,
          message: "Failed to scan from gallery",
        });
      }
  
      setIsProcessing(false);
    }, [isProcessing, participants, addScan, settings.currentCheckpoint]);

  const renderRecentScan = ({ item, index }: { item: RecentScan; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[
        styles.scanItem,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
        isDesktop && styles.scanItemDesktop,
      ]}
    >
      <View style={styles.scanTimelineLine} />
      <View style={[styles.scanAvatar, { backgroundColor: colors.primaryLight }]}>
        <ThemedText style={{fontSize: 12}}>🙏</ThemedText>
      </View>
      <View style={styles.scanInfo}>
        <ThemedText style={styles.scanName} numberOfLines={1}>
          {item.participantName}
        </ThemedText>
        <ThemedText style={[styles.scanMeta, { color: colors.textTertiary }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • CP {item.checkpointNumber}
        </ThemedText>
      </View>
    </Animated.View>
  );

  const todayScans = scanLogs.filter((log) => {
    const today = new Date();
    const logDate = new Date(log.timestamp);
    return logDate.toDateString() === today.toDateString();
  }).length;

  return (
    <ThemedView style={styles.container}>
      {/* Dynamic Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <View>
             <ThemedText style={styles.greeting}>{t("app_name")}</ThemedText>
             <ThemedText style={[styles.dateText, {color: colors.textTertiary}]}>
               {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
             </ThemedText>
          </View>
          <SyncStatusBar />
        </View>
        
        {/* Stats Cards Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.statsContainer}
        >
          <StatCard 
            label={t("scanner_recent_scans")} 
            value={todayScans.toString()} 
            icon="qrcode" 
            color={colors.primary}
            colors={colors}
          />
          <StatCard 
            label={t("nav_pilgrims")} 
            value={participants.length.toString()} 
            icon="person.2.fill" 
            color={colors.info}
            colors={colors}
          />
          <StatCard 
            label="Current CP" 
            value={`#${currentCheckpoint?.number || 1}`} 
            icon="location.fill" 
            color={colors.success}
            colors={colors}
          />
        </ScrollView>
      </View>

      <OfflineBanner />

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkpoint Selector */}
        <Pressable
          style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCheckpointPicker(true)}
        >
          <View style={[styles.locationIconCtx, { backgroundColor: colors.accentLight }]}>
            <IconSymbol name="location.fill" size={24} color={colors.accent} />
          </View>
          <View style={styles.locationInfo}>
            <ThemedText style={[styles.locationLabel, { color: colors.textTertiary }]}>
              Current Location
            </ThemedText>
            <ThemedText style={styles.locationTitle}>
              {currentCheckpoint?.description}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.icon} />
        </Pressable>

        {/* Scan Result Notification */}
        {lastScanResult && (
          <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOut}
            style={[
              styles.notification,
              {
                backgroundColor: lastScanResult.success ? colors.successLight : colors.errorLight,
                borderColor: lastScanResult.success ? colors.success : colors.error,
              },
            ]}
          >
            <IconSymbol
              name={lastScanResult.success ? "checkmark.circle.fill" : "exclamationmark.circle.fill"}
              size={24}
              color={lastScanResult.success ? colors.success : colors.error}
            />
            <View style={styles.notificationTextCtx}>
              <ThemedText style={[styles.notificationTitle, { color: lastScanResult.success ? colors.successDark : colors.errorLight }]}>
                {lastScanResult.message}
              </ThemedText>
              {lastScanResult.participantName && (
                <ThemedText style={[styles.notificationSubtitle, { color: lastScanResult.success ? colors.successDark : colors.errorLight }]}>
                  {lastScanResult.participantName}
                </ThemedText>
              )}
            </View>
          </Animated.View>
        )}

        {/* Timeline Title */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Live Activity</ThemedText>
          <View style={[styles.liveBadge, {backgroundColor: colors.errorLight}]}>
             <View style={[styles.liveDot, {backgroundColor: colors.error}]} />
             <ThemedText style={[styles.liveText, {color: colors.error}]}>LIVE</ThemedText>
          </View>
        </View>

        {/* Recent Scans List */}
        {recentScans.length > 0 ? (
          <View style={styles.timelineContainer}>
            {recentScans.map((item, index) => renderRecentScan({ item, index }))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="qrcode" size={48} color={colors.icon} />
            <ThemedText style={[styles.emptyText, { color: colors.textTertiary }]}>
              No scans recorded today yet.
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for Scanning */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 20 }]}>
         <Animated.View style={[styles.pulseRing, { borderColor: colors.primary }, pulseStyle]} />
         <Pressable onPress={openScanner} style={({pressed}) => [
           styles.fab,
           { backgroundColor: colors.primary, transform: [{scale: pressed ? 0.95 : 1}] },
           Shadows.glow
         ]}>
            <IconSymbol name="qrcode.viewfinder" size={32} color="#FFFFFF" />
         </Pressable>
      </View>

      {/* Modals */}
      {/* Scanner Modal */}
      <Modal visible={isScannerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsScannerOpen(false)}>
        <View style={[styles.scannerModal, { backgroundColor: "black" }]}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          />
          
          <View style={[styles.scannerOverlay, {paddingTop: insets.top + 20}]}>
             <View style={styles.scannerHeader}>
                <Pressable onPress={() => setIsScannerOpen(false)} style={styles.closeBtn}>
                   <IconSymbol name="xmark" size={24} color="white" />
                </Pressable>
                <View style={styles.scannerTitleCtx}>
                  <ThemedText style={{color: 'white', opacity: 0.8}}>Scanning at</ThemedText>
                  <ThemedText style={{color: 'white', fontWeight: 'bold', fontSize: 18}}>{currentCheckpoint?.description}</ThemedText>
                </View>
                <View style={{width: 40}} />
             </View>

             <View style={styles.scannerFrame}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
             </View>

             <Pressable onPress={handleGalleryScan} style={styles.galleryBtn}>
                <IconSymbol name="photo.fill" size={20} color="white" />
                <ThemedText style={{color: 'white', fontWeight: '600'}}>Select from Gallery</ThemedText>
             </Pressable>
          </View>
        </View>
      </Modal>
      
      {/* Checkpoint Picker Modal - Simplified for brevity */}
      <Modal visible={showCheckpointPicker} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCheckpointPicker(false)}>
           <View style={[styles.pickerSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.pickerHeader}>
                 <ThemedText style={styles.pickerTitle}>Select Checkpoint</ThemedText>
              </View>
              <FlatList 
                data={filteredCheckpoints}
                keyExtractor={item => item.id.toString()}
                renderItem={({item}) => (
                  <Pressable 
                    style={[styles.pickerItem, item.id === settings.currentCheckpoint && {backgroundColor: colors.backgroundSecondary}]}
                    onPress={() => {
                      updateSettings({ currentCheckpoint: item.id });
                      setShowCheckpointPicker(false);
                    }}
                  >
                     <View style={[styles.pickerNumber, {backgroundColor: colors.primaryLight}]}>
                        <ThemedText style={{color: colors.primary, fontWeight: 'bold'}}>{item.number}</ThemedText>
                     </View>
                     <ThemedText style={styles.pickerLabel}>{item.description}</ThemedText>
                     {item.id === settings.currentCheckpoint && <IconSymbol name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                )}
              />
           </View>
        </Pressable>
      </Modal>

    </ThemedView>
  );
}

function StatCard({ label, value, icon, color, colors }: { label: string, value: string, icon: string, color: string, colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderLight }, Shadows.sm]}>
       <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <IconSymbol name={icon as any} size={20} color={color} />
       </View>
       <View>
         <ThemedText style={[styles.statValue, {color: colors.text}]}>{value}</ThemedText>
         <ThemedText style={[styles.statLabel, {color: colors.textTertiary}]}>{label}</ThemedText>
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  greeting: {
    fontSize: Typography.size["2xl"],
    fontWeight: Typography.weight.bold,
  },
  dateText: {
    fontSize: Typography.size.sm,
    marginTop: 2,
  },
  statsContainer: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  statCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    width: 140,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 100,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  statLabel: {
    fontSize: Typography.size.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  locationIconCtx: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: Typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  notificationTextCtx: {
    marginLeft: Spacing.md,
  },
  notificationTitle: {
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.md,
  },
  notificationSubtitle: {
    fontSize: Typography.size.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  timelineContainer: {
    borderLeftWidth: 1,
    borderLeftColor: '#E4E4E7', // Hardcoded zinc-200 for simplicity
    marginLeft: 16,
    paddingLeft: 24,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  scanItemDesktop: {
     // Desktop overrides
  },
  scanTimelineLine: {
    position: 'absolute',
    left: -29, // Align with timeline border
    top: 24,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E4E4E7',
    borderWidth: 2,
    borderColor: 'white',
  },
  scanAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  scanInfo: {
    flex: 1,
  },
  scanName: {
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.md,
  },
  scanMeta: {
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: Typography.size.md,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
  },
  // Scanner Modal
  scannerModal: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  scannerHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closeBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  scannerTitleCtx: {
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'white',
    borderWidth: 4,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  galleryBtn: {
     flexDirection: 'row',
     backgroundColor: 'rgba(255,255,255,0.2)',
     paddingHorizontal: 20,
     paddingVertical: 12,
     borderRadius: 30,
     gap: 10,
  },
  // Picker
  modalBackdrop: {
     flex: 1,
     backgroundColor: 'rgba(0,0,0,0.5)',
     justifyContent: 'flex-end',
  },
  pickerSheet: {
     borderTopLeftRadius: 24,
     borderTopRightRadius: 24,
     maxHeight: '60%',
  },
  pickerHeader: {
     padding: 20,
     borderBottomWidth: 1,
     borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  pickerTitle: {
     fontSize: 18,
     fontWeight: 'bold',
     textAlign: 'center',
  },
  pickerItem: {
     flexDirection: 'row',
     alignItems: 'center',
     padding: 16,
     borderBottomWidth: 1,
     borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  pickerNumber: {
     width: 32,
     height: 32,
     borderRadius: 16,
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 12,
  },
  pickerLabel: {
     flex: 1,
     fontSize: 16,
  },
});