/**
 * Option data for the Sekkei init CLI prompts.
 * Translatable options: [value, en, ja, vi] tuples.
 * Stack options: universal tech names, no translation needed.
 */

// [value, en, ja, vi]
export const PROJECT_TYPES = [
  ["web", "Web Application", "Web アプリケーション", "Ứng dụng Web"],
  ["mobile", "Mobile App", "モバイルアプリ", "Ứng dụng di động"],
  ["api", "API / Backend", "API / バックエンド", "API / Backend"],
  ["desktop", "Desktop App", "デスクトップアプリ", "Ứng dụng Desktop"],
  ["lp", "Landing Page", "ランディングページ", "Landing Page"],
  ["internal-system", "Internal System", "社内システム", "Hệ thống nội bộ"],
  ["saas", "SaaS", "SaaS", "SaaS"],
  ["batch", "Batch Processing", "バッチ処理", "Xử lý hàng loạt"],
];

export const DOC_LANGUAGES = [
  ["ja", "日本語", "日本語", "Tiếng Nhật"],
  ["en", "English", "English", "Tiếng Anh"],
  ["vi", "Tiếng Việt", "ベトナム語", "Tiếng Việt"],
];

export const KEIGO_LEVELS = [
  ["丁寧語", "Polite (desu/masu)", "丁寧語（ですます調）", "Lịch sự (desu/masu)"],
  ["謙譲語", "Humble (kenjougo)", "謙譲語（謙遜語）", "Khiêm nhường (kenjougo)"],
  ["simple", "Plain (de aru)", "常体（である調）", "Giản dị (de aru)"],
];

export const PRESETS = [
  ["enterprise", "Enterprise / Government", "大手SI / 官公庁向け", "Doanh nghiệp / Chính phủ"],
  ["standard", "Standard SI / SES", "中堅SI / SES向け", "SI / SES tiêu chuẩn"],
  ["agile", "Agile / Startup", "アジャイル / スタートアップ", "Agile / Startup"],
];

export const INDUSTRIES = [
  ["none", "None (skip)", "なし（スキップ）", "Bỏ qua"],
  ["finance", "Finance", "金融", "Tài chính"],
  ["medical", "Medical", "医療", "Y tế"],
  ["manufacturing", "Manufacturing", "製造", "Sản xuất"],
  ["automotive", "Automotive", "自動車", "Ô tô"],
  ["real-estate", "Real Estate", "不動産", "Bất động sản"],
  ["logistics", "Logistics", "物流", "Vận tải"],
  ["retail", "Retail", "小売", "Bán lẻ"],
  ["insurance", "Insurance", "保険", "Bảo hiểm"],
  ["education", "Education", "教育", "Giáo dục"],
  ["government", "Government", "官公庁", "Chính phủ"],
  ["construction", "Construction", "建設", "Xây dựng"],
  ["telecom", "Telecom", "通信", "Viễn thông"],
  ["energy", "Energy", "エネルギー", "Năng lượng"],
  ["food-service", "Food Service", "飲食", "Ẩm thực"],
];

// --- Stack options (tech names are universal) ---

export const STACKS = {
  frontend: [
    { value: "react", label: "React" },
    { value: "vue", label: "Vue.js" },
    { value: "nextjs", label: "Next.js" },
    { value: "angular", label: "Angular" },
    { value: "svelte", label: "Svelte" },
    { value: "nuxtjs", label: "Nuxt.js" },
    { value: "remix", label: "Remix" },
    { value: "astro", label: "Astro" },
    { value: "gatsby", label: "Gatsby" },
    { value: "solidjs", label: "SolidJS" },
    { value: "htmx", label: "HTMX" },
    { value: "jquery", label: "jQuery" },
    { value: "tailwindcss", label: "Tailwind CSS" },
    { value: "bootstrap", label: "Bootstrap" },
  ],
  backend: [
    { value: "nodejs", label: "Node.js" },
    { value: "express", label: "Express" },
    { value: "nestjs", label: "NestJS" },
    { value: "fastify", label: "Fastify" },
    { value: "python", label: "Python" },
    { value: "django", label: "Django" },
    { value: "fastapi", label: "FastAPI" },
    { value: "flask", label: "Flask" },
    { value: "java", label: "Java" },
    { value: "spring-boot", label: "Spring Boot" },
    { value: "go", label: "Go" },
    { value: "ruby", label: "Ruby" },
    { value: "rails", label: "Ruby on Rails" },
    { value: "php", label: "PHP" },
    { value: "laravel", label: "Laravel" },
    { value: "dotnet", label: ".NET / C#" },
    { value: "rust", label: "Rust" },
    { value: "kotlin", label: "Kotlin" },
    { value: "elixir", label: "Elixir / Phoenix" },
  ],
  database: [
    { value: "postgresql", label: "PostgreSQL" },
    { value: "mysql", label: "MySQL" },
    { value: "mongodb", label: "MongoDB" },
    { value: "redis", label: "Redis" },
    { value: "sqlite", label: "SQLite" },
    { value: "oracle", label: "Oracle" },
    { value: "sqlserver", label: "SQL Server" },
    { value: "dynamodb", label: "DynamoDB" },
    { value: "firestore", label: "Firestore" },
    { value: "supabase", label: "Supabase" },
    { value: "cassandra", label: "Cassandra" },
    { value: "elasticsearch", label: "Elasticsearch" },
  ],
  cloud: [
    { value: "aws", label: "AWS" },
    { value: "gcp", label: "GCP" },
    { value: "azure", label: "Azure" },
    { value: "docker", label: "Docker" },
    { value: "kubernetes", label: "Kubernetes" },
    { value: "vercel", label: "Vercel" },
    { value: "cloudflare", label: "Cloudflare" },
    { value: "firebase", label: "Firebase" },
    { value: "terraform", label: "Terraform" },
    { value: "heroku", label: "Heroku" },
    { value: "digitalocean", label: "DigitalOcean" },
    { value: "netlify", label: "Netlify" },
  ],

  // --- Conditional sections (shown based on project type) ---

  mobile: [
    { value: "react-native", label: "React Native" },
    { value: "flutter", label: "Flutter" },
    { value: "expo", label: "Expo" },
    { value: "swift", label: "Swift / SwiftUI" },
    { value: "kotlin-android", label: "Kotlin / Jetpack Compose" },
    { value: "ionic", label: "Ionic" },
    { value: "capacitor", label: "Capacitor" },
    { value: "maui", label: ".NET MAUI" },
  ],
  desktop: [
    { value: "electron", label: "Electron" },
    { value: "tauri", label: "Tauri" },
    { value: "qt", label: "Qt" },
    { value: "wpf", label: "WPF" },
    { value: "dotnet-maui", label: ".NET MAUI" },
    { value: "javafx", label: "JavaFX" },
    { value: "gtk", label: "GTK" },
  ],
  messaging: [
    { value: "rabbitmq", label: "RabbitMQ" },
    { value: "kafka", label: "Apache Kafka" },
    { value: "sqs", label: "AWS SQS" },
    { value: "celery", label: "Celery" },
    { value: "bullmq", label: "BullMQ" },
    { value: "sidekiq", label: "Sidekiq" },
    { value: "cloud-tasks", label: "Cloud Tasks / Pub/Sub" },
  ],
};

/**
 * Get stack sections to show based on project type.
 * Always: frontend, backend, database, cloud.
 * Conditional: mobile, desktop, messaging.
 */
export function getStackSections(projectType) {
  const sections = ["frontend", "backend", "database", "cloud"];

  if (projectType === "mobile") sections.push("mobile");
  if (projectType === "desktop") sections.push("desktop");
  if (projectType === "batch") sections.push("messaging");

  return sections;
}
