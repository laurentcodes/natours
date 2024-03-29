/* eslint-disable */

const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });

    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('error', 'Error Logging Out! Try again');
  }
};

document.querySelector('.nav__el--logout').addEventListener('click', logout);
