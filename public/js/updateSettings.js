/* eslint-disable */

// type is either password or data
const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/update-password'
        : '/api/v1/users/update-me';

    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} Updated Successfully.`);

      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

document.querySelector('#form-account').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const photo = document.getElementById('photo').files[0];

  const form = new FormData();

  form.append('name', name);
  form.append('email', email);
  form.append('photo', photo);

  updateSettings(form, 'data');
});

document
  .querySelector('#form-password')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    document.querySelector('.btn--save-password').innerHTML = 'Updating...';

    const password = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    await updateSettings(
      { password, newPassword, passwordConfirm },
      'password',
    );

    document.querySelector('.btn--save-password').innerHTML = 'Save Password';

    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
