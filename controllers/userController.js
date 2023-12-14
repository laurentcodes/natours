const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

const getCurrentUser = catchAsync(async (req, res, next) => {
  req.params.id = req.user.id;

  next();
});

const updateCurrentUser = catchAsync(async (req, res, next) => {
  const { id } = req.user;

  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    throw new AppError(
      'This route is not for password updates. Please use /update-password.',
      400,
    );
  }

  // 2) Filter out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

const deleteCurrentUser = catchAsync(async (req, res, next) => {
  const { id } = req.user;

  await User.findByIdAndUpdate(id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead.',
  });
};

const getAllUsers = factory.getAll(User);
const getUser = factory.getOne(User);
const updateUser = factory.updateOne(User); // -> DO NOT update passwords with this!
const deleteUser = factory.deleteOne(User);

module.exports = {
  getCurrentUser,
  getAllUsers,
  getUser,
  updateCurrentUser,
  deleteCurrentUser,
  createUser,
  updateUser,
  deleteUser,
};
