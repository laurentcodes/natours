/* eslint-disable */

const stripe = Stripe(
  'pk_test_51SuwXSJRPtdTBd4xep0pfqUG1z6sHKI6sCTjPFYFcD9Jp0ozlcMl4Hp0X1nwYsJlDKEacqXUXoBT8Oj925qwzNGO00I25JtgsH',
);

const bookTour = async (tourID) => {
  try {
    // 1) Get Checkout Session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourID}`);

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
