const express = require('express');
const admin = require('../../config/firebase-config');
const emailService = require('../services/emailService');
const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: '請填寫所有欄位' });
    }

    const contactId = `CONTACT${Date.now()}`;

    await admin.firestore().collection('contacts').doc(contactId).set({
      id: contactId,
      name: name,
      email: email,
      subject: subject,
      message: message,
      status: 'new',
      submittedAt: new Date().toISOString(),
    });

    await emailService.sendContactReply(email, {
      name: name,
      message: message,
      id: contactId,
    });

    await emailService.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `[新聯絡] ${subject}`,
      html: `
        <h3>有新的聯絡訊息</h3>
        <p><strong>名稱：</strong> ${name}</p>
        <p><strong>Email：</strong> ${email}</p>
        <p><strong>主旨：</strong> ${subject}</p>
        <p><strong>訊息：</strong></p>
        <p>${message}</p>
        <hr>
        <p>訊息ID：${contactId}</p>
      `,
    });

    res.json({
      success: true,
      message: '✅ 訊息已提交，我們會盡快回覆您！',
      contactId: contactId,
    });
  } catch (error) {
    console.error('聯絡表單錯誤:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;