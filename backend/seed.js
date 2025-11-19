const mongoose = require('mongoose');
const User = require('./models/User');
const Job = require('./models/Job');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({});
  await Job.deleteMany({});
  const pass = await bcrypt.hash('password', 10);
  const company = await User.create({ name:'Acme Corp', email:'hr@acme.com', passwordHash:pass, role:'company', companyName:'Acme Corp' });
  const candidate = await User.create({ name:'Jane Doe', email:'jane@example.com', passwordHash:pass, role:'candidate', skills:['javascript','node'] });
  await Job.create({ title:'Fullstack Developer', description:'Work on web apps', location:'Remote', skills:['javascript','node','react'], company:company._id });
  console.log('Seeded. company login: hr@acme.com / password, candidate: jane@example.com / password');
  process.exit();
}
run();
