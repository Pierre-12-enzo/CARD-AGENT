
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

// Create transporter - GMAIL for production
const createTransporter = () => {
    if (process.env.NODE_ENV === 'production') {
        console.log('🚀 Configuring Gmail SMTP for production');

        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // false for 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            family: 4, // Force IPv4
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
    }

    // DEVELOPMENT
    console.log('🔧 Using ethereal.email for development');
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: process.env.ETHEREAL_EMAIL || 'your-ethereal-email',
            pass: process.env.ETHEREAL_PASSWORD || 'your-ethereal-password'
        }
    });
};

let transporter = createTransporter();

const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email service ready');
        console.log(`📧 Using: ${process.env.NODE_ENV === 'production' ? 'Gmail SMTP' : 'Ethereal'}`);

        if (process.env.NODE_ENV === 'production') {
            console.log('🚀 Production email active with Gmail');
        }
    } catch (error) {
        console.error('❌ Email service error:', error);

        if (process.env.NODE_ENV === 'production') {
            console.error('🚨 CRITICAL: Email service failed in production!');
            console.error('📧 Check Gmail credentials in environment variables');
            console.error('Make sure "Less secure app access" is ON or use App Password');
        } else {
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

// Register Handlebars helpers
handlebars.registerHelper('eq', function (a, b) { return a === b; });
handlebars.registerHelper('gt', function (a, b) { return a > b; });
handlebars.registerHelper('includes', function (array, value) { return array && array.includes(value); });
handlebars.registerHelper('formatDate', function (date) { return new Date(date).toLocaleDateString(); });
handlebars.registerHelper('formatDateTime', function (date) { return new Date(date).toLocaleString(); });
handlebars.registerHelper('default', function (value, fallback) { return value || fallback; });
handlebars.registerHelper('split', function (str, separator) {
    if (!str) return [];
    return str.split(separator);
});

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

/**
 * Send email
 */
const sendEmail = async ({ to, subject, template, context, attachments = [], bcc = [] }) => {
    try {
        console.log(`📧 Sending email to: ${to} | Template: ${template}`);
        console.log(`🔧 Using: ${process.env.NODE_ENV === 'production' ? 'Gmail' : 'Ethereal'}`);

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
        console.log('📄 HTML length:', html.length);

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"CARD-AGENT" <${process.env.EMAIL_USER}>`,
            to,
            bcc: [...bcc, process.env.ADMIN_EMAIL].filter(Boolean),
            subject,
            html
        };

        if (attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
        console.log(`📊 Message ID: ${info.messageId}`);

        if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId, preview: nodemailer.getTestMessageUrl(info) };
    } catch (error) {
        console.error('❌ Send email error DETAILS:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            to: to,
            template: template
        });
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
            await new Promise(resolve => setTimeout(resolve, 50000));
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
                service: process.env.NODE_ENV === 'production' ? 'Gmail' : 'Ethereal',
                environment: process.env.NODE_ENV
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
const sendCoWorkerInvite = async (coWorker, company, adminUser, tempPassword) => {
    const orgNames = coWorker.permissions?.map(p => p.organizationName).join(', ') || 'No organizations assigned';

    const adminNameString = typeof adminUser === 'object'
        ? `${adminUser.firstName || adminUser.name || ''} ${adminUser.lastName || ''}`.trim()
        : adminUser;

    return sendEmail({
        to: coWorker.email,
        subject: `You've been invited to join ${company.name} - CARD-AGENT`,
        template: 'co-worker-invite',
        context: {
            firstName: coWorker.firstName,
            companyName: company.name,
            adminName: adminNameString,
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
const sendAccountDeactivatedEmail = async (user, companyName, adminUser) => {
    const adminNameString = typeof adminUser === 'object'
        ? `${adminUser.firstName || adminUser.name || ''} ${adminUser.lastName || ''}`.trim()
        : adminUser;

    return sendEmail({
        to: user.email,
        subject: `Your CARD-AGENT Account Has Been Deactivated`,
        template: 'account-deactivated',
        context: {
            firstName: user.firstName,
            companyName: companyName,
            adminName: adminNameString,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@cardagent.rw'
        }
    });
};

/**
 * Send account permanently deleted notification
 */
const sendAccountDeletedPermanentEmail = async (user, companyName, adminUser) => {
    const adminNameString = typeof adminUser === 'object'
        ? `${adminUser.firstName || adminUser.name || ''} ${adminUser.lastName || ''}`.trim()
        : adminUser;

    return sendEmail({
        to: user.email,
        subject: `Your CARD-AGENT Account Has Been Permanently Deleted`,
        template: 'account-deleted-permanent',
        context: {
            firstName: user.firstName,
            email: user.email,
            companyName: companyName,
            adminName: adminNameString,
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
 */
const sendPermissionsUpdatedEmail = async (coWorker, company, adminUser, permissionsData) => {
    const adminNameString = typeof adminUser === 'object'
        ? `${adminUser.firstName || adminUser.name || ''} ${adminUser.lastName || ''}`.trim()
        : adminUser;

    const formattedPermissions = [];

    let newPermissions = permissionsData;
    let oldPermissions = [];

    if (permissionsData && permissionsData.to) {
        newPermissions = permissionsData.to;
        oldPermissions = permissionsData.from || [];
    }

    const orgPermissionsMap = new Map();

    for (const perm of newPermissions) {
        const orgId = perm.organizationId?.toString() || perm.organizationId;
        if (!orgPermissionsMap.has(orgId)) {
            orgPermissionsMap.set(orgId, {
                organizationName: perm.organizationName,
                permissions: new Set(),
                oldPermissions: new Set()
            });
        }

        const permKeys = [
            'canManageStudents', 'canGenerateCards', 'canManageTemplates',
            'canUploadCSV', 'canUploadPhotos', 'canViewAnalytics',
            'canViewAuditLogs', 'canMarkAttendance'
        ];

        for (const key of permKeys) {
            if (perm[key] === true) {
                orgPermissionsMap.get(orgId).permissions.add(formatPermissionName(key));
            }
        }
    }

    for (const perm of oldPermissions) {
        const orgId = perm.organizationId?.toString() || perm.organizationId;
        if (orgPermissionsMap.has(orgId)) {
            const permKeys = [
                'canManageStudents', 'canGenerateCards', 'canManageTemplates',
                'canUploadCSV', 'canUploadPhotos', 'canViewAnalytics',
                'canViewAuditLogs', 'canMarkAttendance'
            ];

            for (const key of permKeys) {
                if (perm[key] === true) {
                    orgPermissionsMap.get(orgId).oldPermissions.add(formatPermissionName(key));
                }
            }
        }
    }

    for (const [orgId, data] of orgPermissionsMap) {
        const changes = [];
        const allPerms = new Set([...data.permissions, ...data.oldPermissions]);

        for (const permName of allPerms) {
            const hasNow = data.permissions.has(permName);
            const hadBefore = data.oldPermissions.has(permName);

            if (hasNow && !hadBefore) {
                changes.push({ name: permName, added: true, removed: false, unchanged: false });
            } else if (!hasNow && hadBefore) {
                changes.push({ name: permName, added: false, removed: true, unchanged: false });
            } else if (hasNow && hadBefore) {
                changes.push({ name: permName, added: false, removed: false, unchanged: true });
            }
        }

        if (changes.length > 0) {
            formattedPermissions.push({
                organizationName: data.organizationName,
                changes: changes
            });
        }
    }

    return sendEmail({
        to: coWorker.email,
        subject: `Your CARD-AGENT Permissions Have Been Updated`,
        template: 'permissions-updated',
        context: {
            firstName: coWorker.firstName,
            companyName: company.name,
            adminName: adminNameString,
            permissions: formattedPermissions,
            loginUrl: `${process.env.FRONTEND_URL}/login`
        }
    });
};

function formatPermissionName(key) {
    const names = {
        'canManageStudents': 'Manage Students',
        'canGenerateCards': 'Generate Cards',
        'canManageTemplates': 'Manage Templates',
        'canUploadCSV': 'Upload CSV',
        'canUploadPhotos': 'Upload Photos',
        'canViewAnalytics': 'View Analytics',
        'canViewAuditLogs': 'View Audit Logs',
        'canMarkAttendance': 'Mark Attendance'
    };
    return names[key] || key.replace('can', '').replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Send super admin alert for new registration
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

        const adminNameString = `${adminUser.firstName} ${adminUser.lastName}`;

        const results = [];
        for (const superAdmin of superAdmins) {
            const result = await sendEmail({
                to: superAdmin.email,
                subject: `🆕 New Company Registration: ${company.name}`,
                template: 'admin-new-registration',
                context: {
                    superAdminName: superAdmin.firstName,
                    companyName: company.name,
                    adminName: adminNameString,
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