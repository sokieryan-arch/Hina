import { LogOut, MailCheck, RefreshCw, Send, Sun } from "lucide-react";
import { motion } from "motion/react";

interface EmailVerificationPanelProps {
  email: string | null | undefined;
  feedback?: string | null;
  onRefresh: () => Promise<void> | void;
  onResend: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}

export function EmailVerificationPanel({
  email,
  feedback,
  onRefresh,
  onResend,
  onSignOut,
}: EmailVerificationPanelProps) {
  const displayEmail = email || "your email address";

  return (
    <main className="min-h-screen overflow-hidden bg-[#FDFBF7] text-[#292521] selection:bg-[#FFD166]/40">
      <div className="relative flex min-h-screen items-center justify-center px-5 py-8">
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,209,102,0.24),transparent_34%),linear-gradient(315deg,rgba(78,168,222,0.16),transparent_40%)]" />
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.08] [background-image:radial-gradient(#292521_1px,transparent_1px)] [background-size:22px_22px]" />

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          className="relative w-full max-w-[520px] rounded-[30px] border border-[#E8E2D6] bg-white/92 p-6 shadow-[0_26px_80px_rgba(69,52,29,0.14)] backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD166] text-white shadow-[0_12px_30px_rgba(255,159,28,0.24)]">
              <Sun size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-normal text-[#292521]">Hina</h1>
              <p className="text-sm font-bold text-[#8A817C]">International account center</p>
            </div>
          </div>

          <div className="mt-8 rounded-[24px] border border-[#F0EADF] bg-[#FDFBF7] p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3D1] text-[#B58845]">
              <MailCheck size={28} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-widest text-[#B58845]">Email verification</p>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-normal text-[#292521]">
              Check your email
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#6F675D]">
              We sent a verification link to <span className="text-[#292521]">{displayEmail}</span>.
              Hina will open your chat history after that address is verified.
            </p>
          </div>

          {feedback && (
            <p className="mt-4 rounded-2xl border border-[#F2D7B6] bg-[#FFF8EC] px-4 py-3 text-sm font-semibold leading-6 text-[#835328]">
              {feedback}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onRefresh}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#292521] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
            >
              <RefreshCw size={17} />
              I have verified, refresh
            </button>
            <button
              type="button"
              onClick={onResend}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E8E2D6] bg-white px-4 text-sm font-black text-[#292521] shadow-sm transition hover:-translate-y-0.5"
            >
              <Send size={17} />
              Resend verification email
            </button>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#8A817C] transition hover:text-[#292521]"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </motion.section>
      </div>
    </main>
  );
}
