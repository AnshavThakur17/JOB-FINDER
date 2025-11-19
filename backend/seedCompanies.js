// backend/seedCompanies.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Job = require('./models/Job');

async function connect() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser:true, useUnifiedTopology:true });
  console.log('Connected to mongo');
}

async function run() {
  await connect();

  // create company if not exists
  const companyEmail = 'hr@acme.com';
  let company = await User.findOne({ email: companyEmail });
  if (!company) {
    const passHash = await bcrypt.hash('password', 10);
    company = new User({
      name: 'ACME HR',
      email: companyEmail,
      passwordHash: passHash,
      role: 'company',
      companyName: 'Acme Corp'
    });
    await company.save();
    console.log('Created default company', companyEmail);
  } else console.log('Company exists', companyEmail);

  // optional: create other companies
  const other = [
    { name: 'BlueTech HR', email: 'hr@bluetech.com', companyName: 'BlueTech' },
    { name: 'GreenSoft HR', email: 'hr@greensoft.com', companyName: 'GreenSoft' }
  ];
  for(const o of other){
    const ex = await User.findOne({ email: o.email });
    if(!ex){
      const h = await bcrypt.hash('password', 10);
      const u = new User({ name: o.name, email: o.email, passwordHash: h, role: 'company', companyName: o.companyName });
      await u.save();
      console.log('Created', o.email);
    }
  }

  // create many jobs for hr@acme.com
  const companyUser = company;
  const titles = ['Frontend Engineer', 'Backend Developer', 'Fullstack', 'DevOps', 'QA Engineer'];
  const skillsPool = [['react','css'], ['node','express'], ['docker','k8s'], ['java','spring'], ['python','django']];
  for(let i=0;i<50;i++){
    const title = `${titles[i%titles.length]} - ${i+1}`;
    const j = await Job.create({
      title,
      description: `Auto job ${i+1} for testing`,
      location: ['Remote','Bengaluru','Mumbai'][i%3],
      skills: skillsPool[i%skillsPool.length],
      company: companyUser._id
    });
  }
  console.log('Seeded jobs');
  process.exit(0);
}

run().catch(e=> { console.error(e); process.exit(1); });
