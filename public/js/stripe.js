/* eslint-disable */

const stripe = Stripe(
  'pk_test_51OY6nEJ6RKTyIiKQamat1XuhjsDnljn0DCcY1o77hkYBste3oVUZiSfi7xSLpyLLfhMoFUn4Q3GRnUz2Ia0v3X7s00PnxMF7oo',
);

const bookTour = async (tourID) => {
  try {
    // 1) Get Checkout Session from API
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourID}`,
    );

    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

document.getElementById('book-tour').addEventListener('click', (e) => {
  e.target.textContent = 'Processing...';

  const { tourId } = e.target.dataset;

  bookTour(tourId);
});
