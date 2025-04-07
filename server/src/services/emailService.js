// server/src/services/emailService.js
import dotenv from "dotenv";
import fs from "fs";
import Handlebars from "handlebars";
import nodemailer from "nodemailer";
import path from "path";
import logger from "../utils/logger.js";

dotenv.config();

// Create a transporter with configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Cache for email templates
const templateCache = new Map();

/**
 * Load and compile an email template
 * @param {string} templateName - Name of the template file without extension
 * @returns {Function} Compiled Handlebars template function
 */
const loadTemplate = (templateName) => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  try {
    const templatePath = path.resolve(
      process.cwd(),
      "src/templates/emails",
      `${templateName}.hbs`
    );
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const compiledTemplate = Handlebars.compile(templateContent);
    templateCache.set(templateName, compiledTemplate);
    return compiledTemplate;
  } catch (error) {
    logger.error(`Failed to load email template: ${templateName}`, { error });
    throw new Error(`Failed to load email template: ${templateName}`);
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (without extension)
 * @param {Object} options.context - Data to pass to the template
 * @param {string[]} [options.cc] - CC recipients
 * @param {string[]} [options.bcc] - BCC recipients
 * @param {string} [options.from] - Sender email address (defaults to EMAIL_FROM env var)
 * @param {Object[]} [options.attachments] - Array of attachment objects
 * @returns {Promise<Object>} Nodemailer send result
 */
export const sendEmail = async (options) => {
  try {
    if (!options.to) {
      throw new Error("Recipient email address is required");
    }

    // Load and compile the template
    const compiledTemplate = loadTemplate(options.template);
    const html = compiledTemplate(options.context);

    // Prepare email options
    const mailOptions = {
      from:
        options.from ||
        process.env.EMAIL_FROM ||
        "noreply@projectmanagement.com",
      to: options.to,
      subject: options.subject,
      html,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    return info;
  } catch (error) {
    logger.error("Failed to send email", {
      error,
      to: options.to,
      subject: options.subject,
    });
    throw error;
  }
};

/**
 * Send a bulk email to multiple recipients
 * @param {Object} options - Email options
 * @param {string[]} options.to - Array of recipient email addresses
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name
 * @param {Object} options.context - Data to pass to the template
 * @param {boolean} [options.useIndividualEmails=false] - Whether to send individual emails (true) or use BCC (false)
 * @returns {Promise<Object[]>} Array of Nodemailer send results
 */
export const sendBulkEmail = async (options) => {
  try {
    if (!options.to || !Array.isArray(options.to) || options.to.length === 0) {
      throw new Error("At least one recipient email address is required");
    }

    if (options.useIndividualEmails) {
      // Send individual emails to each recipient
      const promises = options.to.map((recipient) =>
        sendEmail({
          ...options,
          to: recipient,
        })
      );
      return Promise.all(promises);
    } else {
      // Send a single email with BCC
      return sendEmail({
        ...options,
        to: options.to[0],
        bcc: options.to.slice(1),
      });
    }
  } catch (error) {
    logger.error("Failed to send bulk email", {
      error,
      recipientCount: options.to?.length,
      subject: options.subject,
    });
    throw error;
  }
};

export default {
  sendEmail,
  sendBulkEmail,
};
