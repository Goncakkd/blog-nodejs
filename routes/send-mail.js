var nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "goncakaradenizfake@gmail.com",
    pass: "Fakehesap123",
  },
});

function sendEmail(mailOptions) {
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
      return info.response;
    }
  });
}

module.exports = { sendEmail };
