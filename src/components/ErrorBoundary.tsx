import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { getError, classifyError, ErrorCode } from '../services/error-codes';
import { trackAppError } from '../services/analytics';

interface Props {
  children: React.ReactNode;
  screen: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorCode: ErrorCode;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCode: 'E603' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorCode: classifyError(error, 'render') };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const code = classifyError(error, 'render');
    const entry = getError(code);
    trackAppError(code, entry.message, this.props.screen, error.message);
    if (__DEV__) {
      console.error(`[ErrorBoundary:${this.props.screen}] ${code}:`, error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorCode: 'E603' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const entry = getError(this.state.errorCode);
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>{entry.message}</Text>
          <Text style={styles.body}>{entry.recovery}</Text>
          <Text style={styles.code}>{this.state.errorCode}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: Colors.slate[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  code: {
    fontSize: 11,
    color: Colors.slate[600],
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.sky[500],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});
