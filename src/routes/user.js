const express = require('express');
const multer = require('multer');
const User = require('../models/user');
const auth = require('../middleware/auth');
// const { user } = require('../../public/js/login');
const router = new express.Router();

router.post('/app', (req, res) => {
    console.log(req.body);
});

module.exports = router;