const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

// Create transporter
const createTransporter = () => {
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_EMAIL || 'your-ethereal-email',
                pass: process.env.ETHEREAL_PASSWORD || 'your-ethereal-password'
            }
        });
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
    });
};

let transporter = createTransporter();

const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email service ready');
    } catch (error) {
        console.error('❌ Email service error:', error);
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Falling back to ethereal.email for testing');
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.ETHEREAL_EMAIL || 'your-ethereal-email',
                    pass: process.env.ETHEREAL_PASSWORD || 'your-ethereal-password'
                }
            });
        }
    }
};

verifyConnection();

/**
 * Compile email template
 */
const compileTemplate = async (templateName, context) => {
    try {
        const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
        console.log('📁 Reading template from:', templatePath);
        const source = await fs.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(source);
        return template(context);
    } catch (error) {
        console.error(`❌ Template error for ${templateName}:`, error.message);
        return `
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>CARD-AGENT</h2>
                <p>Template "${templateName}" could not be loaded.</p>
                <pre style="background:#f5f5f5;padding:10px;border-radius:8px;">${JSON.stringify(context, null, 2)}</pre>
            </body>
        </html>`;
    }
};

// Handlebars helpers
handlebars.registerHelper('eq', function (a, b) { return a === b; });
handlebars.registerHelper('gt', function (a, b) { return a > b; });
handlebars.registerHelper('includes', function (array, value) { return array && array.includes(value); });
handlebars.registerHelper('formatDate', function (date) { return new Date(date).toLocaleDateString(); });
handlebars.registerHelper('formatDateTime', function (date) { return new Date(date).toLocaleString(); });
handlebars.registerHelper('default', function (value, fallback) { return value || fallback; });

/**
 * Send email
 */
const sendEmail = async ({ to, subject, template, context, attachments = [], bcc = [] }) => {
    try {
        console.log(`📧 Sending email to: ${to} | Template: ${template}`);

        const fullContext = {
            ...context,
            currentYear: new Date().getFullYear(),
            appName: 'CARD-AGENT',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@cardagent.rw',
            websiteUrl: process.env.FRONTEND_URL || 'https://cardagent.rw',
            privacyPolicyUrl: `${process.env.FRONTEND_URL || 'https://cardagent.rw'}/privacy`,
            termsUrl: `${process.env.FRONTEND_URL || 'https://cardagent.rw'}/terms`,
            companyAddress: process.env.COMPANY_ADDRESS || 'Kigali, Rwanda',
            logoUrl: `${process.env.FRONTEND_URL || 'https://cardagent.rw'}/logo.png`,
            primaryColor: '#DC2626',
            darkColor: '#0F172A'
        };

        const html = await compileTemplate(template, fullContext);
        console.log('📄 HTML preview:', html.substring(0, 200) + '...');

        const mailOptions = {
            from: `"CARD-AGENT" <${process.env.EMAIL_FROM || 'noreply@cardagent.rw'}>`,
            to,
            bcc: [...bcc, process.env.ADMIN_EMAIL].filter(Boolean),
            subject,
            html
        };

        if (attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}`);

        if (process.env.NODE_ENV === 'development') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId, preview: nodemailer.getTestMessageUrl(info) };
    } catch (error) {
        console.error('❌ Send email error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send bulk emails
 */
const sendBulkEmails = async (emails) => {
    const results = [];
    for (const email of emails) {
        try {
            const result = await sendEmail(email);
            results.push({ ...email, ...result });
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            results.push({ ...email, success: false, error: error.message });
        }
    }
    return results;
};

/**
 * Test email configuration
 */
const testEmailConfig = async (testEmail) => {
    try {
        const result = await sendEmail({
            to: testEmail,
            subject: 'CARD-AGENT - Test Email',
            template: 'welcome',
            context: {
                firstName: 'Test User',
                companyName: 'Test Company',
                dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
                licenseStatus: 'active'
            }
        });

        return {
            success: true,
            message: 'Test email sent successfully',
            preview: result.preview,
            config: {
                host: transporter.options.host,
                port: transporter.options.port,
                secure: transporter.options.secure
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ============================================
// CARD-AGENT SPECIFIC EMAIL FUNCTIONS
// ============================================

/**
 * Send welcome email after registration
 */
const sendWelcomeEmail = async (user, company) => {
    return sendEmail({
        to: user.email,
        subject: `Welcome to CARD-AGENT, ${user.firstName}!`,
        template: 'welcome',
        context: {
            firstName: user.firstName,
            lastName: user.lastName,
            companyName: company.name,
            licenseStatus: company.license?.status || 'pending',
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
            setupGuideUrl: `${process.env.FRONTEND_URL}/guides/setup`
        }
    });
};

/**
 * Send co-worker invitation email
 */
const sendCoWorkerInvite = async (coWorker, company, adminName, tempPassword) => {
    const orgNames = coWorker.permissions?.map(p => p.organizationName).join(', ') || 'No organizations assigned';

    return sendEmail({
        to: coWorker.email,
        subject: `You've been invited to join ${company.name} - CARD-AGENT`,
        template: 'co-worker-invite',
        context: {
            firstName: coWorker.firstName,
            companyName: company.name,
            adminName: adminName,
            email: coWorker.email,
            tempPassword: tempPassword,
            organizations: orgNames,
            loginUrl: `${process.env.FRONTEND_URL}/login`,
            changePasswordUrl: `${process.env.FRONTEND_URL}/change-password`
        }
    });
};

/**
 * Send license activated notification
 */
const sendLicenseActivatedEmail = async (user, company) => {
    return sendEmail({
        to: user.email,
        subject: `Your CARD-AGENT License is Now Active!`,
        template: 'license-activated',
        context: {
            firstName: user.firstName,
            companyName: company.name,
            licenseKey: company.license?.key,
            maxOrganizations: company.license?.maxOrganizations || 'Unlimited',
            maxCardsPerMonth: company.license?.maxCardsPerMonth?.toLocaleString() || 'Unlimited',
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        }
    });
};

/**
 * Send license revoked notification
 */
const sendLicenseRevokedEmail = async (user, company, reason) => {
    return sendEmail({
        to: user.email,
        subject: `Important: Your CARD-AGENT License Has Been Revoked`,
        template: 'license-revoked',
        context: {
            firstName: user.firstName,
            companyName: company.name,
            reason: reason || 'Your license has been revoked. Please contact support for more information.',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@cardagent.rw'
        }
    });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
    return sendEmail({
        to: user.email,
        subject: 'Reset Your CARD-AGENT Password',
        template: 'password-reset',
        context: {
            firstName: user.firstName,
            resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
            expiryHours: 1
        }
    });
};

/**
 * Send account deactivated notification
 */
const sendAccountDeactivatedEmail = async (user, companyName, adminName) => {
    return sendEmail({
        to: user.email,
        subject: `Your CARD-AGENT Account Has Been Deactivated`,
        template: 'account-deactivated',
        context: {
            firstName: user.firstName,
            companyName: companyName,
            adminName: adminName,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@cardagent.rw'
        }
    });
};

/**
 * Send account permanently deleted notification
 */
const sendAccountDeletedPermanentEmail = async (user, companyName, adminUser) => {
    return sendEmail({
        to: user.email,
        subject: `Your CARD-AGENT Account Has Been Permanently Deleted`,
        template: 'account-deleted-permanent',
        context: {
            firstName: user.firstName,
            email: user.email,
            companyName: companyName,
            adminName: `${adminUser.firstName} ${adminUser.lastName}`,
            deletionDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }),
            year: new Date().getFullYear()
        }
    });
};

/**
 * Send permissions updated notification
 * coWorker = co-worker user object
 * company = company object
 * adminUser = admin who updated permissions
 * permissionsData = array of { organizationName, changes: [{name, added, removed, unchanged}] }
 */
const sendPermissionsUpdatedEmail = async (coWorker, company, adminUser, permissionsData) => {
    return sendEmail({
        to: coWorker.email,
        subject: `Your CARD-AGENT Permissions Have Been Updated`,
        template: 'permissions-updated',
        context: {
            firstName: coWorker.firstName,
            companyName: company.name,
            adminName: `${adminUser.firstName} ${adminUser.lastName}`,
            permissions: permissionsData,
            loginUrl: `${process.env.FRONTEND_URL}/login`
        }
    });
};


/**
 * Send super admin alert for new registration
 * Queries DB to find ALL super admins
 */
const sendNewRegistrationAlert = async (company, adminUser) => {
    try {
        const User = require('../models/User');
        const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('email firstName');

        console.log('🔍 Found super admins:', superAdmins.length, superAdmins.map(a => a.email));

        if (superAdmins.length === 0) {
            console.log('⚠️ No super admin found in database');
            return { success: false, error: 'No super admin found' };
        }

        // Send to ALL super admins
        const results = [];
        for (const superAdmin of superAdmins) {
            const result = await sendEmail({
                to: superAdmin.email,
                subject: `🆕 New Company Registration: ${company.name}`,
                template: 'admin-new-registration',
                context: {
                    superAdminName: superAdmin.firstName,
                    companyName: company.name,
                    adminName: `${adminUser.firstName} ${adminUser.lastName}`,
                    adminEmail: adminUser.email,
                    companyPhone: company.phone,
                    companyAddress: `${company.address?.district}, ${company.address?.province}`,
                    registrationDate: new Date().toLocaleString(),
                    manageLicensesUrl: `${process.env.FRONTEND_URL}/super-admin/licenses`
                }
            });
            results.push(result);
            console.log(`📧 Alert sent to super admin: ${superAdmin.email}`);
        }

        return { success: true, sentTo: superAdmins.map(a => a.email) };
    } catch (error) {
        console.error('❌ Failed to send super admin alert:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendEmail,
    sendBulkEmails,
    testEmailConfig,
    verifyConnection,
    // CARD-AGENT specific
    sendWelcomeEmail,
    sendCoWorkerInvite,
    sendLicenseActivatedEmail,
    sendLicenseRevokedEmail,
    sendPasswordResetEmail,
    sendAccountDeactivatedEmail,
    sendPermissionsUpdatedEmail,
    sendAccountDeletedPermanentEmail,
    sendNewRegistrationAlert
};