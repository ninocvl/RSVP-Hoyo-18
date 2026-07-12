import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(200).json({ ok: false, error: 'Falta configurar STRIPE_SECRET_KEY.' });
  }

  try {
    const { fullName, email } = req.body;

    const customer = await stripe.customers.create({ name: fullName, email });
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    res.status(200).json({ ok: true, clientSecret: setupIntent.client_secret, customerId: customer.id });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
