const Review = require('../models/reviewModel');

const catchAsync = require('../utils/catchAsync');

const getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find();

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews },
  });
});

const createReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.create({ ...req.body, user: req.user._id });

  res.status(201).json({
    status: 'success',
    data: { review: newReview },
  });
});

module.exports = {
  getAllReviews,
  createReview,
};
