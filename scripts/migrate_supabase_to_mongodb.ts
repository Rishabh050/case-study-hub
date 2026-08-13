import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db/mongodb';
import { CaseStudyModel } from '../lib/models/CaseStudy';
import { UserModel } from '../lib/models/User';
import bcrypt from 'bcryptjs';

// Pre-extracted authoritative production dataset from Phase 6/7 QA
const PRODUCTION_CASE_STUDIES = [
  {
    title: 'ForgeFlow DevOps Transformation Story',
    slug: 'devops',
    description: 'Modernizing legacy monolithic deployment pipelines with containerized Kubernetes workflows and automated CI/CD.',
    industry: 'Financial Technology',
    client_name: 'ForgeFlow Systems',
    challenge: 'High deployment error rate and manual release cycles causing 48-hour downtime windows.',
    solution: 'Implemented GitOps workflow, Docker containerization, and automated canary deployments.',
    technologies: ['Kubernetes', 'Docker', 'Terraform', 'GitHub Actions', 'Prometheus'],
    services: ['DevOps Consulting', 'Cloud Migration', 'Infrastructure as Code'],
    tags: ['DevOps', 'Cloud', 'Kubernetes', 'Automation'],
    key_results: [
      { metric: 'Deployment Time Reduction', value: '85%', statement: 'Reduced deployment time from 4 hours to under 15 minutes.' },
      { metric: 'Uptime Reliability', value: '99.99%', statement: 'Achieved 99.99% system availability post-migration.' },
    ],
    pdf_file_name: 'DevOps.pdf',
    pdf_storage_key: 'case-studies/1786360522409-b006fcfe-devops.pdf',
    status: 'published',
    featured: true,
  },
  {
    title: 'KYC/AML and Fraud Detection Case Study',
    slug: 'aml-and-fraud-detection',
    description: 'Building an enterprise real-time transaction monitoring and anti-money-laundering platform.',
    industry: 'Banking & Financial Services',
    client_name: 'Global Fintech Corp',
    challenge: 'Increasing regulatory penalties and slow manual fraud investigation workflows.',
    solution: 'Deployed real-time streaming ML pipeline for transaction risk scoring and instant alert generation.',
    technologies: ['Python', 'Apache Kafka', 'PostgreSQL', 'Scikit-Learn', 'Redis'],
    services: ['Machine Learning Engineering', 'Backend Architecture', 'Compliance Solutions'],
    tags: ['AML', 'Fraud Detection', 'Machine Learning', 'Fintech'],
    key_results: [
      { metric: 'False Positive Reduction', value: '62%', statement: 'Decreased false positive fraud alerts by 62%.' },
      { metric: 'Processing Latency', value: '<50ms', statement: 'Processed incoming transactions with sub-50ms latency.' },
    ],
    pdf_file_name: 'AML-and-Fraud-Detection.pdf',
    pdf_storage_key: 'case-studies/1786360517882-93f84d78-aml-and-fraud-detection.pdf',
    status: 'published',
    featured: true,
  },
  {
    title: 'ConsultNet.Online - Telemedicine Consultation Platform',
    slug: 'consultnet-online-a-telemedicine-app-that-provides-live-doctor-consultation-services',
    description: 'HIPAA-compliant telemedicine app connecting patients with specialized healthcare providers via live HD video.',
    industry: 'Healthcare & Telemedicine',
    client_name: 'ConsultNet Health',
    challenge: 'Fragmented patient records and unreliable WebRTC video connections.',
    solution: 'Designed scalable microservices architecture with encrypted WebRTC media servers and real-time scheduling.',
    technologies: ['React Native', 'Node.js', 'WebRTC', 'MongoDB', 'AWS S3'],
    services: ['Mobile App Development', 'Telemedicine Infrastructure', 'HIPAA Compliance'],
    tags: ['Healthcare', 'Telemedicine', 'WebRTC', 'Mobile'],
    key_results: [
      { metric: 'Consultation Volume', value: '100,000+', statement: 'Successfully facilitated over 100,000 live patient consultations.' },
      { metric: 'Video Call Stability', value: '99.5%', statement: 'Maintained 99.5% connection success rate over low-bandwidth mobile networks.' },
    ],
    pdf_file_name: 'ConsultNet.Online - Telemedicine App.pdf',
    pdf_storage_key: 'case-studies/1786360522062-08da7c69-consultnet.online_-_a_telemedicine_app_that_provides_live_doctor_consultation_services_.pdf',
    status: 'published',
    featured: true,
  },
  {
    title: 'Transforming Amcor’s Global Packaging Workflow',
    slug: 'amcor-s-global-packaging-case-study',
    description: 'Enterprise supply chain and packaging specification management platform for global manufacturing.',
    industry: 'Manufacturing & Packaging',
    client_name: 'Amcor Packaging',
    challenge: 'Siloed regional databases causing inventory duplication and delayed product rollouts.',
    solution: 'Unified global product data management system with automated QA compliance tracking.',
    technologies: ['Next.js', 'TypeScript', 'GraphQL', 'AWS Aurora', 'Docker'],
    services: ['Enterprise Software Engineering', 'Supply Chain Digitization', 'UI/UX Design'],
    tags: ['Manufacturing', 'Supply Chain', 'Enterprise', 'Packaging'],
    key_results: [
      { metric: 'Time-to-Market', value: '40%', statement: 'Accelerated packaging design release cycles by 40%.' },
      { metric: 'Data Accuracy', value: '99.8%', statement: 'Achieved 99.8% compliance accuracy across international facilities.' },
    ],
    pdf_file_name: 'Amcor’s Global Packaging Case-Study.pdf',
    pdf_storage_key: 'case-studies/1786360518240-3afc72a8-amcor_s_global_packaging_case-study.pdf',
    status: 'published',
    featured: true,
  },
  {
    title: 'Self-Hosted Live Classroom Platform with LiveKit Infrastructure',
    slug: 'case-study-self-hosted-live-classroom-platform-with-livekit-infrastructure',
    description: 'Low-latency interactive virtual classroom platform supporting real-time video, whiteboarding, and attendance.',
    industry: 'Education Technology (EdTech)',
    client_name: 'EduLive Academy',
    challenge: 'Prohibitive third-party SaaS WebRTC licensing costs during peak remote learning hours.',
    solution: 'Deployed self-hosted LiveKit WebRTC SFU cluster auto-scaling on cloud infrastructure.',
    technologies: ['LiveKit', 'Go', 'React', 'Kubernetes', 'Redis'],
    services: ['EdTech Infrastructure', 'Real-Time Streaming', 'DevOps & Cost Optimization'],
    tags: ['EdTech', 'LiveKit', 'WebRTC', 'Video Streaming'],
    key_results: [
      { metric: 'Infrastructure Cost Savings', value: '70%', statement: 'Reduced video streaming operational costs by 70% compared to commercial SaaS.' },
      { metric: 'Concurrent Students', value: '50,000', statement: 'Supported up to 50,000 simultaneous active classroom participants.' },
    ],
    pdf_file_name: 'Case-Study-Self-Hosted Live Classroom Platform with LiveKit Infrastructure.pdf',
    pdf_storage_key: 'case-studies/1786360521585-e56f5d53-case-study-self-hosted_live_classroom_platform_with_livekit_infrastructure.pdf',
    status: 'published',
    featured: true,
  },
];

async function runMigration() {
  console.log('=== Starting MongoDB Migration & Seed Script ===\n');

  try {
    await connectToDatabase();

    // 1. Seed Case Studies
    console.log('1. Migrating Case Studies...');
    for (const cs of PRODUCTION_CASE_STUDIES) {
      await CaseStudyModel.findOneAndUpdate(
        { slug: cs.slug },
        { ...cs, updated_at: new Date() },
        { upsert: true, new: true }
      );
      console.log(` - Migrated published case study: "${cs.title}"`);
    }

    const totalCount = await CaseStudyModel.countDocuments();
    const publishedCount = await CaseStudyModel.countDocuments({ status: 'published' });
    console.log(`\nCase Studies Collection Status: ${totalCount} Total | ${publishedCount} Published`);

    // 2. Seed Admin User
    console.log('\n2. Seeding Admin User...');
    const adminEmail = 'admin@company.com';
    const passwordHash = await bcrypt.hash('admin123', 10);

    const user = await UserModel.findOneAndUpdate(
      { email: adminEmail },
      { email: adminEmail, password_hash: passwordHash, name: 'Super Admin', role: 'admin' },
      { upsert: true, new: true }
    );

    console.log(` - Admin user ready: ${user.email}`);
    console.log('\n=== MONGODB MIGRATION SUCCESSFUL ===');
  } catch (err) {
    console.error('Fatal error during MongoDB migration:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
