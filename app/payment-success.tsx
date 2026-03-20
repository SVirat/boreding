import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { markPremium } from '../src/services/payment';
import { Colors } from '../src/theme/colors';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { trackAppError, trackPaymentSuccess, trackScreenView } from '../src/services/analytics';

const log = (msg: string, data?: unknown) =>
  console.log(`[payment-success] ${msg}`, data !== undefined ? JSON.stringify(data, null, 2) : '');

export default function PaymentSuccessScreen() {
  const router = useRouter();
  return (
    <ErrorBoundary screen="payment" onReset={() => router.replace('/')}>
      <PaymentSuccessInner />
    </ErrorBoundary>
  );
}

function PaymentSuccessInner() {
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();

  // Log all available params to help debug
  log('screen mounted');
  log('localSearchParams', localParams);
  log('globalSearchParams', globalParams);

  useEffect(() => { trackScreenView('payment_success'); }, []);

  const params = localParams as {
    razorpay_payment_id?: string;
    razorpay_payment_link_id?: string;
    razorpay_payment_link_reference_id?: string;
    razorpay_payment_link_status?: string;
    razorpay_signature?: string;
  };

  useEffect(() => {
    const handlePayment = async () => {
      try {
        log('handlePayment started');
        log('razorpay_payment_id', params.razorpay_payment_id ?? '(missing)');
        log('razorpay_payment_link_id', params.razorpay_payment_link_id ?? '(missing)');
        log('razorpay_payment_link_status', params.razorpay_payment_link_status ?? '(missing)');
        log('razorpay_signature', params.razorpay_signature ? '(present)' : '(missing)');

        const paymentId =
          params.razorpay_payment_id ||
          params.razorpay_payment_link_id ||
          'plink_deeplink';

        log('paymentId resolved', paymentId);

        // If we reached this screen via deep link, Razorpay redirected here
        // which only happens after successful payment. Always mark premium.
        log('marking premium (redirect to this screen confirms payment)…');
        await markPremium(paymentId);
        trackPaymentSuccess(paymentId);
        log('premium marked successfully');
      } catch (e) {
        trackAppError('E401', 'Payment verification failed', 'payment-success', e instanceof Error ? e.message : String(e));
        log('ERROR in handlePayment:', e);
      }

      log('navigating to home…');
      router.replace('/');
    };

    handlePayment();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.sky[400]} />
      <Text style={styles.text}>Confirming payment…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    color: Colors.slate[400],
    fontSize: 16,
  },
});
