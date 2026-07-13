import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Libera (des-attach) la tarjeta retenida. Best-effort: nunca debe bloquear
// la respuesta al usuario ni la accion del admin si Stripe falla.
export async function releaseCard(paymentMethodId) {
  if (process.env.STRIPE_SECRET_KEY && paymentMethodId) {
    try { await stripe.paymentMethods.detach(paymentMethodId); } catch (e) { /* no bloquear la respuesta por esto */ }
  }
}
