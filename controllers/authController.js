const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: req.secure || req.headers('x-forwarded-proto') === 'https',
  });

  // Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

const signUp = catchAsync(async (req, res, next) => {
  const { name, email, role, password, passwordConfirm, passwordChangedAt } =
    req.body;

  const newUser = await User.create({
    name,
    email,
    password,
    role,
    passwordConfirm,
    passwordChangedAt,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password exist
  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400);
  }

  // 2) check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  const correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    throw new AppError('Incorrect email or password.', 401);
  }

  // 3) if everything ok, send token to client
  createSendToken(user, 200, req, res);
});

const logout = async (req, res) => {
  // res.cookie('jwt', 'loggedout', {
  //   expires: new Date(Date.now() + 10 * 1000),
  //   httpOnly: true,
  // });

  res.clearCookie('jwt');
  res.status(200).json({ status: 'success' });
};

const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1)) getting token and check if it's there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    throw new AppError(
      'You are not logged in! Please login to get access',
      401,
    );
  }

  // 2) verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    throw new AppError(
      'The user belonging to this token does no longer exist.',
      401,
    );
  }

  // 4) check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    throw new AppError(
      'User recently changed password! Please log in again.',
      401,
    );
  }

  // Grant Access to Protected Route
  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

// ONly for rendered pages, no errors
const isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) verification of token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    // 2) check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next();
    }

    // 3) check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    // There is a login user
    res.locals.user = currentUser;

    return next();
  }

  next();
});

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    // .. roles ['admin', 'lead-guide'] role = 'user'
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        'You do not have permission to perform this action',
        403,
      );
    }

    next();
  };

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // 1) Get user based on posted email
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('There is no user with email address.', 404);
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // const message = `Forgot your password? Submit a PATCH request with your new password and password confirm to" ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    // await sendEmail({
    //   email,
    //   subject: 'Your password reset token (valid for 10 min)',
    //   message,
    // });

    // 3) send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    throw new AppError(
      'There was an error sending the email. Try again later!',
      500,
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  const { token: resetToken } = req.params;
  const { password, passwordConfirm } = req.body;

  // 1) Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired and there is a user, set the new password
  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3) Update changedPasswordAt property for the user -> happens in model pre middleware

  // 4) Log the user in
  createSendToken(user, 200, req, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm, newPassword } = req.body;

  // 1) Get user from collection
  const user = await User.findById(req.user._id).select('+password');
  const correct = await user.correctPassword(password, user.password);

  // 2) Check if posted current password is correct
  if (!correct) {
    throw new AppError('Current password entered is incorrect', 401);
  }

  // 3) If so, update password
  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;

  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

module.exports = {
  signUp,
  login,
  logout,
  protect,
  isLoggedIn,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
};
