module.exports = async () => {
    // Only run in production (optional)
    if (process.env.NODE_ENV !== 'production') return;
  
    const adminUser = {
      email: 'andrewmwine@duck.com',    // Change to your email
      password: 'Sh@ka+f1ki_mine', // Change to a strong password
      firstname: 'Andrew',
      lastname: 'Mwine',
    };
  
    // Import Strapi's core services
    const { createAdminUser } = require('@strapi/strapi').admin;
    const { findOne } = require('@strapi/strapi').admin.services.user;
  
    const existingAdmin = await findOne({ email: adminUser.email });
    if (!existingAdmin) {
      await createAdminUser(adminUser);
      console.log(`✅ Admin user created: ${adminUser.email}`);
    } else {
      console.log(`ℹ️ Admin user already exists: ${adminUser.email}`);
    }
  };