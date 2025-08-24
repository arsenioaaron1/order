const express = require('express');
const Stripe = require('stripe');

const app = express();
const port = process.env.PORT || 3000;
const stripeSecret = process.env.STRIPE_SECRET_KEY;

let stripe;
if (stripeSecret) {
  stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });
} else {
  console.warn('STRIPE_SECRET_KEY not set; /api/stripe-payments will return empty data');
}

app.get('/api/stripe-payments', async (req, res) => {
  if (!stripe) {
    return res.json([]);
  }
  try {
    const invoices = await stripe.invoices.list({ limit: 10 });
    const results = invoices.data.map(inv => {
      const customer = inv.customer_details || {};
      const addr = customer.address || {};
      const metadata = inv.metadata || {};
      return {
        name: customer.name || '',
        email: customer.email || '',
        patientAddress: [addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(', '),
        state: addr.state || '',
        programNumber: metadata.program_number || '',
        invoiceClosed: inv.status === 'paid' ? 'Yes' : 'No',
        orderPlacedBy: metadata.order_placed_by || '',
        prescriber: metadata.prescriber || '',
        comments: metadata.comments || '',
        stripeInvoice: inv.hosted_invoice_url || ''
      };
    });
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

app.use(express.static('.'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
