import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import {
  DownloadState,
  subscribeToModelState,
  getAvailableModels,
  downloadModel,
  cancelDownload,
  deleteModel,
  isOfflineLLMSupported,
  ModelInfo,
} from '../services/offline-llm';
import {
  trackOfflineModelDownloadStart,
  trackOfflineModelDownloadComplete,
  trackOfflineModelDownloadError,
  trackOfflineModelDeleted,
} from '../services/analytics';
import { Colors } from '../theme/colors';

interface Props {
  isConnected: boolean;
}

export default function OfflineModelCard({ isConnected }: Props) {
  const [state, setState] = useState<DownloadState | null>(null);
  const [models] = useState<ModelInfo[]>(getAvailableModels);
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const isNative = isOfflineLLMSupported();

  useEffect(() => {
    if (isNative) {
      return subscribeToModelState(setState);
    } else {
      // On web, show the card UI with a static state
      setState({ status: 'not-downloaded', progress: 0, modelId: models[0]?.id ?? '' });
    }
  }, []);

  if (!state) return null;

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? models[0];

  const handleDownload = async () => {
    setError(null);
    trackOfflineModelDownloadStart(selectedModelId);
    try {
      await downloadModel(selectedModelId);
      trackOfflineModelDownloadComplete(selectedModelId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setError(msg);
      trackOfflineModelDownloadError(selectedModelId, msg);
    }
  };

  const handleDelete = async () => {
    trackOfflineModelDeleted(state.modelId);
    await deleteModel();
    setError(null);
  };

  const handleCancel = async () => {
    await cancelDownload();
    setError(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>📦</Text>
        <Text style={styles.title}>Offline Mode</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      <Text style={styles.description}>
        Download a micro-LLM to generate content without internet. Perfect for flights.
      </Text>

      {/* Model selector */}
      {state.status === 'not-downloaded' && (
        <View style={styles.modelSelector}>
          {models.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modelOption, selectedModelId === m.id && styles.modelOptionSelected]}
              onPress={() => setSelectedModelId(m.id)}
              activeOpacity={0.7}
            >
              <View style={styles.modelOptionHeader}>
                <View style={[styles.radio, selectedModelId === m.id && styles.radioSelected]} />
                <Text style={[styles.modelName, selectedModelId === m.id && styles.modelNameSelected]}>
                  {m.name}
                </Text>
                <Text style={styles.modelSize}>{m.sizeLabel}</Text>
              </View>
              <Text style={styles.modelDesc}>{m.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Download button */}
      {state.status === 'not-downloaded' && (
        <TouchableOpacity
          style={[styles.downloadBtn, (!isConnected || !isNative) && styles.downloadBtnDisabled]}
          onPress={handleDownload}
          disabled={!isConnected || !isNative}
          activeOpacity={0.8}
        >
          <Text style={styles.downloadBtnText}>
            ⬇️ Download {selectedModel.name} ({selectedModel.sizeLabel})
          </Text>
        </TouchableOpacity>
      )}

      {/* Hints */}
      {state.status === 'not-downloaded' && !isNative && (
        <Text style={styles.hintText}>Available on the mobile app only</Text>
      )}
      {state.status === 'not-downloaded' && isNative && !isConnected && (
        <Text style={styles.hintText}>Connect to internet to download model</Text>
      )}

      {/* Progress */}
      {state.status === 'downloading' && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={Colors.sky[400]} />
            <Text style={styles.progressText}>Downloading… {state.progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${state.progress}%` }]} />
          </View>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ready */}
      {state.status === 'ready' && (
        <View style={styles.readySection}>
          <View style={styles.readyRow}>
            <Text style={styles.readyIcon}>✅</Text>
            <Text style={styles.readyText}>
              {models.find((m) => m.id === state.modelId)?.name ?? 'Model'} ready
            </Text>
          </View>
          <Text style={styles.readyHint}>
            {isConnected
              ? 'Cloud AI is being used. This model activates automatically when offline.'
              : 'Using on-device model for content generation.'}
          </Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Remove model</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {(state.status === 'error' || error) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error || state.error}</Text>
          <TouchableOpacity onPress={handleDownload} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate[200],
    flex: 1,
  },
  offlineBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.orange[400],
  },
  description: {
    fontSize: 11,
    color: Colors.slate[500],
    lineHeight: 16,
    marginBottom: 12,
  },
  modelSelector: {
    gap: 8,
    marginBottom: 12,
  },
  modelOption: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 10,
  },
  modelOptionSelected: {
    borderColor: Colors.sky[500],
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
  },
  modelOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.slate[600],
  },
  radioSelected: {
    borderColor: Colors.sky[400],
    backgroundColor: Colors.sky[400],
  },
  modelName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate[300],
    flex: 1,
  },
  modelNameSelected: {
    color: Colors.sky[300],
  },
  modelSize: {
    fontSize: 11,
    color: Colors.slate[500],
  },
  modelDesc: {
    fontSize: 11,
    color: Colors.slate[500],
    marginLeft: 22,
  },
  downloadBtn: {
    backgroundColor: Colors.sky[600],
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  downloadBtnDisabled: {
    backgroundColor: Colors.slate[700],
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  hintText: {
    fontSize: 10,
    color: Colors.orange[400],
    textAlign: 'center',
    marginTop: 6,
  },
  progressSection: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: Colors.sky[300],
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.slate[700],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.sky[500],
    borderRadius: 3,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
  },
  cancelBtnText: {
    fontSize: 11,
    color: Colors.slate[500],
  },
  readySection: {
    gap: 6,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyIcon: {
    fontSize: 14,
  },
  readyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.emerald[400],
  },
  readyHint: {
    fontSize: 11,
    color: Colors.slate[500],
    lineHeight: 16,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  deleteBtnText: {
    fontSize: 11,
    color: Colors.red[400],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 11,
    color: Colors.red[400],
    flex: 1,
  },
  retryBtn: {
    marginLeft: 10,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.sky[400],
  },
});
