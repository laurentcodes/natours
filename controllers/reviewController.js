const Review = require('../models/reviewModel');

const factory = require('./handlerFactory');

const setTourUserIds = (req, res, next) => {
  // Allow Nested Routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

// const createReview = catchAsync(async (req, res, next) => {
//   // const newReview = await Review.create({ ...req.body, user: req.user._id });
//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: { review: newReview },
//   });
// });

const getAllReviews = factory.getAll(Review);
const getReview = factory.getOne(Review);
const createReview = factory.createOne(Review);
const updateReview = factory.updateOne(Review);
const deleteReview = factory.deleteOne(Review);

module.exports = {
  getAllReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  setTourUserIds,
};
