import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load variables from .env
dotenv.config();

async function test() {
  console.log(
    "Connecting to SMTP server at",
    process.env.EMAIL_SERVER_HOST,
    "...",
  );

  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT, 10),
    secure: true, // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "mayagurova1405@gmail.com",
      subject: "Test",
      text: "хай боссссссс, я админ так то ща, а не раб",
    });
    console.log(
      "Success! Your Zoho email setup is working perfectly. Email was sent!",
    );
  } catch (error) {
    console.error("Error connecting or sending email:");
    console.error(error);
  }
}

test();
