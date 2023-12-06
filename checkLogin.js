function checkLogin(req, res, next) {
  if (!req.user) {
    res.send('회원만 볼 수 있는 페이지 입니다.');
  } else {
    next();
  }
}

module.exports = checkLogin;
