const router = require('express').Router();

router.get('/shop/shirts', (req, res) => {
  res.send('셔츠');
});

router.get('/shop/pants', (req, res) => {
  res.send('바지');
});

module.exports = router;
