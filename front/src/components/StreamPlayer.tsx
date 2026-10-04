import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/tokens';
import { getBaseUrl, getStreamProxyUrl } from '../services/api';

interface StreamPlayerProps {
  espConnected: boolean;
  espIp: string | null;
  directStreamUrl: string | null;
  onRefreshFeed?: () => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  espConnected,
  espIp,
  directStreamUrl,
  onRefreshFeed,
}) => {
  const [streamSource, setStreamSource] = useState<'direct' | 'proxy'>('direct');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamKey, setStreamKey] = useState(1);
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Determine active stream URL
  const activeStreamUrl =
    streamSource === 'direct' && espIp
      ? `http://${espIp}:81/stream`
      : getStreamProxyUrl();

  // Clock ticker for video overlay
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`Hoy ${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReload = () => {
    setIsLoading(true);
    setStreamKey((prev) => prev + 1);
    if (onRefreshFeed) onRefreshFeed();
  };

  const toggleStreamSource = () => {
    setStreamSource((prev) => (prev === 'direct' ? 'proxy' : 'direct'));
    setStreamKey((prev) => prev + 1);
    setIsLoading(true);
  };

  const mjpegHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; background-color: #0b1c30; }
          html, body { width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
          img { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <img id="feed" src="${activeStreamUrl}?t=${streamKey}" onerror="retryFeed()" />
        <script>
          function retryFeed() {
            setTimeout(function() {
              var el = document.getElementById('feed');
              if (el) el.src = '${activeStreamUrl}?t=' + Date.now();
            }, 1500);
          }
        </script>
      </body>
    </html>
  `;

  const renderStreamContent = (fullscreenMode: boolean = false) => {
    if (!espConnected && !espIp) {
      return (
        <View style={styles.offlineContainer}>
          <MaterialCommunityIcons name="camera-off" size={44} color={Colors.outline} />
          <Text style={styles.offlineTitle}>Cámara fuera de línea</Text>
          <Text style={styles.offlineDesc}>
            Esperando detección UDP del ESP32-CAM en la red local. Verifica que esté energizado y conectado al Wi-Fi.
          </Text>
          <TouchableOpacity style={styles.offlineRetryBtn} onPress={handleReload} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color={Colors.onPrimary} />
            <Text style={styles.offlineRetryText}>Reintentar conexión</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.playerInner, fullscreenMode && styles.playerInnerFullscreen]}>
        <WebView
          key={`${activeStreamUrl}-${streamKey}`}
          originWhitelist={['*']}
          source={{ html: mjpegHtml }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
          scrollEnabled={false}
          onLoadEnd={() => setIsLoading(false)}
        />

        {/* HUD Top Left: LIVE indicator & specs */}
        <View style={styles.hudTopLeft}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
          <View style={styles.specsPill}>
            <Text style={styles.specsText}>
              {streamSource === 'direct' ? 'DIRECTO :81' : 'PROXY :8000'} | 25 FPS
            </Text>
          </View>
        </View>

        {/* HUD Top Right: Timestamp clock */}
        <View style={styles.hudTopRight}>
          <Text style={styles.clockText}>{currentTime}</Text>
        </View>

        {/* HUD Bottom Right: Stream Controls */}
        <View style={styles.hudBottomRight}>
          <TouchableOpacity
            style={styles.hudBtn}
            onPress={toggleStreamSource}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={streamSource === 'direct' ? 'wifi' : 'server-network'}
              size={18}
              color={Colors.hudText}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hudBtn}
            onPress={handleReload}
            activeOpacity={0.8}
          >
            <Ionicons name="sync" size={18} color={Colors.hudText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hudBtn}
            onPress={() => setIsFullscreen(!fullscreenMode)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={fullscreenMode ? 'contract' : 'expand'}
              size={18}
              color={Colors.hudText}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.streamAspectBox}>
        {renderStreamContent(false)}
      </View>

      {/* Sub-bar telemetry info */}
      <View style={styles.subBar}>
        <View style={styles.subBarLeft}>
          <Ionicons name="videocam-outline" size={16} color={Colors.primary} />
          <Text style={styles.subBarTitle}>
            ESP32-CAM {espIp ? `(${espIp})` : ''}
          </Text>
        </View>
        <Text style={styles.subBarMode}>
          Stream: {streamSource === 'direct' ? 'TCP Socket :81' : 'FastAPI StreamingResponse'}
        </Text>
      </View>

      {/* Fullscreen modal player */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            style={styles.closeFullscreenBtn}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          {renderStreamContent(true)}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: BorderRadius.xl,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  streamAspectBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#0b1c30',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  playerInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#0b1c30',
  },
  playerInnerFullscreen: {
    width: '100%',
    height: '100%',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0b1c30',
  },
  hudTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 49, 69, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tertiaryActive,
  },
  liveText: {
    color: '#ffdad6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  specsPill: {
    backgroundColor: 'rgba(33, 49, 69, 0.8)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  specsText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hudTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(33, 49, 69, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  clockText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hudBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  hudBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(33, 49, 69, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  subBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  subBarMode: {
    fontSize: 11,
    color: Colors.outline,
  },
  offlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  offlineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 10,
  },
  offlineDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  offlineRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginTop: 14,
    gap: 6,
  },
  offlineRetryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
