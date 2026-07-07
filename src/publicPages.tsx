import { ArrowLeft, CheckCircle2, Coffee, ShieldCheck, Sparkles } from "lucide-react";

export type PublicPageKey = "pricing" | "terms" | "privacy" | "refunds";

export interface PublicPageData {
  key: PublicPageKey;
  path: string;
  title: string;
  eyebrow: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export const SUPPORT_EMAIL = "sokieryan@gmail.com";
export const PRO_PRICE = "US$4.99 USD";
export const PRO_INTERVAL = "month";
export const PRO_MONTHLY_PRICE = `${PRO_PRICE} per ${PRO_INTERVAL}`;
export const LAST_UPDATED = "July 7, 2026";

export const PUBLIC_PAGE_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
];

const pages: Record<PublicPageKey, PublicPageData> = {
  pricing: {
    key: "pricing",
    path: "/pricing",
    title: "Pricing",
    eyebrow: "Hina plans",
    summary: "Hina is an AI English practice companion. The free plan gives casual practice, and Hina Pro is a monthly subscription for longer conversations.",
    sections: [
      {
        heading: "Free plan",
        body: [
          "Price: US$0.",
          "Includes 30 free chats per day, profile settings, cloud chat history for signed-in users, and access to Hina's English practice chat.",
        ],
      },
      {
        heading: "Hina Pro",
        body: [
          `Price: ${PRO_MONTHLY_PRICE}.`,
          "Includes unlimited daily AI English chats, profile settings, cloud chat history for signed-in users, voice playback, proactive Hina moments, and early access to selected experimental learning features.",
          "Taxes may apply and will be calculated at checkout. The checkout shows applicable taxes before payment is confirmed.",
          "No free trial, introductory discount, or promotional price is currently offered.",
        ],
      },
      {
        heading: "Billing and cancellation",
        body: [
          `Hina Pro renews monthly at ${PRO_MONTHLY_PRICE} unless canceled before the next billing date.`,
          "Checkout is processed by Paddle as merchant of record. You are not charged until you confirm the Paddle checkout.",
          "You can cancel future renewals through the billing management link provided after purchase, or by contacting support.",
          "Please review the Terms of Service, Privacy Policy, and Refund Policy before purchasing.",
        ],
      },
    ],
  },
  terms: {
    key: "terms",
    path: "/terms",
    title: "Terms of Service",
    eyebrow: "Website terms",
    summary: "These terms explain how Hina may be used and what users should expect from the service.",
    sections: [
      {
        heading: "Service",
        body: [
          "Hina provides AI-assisted English conversation practice, grammar correction, vocabulary tips, voice playback, profile settings, and optional proactive learning prompts.",
          "Hina is a learning companion, not a certified teacher, legal advisor, medical advisor, financial advisor, or emergency service.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "You may create an account with email/password or Google sign-in. You are responsible for keeping your login credentials secure.",
          "You must not use Hina to harass others, generate illegal content, violate intellectual property rights, or attempt to disrupt the service.",
        ],
      },
      {
        heading: "Subscriptions",
        body: [
          `Hina Pro is a monthly subscription priced at ${PRO_MONTHLY_PRICE}. Paid checkout is handled by Paddle as merchant of record.`,
          "Subscription benefits, limits, taxes, and cancellation details are shown on the pricing page. We may change plan features for future billing periods with reasonable notice.",
        ],
      },
      {
        heading: "AI content",
        body: [
          "AI responses may be inaccurate, incomplete, or inappropriate for your situation. You should verify important information independently.",
          "You are responsible for the messages you send and for how you use AI-generated output.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `For support or policy questions, contact ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  privacy: {
    key: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    eyebrow: "Data handling",
    summary: "This policy describes what Hina collects, why it is used, and which service providers help operate the product.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Account information such as email address, display name, sign-in provider, and avatar URL is handled through Firebase Authentication and Firebase services.",
          "Chat messages, profile settings, proactive learning preferences, usage counters, and billing status may be stored so Hina can provide history, quota, and personalization features.",
          "When you use Paddle checkout, Paddle may collect payment, billing, tax, and transaction information as merchant of record.",
        ],
      },
      {
        heading: "How information is used",
        body: [
          "We use information to provide the chat experience, save history for signed-in users, manage free and Pro usage, improve reliability, prevent abuse, and respond to support requests.",
          "Chat content may be sent to AI providers such as OpenAI or Gemini to generate responses and voice output.",
        ],
      },
      {
        heading: "Service providers",
        body: [
          "Hina uses Firebase for authentication, Firestore, and storage; Vercel for hosting; AI providers for model responses; and Paddle for paid checkout.",
          "These providers process data according to their own terms and privacy commitments.",
        ],
      },
      {
        heading: "Retention and choices",
        body: [
          "Signed-in users can clear cloud chat history from settings. Some operational, security, or billing records may be retained when required for fraud prevention, tax, accounting, or legal compliance.",
          `For privacy requests, contact ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  refunds: {
    key: "refunds",
    path: "/refunds",
    title: "Refund Policy",
    eyebrow: "Billing support",
    summary: "This policy explains when Hina Pro subscription payments may be refunded.",
    sections: [
      {
        heading: "Refund window",
        body: [
          "You may request a refund within 14 days of an initial Hina Pro purchase or renewal if the subscription was not meaningfully used or if there was a technical issue preventing access.",
          "Refunds after 14 days are generally not provided except where required by law.",
        ],
      },
      {
        heading: "How to request a refund",
        body: [
          `Email ${SUPPORT_EMAIL} with the email address used for purchase, the Paddle receipt or transaction reference, and a short explanation of the issue.`,
          "Approved refunds are returned through the original payment method when possible. Processing times depend on Paddle and the payment method.",
        ],
      },
      {
        heading: "Cancellations",
        body: [
          "Canceling a subscription stops future renewals but does not automatically refund past payments.",
          "If you cancel, Pro access normally remains available until the end of the paid billing period.",
        ],
      },
    ],
  },
};

export function getPublicPage(pathname: string): PublicPageData | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return Object.values(pages).find((page) => page.path === normalized) ?? null;
}

export function PublicPage({ page }: { page: PublicPageData }) {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#292521]">
      <header className="border-b border-[#E8E2D6] bg-white/70 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-3 font-black text-[#292521]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD166] text-white">
              <Sparkles size={20} />
            </span>
            Hina
          </a>
          <nav className="hidden items-center gap-4 text-sm font-bold text-[#6F675D] sm:flex">
            {PUBLIC_PAGE_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[#292521]">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#8A817C] hover:text-[#292521]">
          <ArrowLeft size={16} />
          Back to Hina
        </a>

        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-widest text-[#B58845]">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal text-[#292521] sm:text-6xl">{page.title}</h1>
          <p className="mt-5 text-base font-medium leading-8 text-[#6F675D] sm:text-lg">{page.summary}</p>
          <p className="mt-4 text-sm font-semibold text-[#8A817C]">Last updated: {LAST_UPDATED}</p>
        </div>

        {page.key === "pricing" && (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[#E8E2D6] bg-white p-6 shadow-sm">
              <p className="text-sm font-black uppercase tracking-widest text-[#8A817C]">Free</p>
              <h2 className="mt-2 text-3xl font-black">US$0</h2>
              <p className="mt-2 text-sm font-semibold text-[#6F675D]">30 free chats per day</p>
            </article>
            <article className="rounded-2xl border border-[#D8E7DF] bg-[#F3FAF7] p-6 shadow-sm">
              <p className="text-sm font-black uppercase tracking-widest text-[#2F5D54]">Hina Pro</p>
              <h2 className="mt-2 text-3xl font-black">{PRO_MONTHLY_PRICE}</h2>
              <p className="mt-2 text-sm font-semibold text-[#47625b]">Unlimited daily AI English chats</p>
            </article>
          </div>
        )}

        <div className="mt-10 space-y-6">
          {page.sections.map((section) => (
            <section key={section.heading} className="border-t border-[#E8E2D6] pt-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-[#292521]">
                {page.key === "refunds" ? <Coffee size={18} /> : <ShieldCheck size={18} />}
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[#5F574F] sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 flex flex-wrap gap-3 border-t border-[#E8E2D6] pt-6 text-sm font-bold text-[#8A817C]">
          {PUBLIC_PAGE_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="inline-flex items-center gap-1 hover:text-[#292521]">
              <CheckCircle2 size={15} />
              {link.label}
            </a>
          ))}
        </footer>
      </section>
    </main>
  );
}
