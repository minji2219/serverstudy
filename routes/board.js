const router = require('express').Router();
const checkLogin = require('./../checkLogin.js');

router.get('/sports', checkLogin, (요청, 응답) => {
  응답.send('스포츠 게시판');
});
router.get('/game', checkLogin, (요청, 응답) => {
  응답.send('게임 게시판');
});

module.exports = router;
