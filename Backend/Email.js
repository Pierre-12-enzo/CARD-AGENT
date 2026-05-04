// Welcome email
await sendEmail({
    to: user.email,
    subject: `🎓 Welcome to CAP, ${user.firstName}!`,
    template: 'welcome',
    context: {
        firstName: user.firstName,
        schoolName: school.name,
        planName: plan.name,
        studentLimit: plan.limits.maxStudents,
        staffLimit: plan.limits.maxStaff,
        storage: plan.limits.storageMB,
        isTrial: plan.type === 'trial',
        trialDays: plan.trialDays,
        trialEndDate: user.subscription.trialEndsAt?.toLocaleDateString(),
        dashboardUrl: `${FRONTEND_URL}/dashboard`,
        setupGuideUrl: `${FRONTEND_URL}/guides/setup`,
        verificationUrl: `${FRONTEND_URL}/verify-email?token=${token}`,
        isEmailVerified: user.isEmailVerified
    }
});

// Staff invite
await sendEmail({
    to: staff.email,
    subject: `🏫 You've been added to ${school.name}`,
    template: 'staff-invite',
    context: {
        firstName: staff.firstName,
        schoolName: school.name,
        adminName: admin.firstName,
        email: staff.email,
        tempPassword: tempPassword,
        loginUrl: `${FRONTEND_URL}/login`,
        changePasswordUrl: `${FRONTEND_URL}/change-password`,
        permissions: ['View Analytics', 'Generate Cards', 'Mark Attendance']
    }
});

// Payment confirmation
await sendEmail({
    to: user.email,
    subject: '💰 Payment Confirmed - CAP Subscription Active!',
    template: 'payment-confirmation',
    context: {
        firstName: user.firstName,
        planName: plan.name,
        amount: subscription.amount,
        currency: 'XAF',
        billingCycle: 'monthly',
        invoiceNumber: invoice.number,
        invoiceStatus: 'Paid',
        paymentDate: new Date().toLocaleDateString(),
        paymentMethod: 'Mobile Money',
        transactionId: transaction.id,
        periodStart: subscription.currentPeriodStart.toLocaleDateString(),
        periodEnd: subscription.currentPeriodEnd.toLocaleDateString(),
        nextBillingDate: subscription.currentPeriodEnd.toLocaleDateString(),
        features: [
            { icon: '📊', name: 'Advanced Analytics' },
            { icon: '👥', name: 'Unlimited Students' }
        ],
        invoiceUrl: `${FRONTEND_URL}/billing/invoice/${invoice.id}`,
        dashboardUrl: `${FRONTEND_URL}/dashboard`
    }
});

// Password reset
await sendEmail({
    to: user.email,
    subject: '🔐 Reset Your CAP Password',
    template: 'password-reset',
    context: {
        firstName: user.firstName,
        resetUrl: `${FRONTEND_URL}/reset-password?token=${resetToken}`,
        expiryHours: 1,
        supportEmail: 'support@cap.com'
    }
});

// Subscription expiring
await sendEmail({
    to: user.email,
    subject: '⚠️ Your CAP Subscription Expires Soon',
    template: 'subscription-expiring',
    context: {
        schoolName: school.name,
        planName: plan.name,
        daysRemaining: 5,
        expiryDate: subscription.currentPeriodEnd.toLocaleDateString(),
        renewalUrl: `${FRONTEND_URL}/billing/renew`,
        upgradeUrl: `${FRONTEND_URL}/plans`,
        billingUrl: `${FRONTEND_URL}/billing`,
        billingEmail: 'billing@cap.com'
    }
});