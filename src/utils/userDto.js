const toUserDto = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    firstName: user.firstName,
    email: user.email,
    isEmailVeried: user.isEmailVeried,
    image: user.image,
    gender: user.gender,
  };
};

module.exports = { toUserDto };
