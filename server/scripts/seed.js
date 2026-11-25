/**
 * CareerPulse ATS - Development Seed Script
 * Populates MongoDB with clearly labelled sample job listings from fictional companies.
 * Never scrapes real websites or uses unauthorized vacancy data.
 * Safe for development and local testing.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/config/database');
const { User, Job } = require('../src/models');
const { hashPassword } = require('../src/utils/password');

const SAMPLE_JOBS = [
  {
    title: '[Sample] Senior Full-Stack Engineer (React & Node.js)',
    company: 'Nexura Tech India (Sample Demo)',
    companyLogo: 'NT',
    logoBg: '#2563eb',
    location: 'Bengaluru, Karnataka',
    employmentType: 'Full-time',
    workplaceType: 'hybrid',
    experienceLevel: 'senior',
    category: 'engineering',
    department: 'Core Platform Engineering',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Docker', 'AWS'],
    salaryRange: { min: 1800000, max: 2800000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
This is a sample development listing designed to demonstrate real-time search, category filtering, and candidate ATS application workflows in CareerPulse ATS.

Responsibilities:
• Architect, build, and maintain mission-critical React web applications and Node.js microservices.
• Work with engineering leads across Bengaluru and global teams to scale backend APIs to millions of requests.
• Optimize MongoDB databases and implement automated CI/CD deployment pipelines on AWS.

Requirements:
• 5+ years of production experience in JavaScript/TypeScript, React, Node.js, and Express.
• Proven track record with document databases, containerization (Docker), and cloud services.
• Strong communication and collaborative engineering practices.`,
    featured: true,
    urgent: true,
    applicantCount: 4,
    status: 'published',
  },
  {
    title: '[Sample] Frontend Engineer (React & Next.js)',
    company: 'FinPulse Solutions (Sample Demo)',
    companyLogo: 'FP',
    logoBg: '#059669',
    location: 'Hyderabad, Telangana',
    employmentType: 'Full-time',
    workplaceType: 'hybrid',
    experienceLevel: 'mid-level',
    category: 'engineering',
    department: 'Digital Payments UI',
    requiredSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux', 'REST APIs'],
    salaryRange: { min: 1000000, max: 1600000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
Sample vacancy for testing frontend keyword search and Hyderabad location filters in CareerPulse ATS.

Responsibilities:
• Build high-performance, accessible fintech customer dashboards and checkout flows.
• Collaborate with UI/UX product designers in Figma and implement pixel-perfect Tailwind CSS components.
• Write comprehensive unit tests and optimize client-side bundle performance.`,
    featured: true,
    urgent: false,
    applicantCount: 8,
    status: 'published',
  },
  {
    title: '[Sample] Graduate Software Engineer Intern (2026/2027)',
    company: 'Kavach AI Labs (Sample Demo)',
    companyLogo: 'KA',
    logoBg: '#7c3aed',
    location: 'Pune, Maharashtra',
    employmentType: 'Internship',
    workplaceType: 'on-site',
    experienceLevel: 'internship',
    category: 'engineering',
    department: 'AI Research & Engineering',
    requiredSkills: ['Python', 'Data Structures', 'Algorithms', 'SQL', 'Git', 'FastAPI'],
    salaryRange: { min: 35000, max: 50000, currency: 'INR', period: 'monthly' },
    description: `[Sample Listing for Development Testing]
Sample internship role for testing college graduate, Pune location, and monthly stipend filters.

Key Highlights:
• 6-month hands-on paid internship with potential PPO (Pre-Placement Offer) conversion.
• Mentorship from senior engineering architects in Python, algorithm design, and ML pipelines.
• Open to B.Tech, B.E., BCA, MCA, and M.Tech candidates graduating in 2026 or 2027.`,
    featured: false,
    urgent: false,
    applicantCount: 15,
    status: 'published',
  },
  {
    title: '[Sample] Cloud Infrastructure & DevOps Engineer',
    company: 'IndicCloud Systems (Sample Demo)',
    companyLogo: 'IC',
    logoBg: '#0891b2',
    location: 'Delhi NCR',
    employmentType: 'Full-time',
    workplaceType: 'remote',
    experienceLevel: 'senior',
    category: 'cloud-devops',
    department: 'SRE & Cloud Operations',
    requiredSkills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Linux'],
    salaryRange: { min: 2000000, max: 3200000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
Sample DevOps role designed to test Remote work arrangements, Delhi NCR location, and Cloud & DevOps category filters.

Responsibilities:
• Manage and automate multi-tenant Kubernetes clusters on AWS across Asia-Pacific regions.
• Build automated infrastructure-as-code using Terraform and maintain GitLab/GitHub Actions CI/CD.
• Monitor platform reliability, reduce MTTD/MTTR, and implement zero-trust security policies.`,
    featured: true,
    urgent: false,
    applicantCount: 6,
    status: 'published',
  },
  {
    title: '[Sample] UI/UX Product Designer (Design Systems)',
    company: 'DesignKraft India (Sample Demo)',
    companyLogo: 'DK',
    logoBg: '#db2777',
    location: 'Bengaluru, Karnataka',
    employmentType: 'Full-time',
    workplaceType: 'hybrid',
    experienceLevel: 'mid-level',
    category: 'design',
    department: 'Product Design & Experience',
    requiredSkills: ['Figma', 'UI/UX Design', 'Design Systems', 'User Research', 'Prototyping'],
    salaryRange: { min: 1200000, max: 1800000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
Sample design opening for testing creative category filters, Bengaluru location, and salary filters.

Responsibilities:
• Lead end-to-end design sprints for Indian mobile apps and SaaS web dashboards.
• Maintain a multi-brand component design system with tokens in Figma.
• Conduct qualitative user discovery sessions and usability testing with Indian enterprise users.`,
    featured: false,
    urgent: false,
    applicantCount: 3,
    status: 'published',
  },
  {
    title: '[Sample] Lead Machine Learning Engineer (LLMs & NLP)',
    company: 'Veda Intelligence (Sample Demo)',
    companyLogo: 'VI',
    logoBg: '#4f46e5',
    location: 'Chennai, Tamil Nadu',
    employmentType: 'Full-time',
    workplaceType: 'remote',
    experienceLevel: 'lead',
    category: 'ai-data',
    department: 'Applied GenAI & Foundation Models',
    requiredSkills: ['Python', 'PyTorch', 'Transformers', 'FastAPI', 'MLOps', 'Vector DBs'],
    salaryRange: { min: 3000000, max: 4500000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
Sample AI leadership vacancy for testing high LPA salary tiers (30-45 LPA), lead experience levels, and Chennai/Remote filters.

Responsibilities:
• Architect domain-specific LLM fine-tuning, RAG retrieval pipelines, and low-latency inference services.
• Direct MLOps infrastructure for production model monitoring, evaluation, and hallucination reduction.
• Guide a team of 6 AI researchers and engineers.`,
    featured: true,
    urgent: true,
    applicantCount: 9,
    status: 'published',
  },
  {
    title: '[Sample] Technical Product Manager (UPI & Fintech)',
    company: 'BharatPay Network (Sample Demo)',
    companyLogo: 'BP',
    logoBg: '#d97706',
    location: 'Mumbai, Maharashtra',
    employmentType: 'Full-time',
    workplaceType: 'hybrid',
    experienceLevel: 'senior',
    category: 'product',
    department: 'Payments & Merchant Products',
    requiredSkills: ['Product Strategy', 'Agile', 'Jira', 'API Architecture', 'UPI Payments', 'SQL'],
    salaryRange: { min: 2200000, max: 3500000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
Sample product management opening for testing Mumbai location, product category, and mid/senior experience filters.

Responsibilities:
• Define product roadmap and go-to-market execution for next-generation merchant QR & UPI soundbox solutions.
• Author PRDs, user stories, and acceptance criteria in close sync with engineering and compliance teams.
• Track core funnel metrics, drop-off rates, and transactional success rates across Indian tier-1/2/3 cities.`,
    featured: false,
    urgent: false,
    applicantCount: 7,
    status: 'published',
  },
  {
    title: '[Sample] Fresher QA Automation Engineer',
    company: 'QualiTest Hub (Sample Demo)',
    companyLogo: 'QT',
    logoBg: '#0284c7',
    location: 'Chandigarh',
    employmentType: 'Full-time',
    workplaceType: 'on-site',
    experienceLevel: 'fresher',
    category: 'engineering',
    department: 'Quality Assurance & SDET',
    requiredSkills: ['Java', 'Selenium', 'TestNG', 'Postman', 'Manual Testing', 'Git'],
    salaryRange: { min: 450000, max: 700000, currency: 'INR', period: 'yearly' },
    description: `[Sample Listing for Development Testing]
Sample fresher listing for testing Chandigarh location, fresher experience filter, and entry-level salary search in CareerPulse ATS.

Responsibilities:
• Develop and execute automated test scripts for web applications using Selenium WebDriver and Java.
• Conduct API testing with Postman and report bugs accurately in Jira.
• Participate in daily standups and sprint reviews with cross-functional dev teams.`,
    featured: false,
    urgent: false,
    applicantCount: 11,
    status: 'published',
  },
];

async function seedDatabase() {
  const isForce = process.argv.includes('--force');

  console.log('========================================================');
  console.log('[CareerPulse ATS] Running Development Sample Jobs Seeder');
  console.log('========================================================');

  try {
    await connectDB();

    const existingJobsCount = await Job.countDocuments();
    console.log(`- Current published job count in database: ${existingJobsCount}`);

    if (existingJobsCount > 0 && !isForce) {
      console.log(`- Database already has ${existingJobsCount} jobs.`);
      console.log('- Use "node scripts/seed.js --force" to reset and re-seed sample listings.');
      await disconnectDB();
      return;
    }

    if (isForce && existingJobsCount > 0) {
      console.log('- --force flag supplied: Removing existing sample listings...');
      await Job.deleteMany({ title: { $regex: /^\[Sample\]/ } });
      console.log('  ✓ Cleaned up prior sample listings.');
    }

    // 1. Locate or create a verified sample recruiter
    const sampleRecruiterEmail = 'recruiter.sample@careerpulse.test';
    let sampleRecruiter = await User.findOne({ email: sampleRecruiterEmail });

    if (!sampleRecruiter) {
      const passwordHash = await hashPassword('SampleRecruiter123!');
      sampleRecruiter = await User.create({
        name: 'Aditi Sharma (Sample Recruiter)',
        email: sampleRecruiterEmail,
        passwordHash,
        role: 'recruiter',
        profile: {
          company: 'Nexura Tech India (Sample Demo)',
          companyWebsite: 'https://nexuratech-sample.example.com',
          companyDescription: 'Fictional enterprise technology company for testing and local ATS simulation.',
          industry: 'Software & Cloud Services',
          companySize: '501-1000 employees',
          headquarters: 'Bengaluru, Karnataka',
          verificationStatus: 'verified',
          headline: 'Lead Technical Talent Partner',
        },
      });
      console.log(`  ✓ Created verified sample recruiter: ${sampleRecruiter.email}`);
    } else {
      console.log(`  ✓ Using existing sample recruiter: ${sampleRecruiter.email}`);
    }

    // 2. Insert sample jobs
    const jobsToInsert = SAMPLE_JOBS.map((job) => ({
      ...job,
      recruiter: sampleRecruiter._id,
    }));

    const inserted = await Job.insertMany(jobsToInsert);
    console.log(`\n  ✓ Successfully seeded ${inserted.length} sample listings across India:`);
    inserted.forEach((j, idx) => {
      console.log(`    ${idx + 1}. ${j.title} | ${j.company} | ${j.location}`);
    });

    console.log('\n========================================================');
    console.log('[CareerPulse ATS] Sample Seeding Complete!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('Seed script encountered an error:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

seedDatabase();
