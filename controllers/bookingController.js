const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/userModel');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');

const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

const getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourID } = req.params;

  // 1) Get the currently booked tour
  const tour = await Tour.findById(tourID);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    // payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get(
    //   'host',
    // )}/my-tours?tour=${tourID}&user=${req.user.id}&price=${tour.price}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: tourID,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });

  // console.log(session);

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// const createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is temporary as it's Unsecure
//   const { tour, user, price } = req.query;

//   if (!tour && !user && !price) return next();

//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].price_data.unit_amount / 100;

  await Booking.create({ tour, user, price });
};

const webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

const createBooking = factory.createOne(Booking);
const getAllBookings = factory.getAll(Booking);
const getBooking = factory.getOne(Booking);
const updateBooking = factory.updateOne(Booking);
const deleteBooking = factory.deleteOne(Booking);

module.exports = {
  getCheckoutSession,
  // createBookingCheckout,
  webhookCheckout,
  createBooking,
  getAllBookings,
  getBooking,
  updateBooking,
  deleteBooking,
};
