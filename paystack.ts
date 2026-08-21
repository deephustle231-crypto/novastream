import crypto from 'crypto';
import { dbStore } from './store';
import { PaymentRecord, SubscriptionRecord, User } from '../src/types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
const PREMIUM_PRICE_NGN = 2500;
const PREMIUM_PRICE_KOBO = PREMIUM_PRICE_NGN * 100; // 250,000 kobo

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
    isTestSandbox?: boolean;
  };
}

export async function initializePaystackTransaction(
  user: User,
  callbackUrl: string
): Promise<PaystackInitResponse> {
  const reference = `ns_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // If live Paystack Secret Key is configured, make real API call
  if (PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.startsWith('sk_')) {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          amount: PREMIUM_PRICE_KOBO,
          currency: 'NGN',
          reference,
          callback_url: callbackUrl,
          metadata: {
            userId: user.id,
            plan: 'premium',
            platform: 'NovaStream'
          }
        })
      });

      const json = await response.json();
      if (json.status && json.data) {
        dbStore.addAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: 'PAYSTACK_INIT_TRANSACTION',
          resource: 'Payment',
          resourceId: reference,
          result: 'SUCCESS',
          details: `Initialized live Paystack checkout for ₦${PREMIUM_PRICE_NGN} (ref: ${reference})`
        });
        return json;
      }
    } catch (err: any) {
      console.error('Paystack initialization error, falling back to simulated sandbox:', err);
    }
  }

  // Resilient Sandbox Fallback when API key is not configured or in sandbox test
  dbStore.addAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'PAYSTACK_INIT_SANDBOX',
    resource: 'Payment',
    resourceId: reference,
    result: 'SUCCESS',
    details: `Initialized sandbox Paystack checkout for ₦${PREMIUM_PRICE_NGN} (ref: ${reference})`
  });

  return {
    status: true,
    message: 'Authorization URL created',
    data: {
      authorization_url: `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}reference=${reference}&status=success`,
      access_code: `mock_code_${Date.now()}`,
      reference,
      isTestSandbox: !PAYSTACK_SECRET_KEY
    }
  };
}

export async function verifyPaystackTransaction(
  reference: string,
  userId: string
): Promise<{ success: boolean; message: string; payment?: PaymentRecord; subscription?: SubscriptionRecord }> {
  // Check for duplicate transaction
  const existingPayment = dbStore.getPayments().find(p => p.reference === reference);
  if (existingPayment && existingPayment.status === 'success') {
    const userSub = dbStore.getUserSubscription(userId);
    return {
      success: true,
      message: 'Transaction already verified and active',
      payment: existingPayment,
      subscription: userSub
    };
  }

  let verifiedAmount = PREMIUM_PRICE_NGN;
  let transactionId = `tx_${Date.now()}`;
  let channel = 'card';
  let isLegit = false;

  // Real Paystack API Verification
  if (PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.startsWith('sk_')) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      });

      const json = await response.json();
      if (json.status && json.data && json.data.status === 'success') {
        const amountKobo = json.data.amount;
        if (amountKobo >= PREMIUM_PRICE_KOBO) {
          isLegit = true;
          verifiedAmount = amountKobo / 100;
          transactionId = String(json.data.id || json.data.reference);
          channel = json.data.channel || 'card';
        } else {
          return { success: false, message: 'Invalid payment amount received' };
        }
      } else {
        return { success: false, message: json.message || 'Payment verification failed at Paystack gateway' };
      }
    } catch (err: any) {
      console.error('Paystack verification error:', err);
      return { success: false, message: 'Network error connecting to Paystack gateway' };
    }
  } else {
    // Sandbox verification mode
    if (reference && reference.startsWith('ns_tx_')) {
      isLegit = true;
    } else {
      return { success: false, message: 'Invalid transaction reference format' };
    }
  }

  if (!isLegit) {
    return { success: false, message: 'Payment could not be verified' };
  }

  const user = dbStore.getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // 1. Record verified payment
  const payment: PaymentRecord = {
    id: `pay-${crypto.randomUUID()}`,
    userId: user.id,
    userEmail: user.email,
    reference,
    transactionId,
    amount: verifiedAmount,
    currency: 'NGN',
    plan: 'premium',
    status: 'success',
    paymentDate: new Date().toISOString(),
    channel,
    createdAt: new Date().toISOString()
  };
  dbStore.recordPayment(payment);

  // 2. Activate or renew user subscription (30-day billing cycle)
  const now = new Date();
  const expiresDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscription: SubscriptionRecord = {
    id: `sub-${crypto.randomUUID()}`,
    userId: user.id,
    userEmail: user.email,
    plan: 'premium',
    status: 'active',
    amount: verifiedAmount,
    currency: 'NGN',
    reference,
    startDate: now.toISOString(),
    nextBillingDate: expiresDate.toISOString(),
    expiresAt: expiresDate.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  dbStore.saveSubscription(subscription);

  // 3. Update user profile to premium
  user.plan = 'premium';
  user.subscriptionStatus = 'active';
  user.subscriptionExpiresAt = expiresDate.toISOString();
  dbStore.saveUser(user);

  // 4. Create user notification
  dbStore.createNotification({
    userId: user.id,
    title: 'NovaStream Premium Activated',
    message: `Your ₦${PREMIUM_PRICE_NGN}/month Premium plan is now active until ${expiresDate.toLocaleDateString()}. Enjoy unlimited 4K streaming!`,
    type: 'payment',
    isRead: false
  });

  // 5. Create audit log
  dbStore.addAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'ACTIVATE_PREMIUM_SUBSCRIPTION',
    resource: 'Subscription',
    resourceId: subscription.id,
    result: 'SUCCESS',
    details: `Activated Premium (₦${PREMIUM_PRICE_NGN}) for ${user.email} (ref: ${reference})`
  });

  return {
    success: true,
    message: 'Premium subscription activated successfully',
    payment,
    subscription
  };
}

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  if (!PAYSTACK_SECRET_KEY) return true; // In test mode allow webhook test
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');
    return hash === signatureHeader;
  } catch (err) {
    return false;
  }
}

export async function processPaystackWebhook(event: any): Promise<{ handled: boolean; eventType: string }> {
  const eventType = event.event;
  const data = event.data || {};

  dbStore.addAuditLog({
    actorId: 'webhook',
    actorEmail: 'paystack-webhook@novastream.internal',
    action: `WEBHOOK_${eventType?.toUpperCase() || 'UNKNOWN'}`,
    resource: 'WebhookEvent',
    result: 'SUCCESS',
    details: `Received Paystack webhook event: ${eventType}`
  });

  if (eventType === 'charge.success') {
    const reference = data.reference;
    const email = data.customer?.email;
    const user = email ? dbStore.getUserByEmail(email) : undefined;

    if (reference && user) {
      await verifyPaystackTransaction(reference, user.id);
    }
    return { handled: true, eventType };
  }

  if (eventType === 'subscription.disable' || eventType === 'subscription.expiring') {
    const email = data.customer?.email;
    const user = email ? dbStore.getUserByEmail(email) : undefined;
    if (user) {
      user.subscriptionStatus = 'cancelled';
      dbStore.saveUser(user);
      dbStore.createNotification({
        userId: user.id,
        title: 'Subscription Status Update',
        message: 'Your NovaStream subscription has been cancelled or is expiring soon.',
        type: 'subscription',
        isRead: false
      });
    }
    return { handled: true, eventType };
  }

  return { handled: true, eventType: eventType || 'unhandled' };
}
