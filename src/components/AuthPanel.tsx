import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail, Sparkles, Sun, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { formatAuthErrorMessage } from "../authErrorMessage";

export type AuthMode = "login" | "register" | "reset";

interface AuthPanelProps {
  onGoogleLogin: () => Promise<void> | void;
  onEmailLogin: (input: { email: string; password: string }) => Promise<void> | void;
  onEmailRegister: (input: { email: string; password: string; displayName: string }) => Promise<void> | void;
  onPasswordReset: (input: { email: string }) => Promise<void> | void;
  feedback?: string | null;
}

interface AuthFormInput {
  email: string;
  password?: string;
  displayName?: string;
}

const modes: { key: AuthMode; label: string }[] = [
  { key: "login", label: "登录" },
  { key: "register", label: "注册" },
  { key: "reset", label: "忘记密码" },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateAuthForm(mode: AuthMode, input: AuthFormInput): string | null {
  const email = input.email.trim();
  const password = input.password ?? "";
  const displayName = input.displayName ?? "";

  if (!email) return "请输入邮箱地址。";
  if (!isValidEmail(email)) return "请输入正确的邮箱地址。";
  if (mode === "reset") return null;
  if (!password) return "请输入密码。";
  if (mode === "register" && password.length < 8) return "密码至少需要 8 位。";
  if (mode === "register" && !displayName.trim()) return "请给自己起一个昵称。";
  return null;
}

export function AuthPanel({
  onGoogleLogin,
  onEmailLogin,
  onEmailRegister,
  onPasswordReset,
  feedback,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [busyAction, setBusyAction] = useState<"email" | "google" | null>(null);

  useEffect(() => {
    if (feedback) setStatus(feedback);
  }, [feedback]);

  const modeCopy = useMemo(() => {
    if (mode === "register") {
      return {
        eyebrow: "创建账号",
        title: "给 Hina 留一个常用邮箱",
        submit: "创建账号",
        helper: "注册后会自动进入聊天，历史记录和头像设置会保存在 Firebase。",
      };
    }
    if (mode === "reset") {
      return {
        eyebrow: "找回密码",
        title: "把重置邮件发到你的邮箱",
        submit: "发送重置邮件",
        helper: "如果没有收到邮件，请检查垃圾箱，或确认 Firebase 已开启邮箱密码登录。",
      };
    }
    return {
      eyebrow: "欢迎回来",
      title: "登录后继续和 Hina 练英语",
      submit: "进入 Hina",
      helper: "可以使用邮箱密码，也可以直接用 Google 登录。",
    };
  }, [mode]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStatus("");
    setShowPassword(false);
  };

  const submitEmail = async () => {
    const validationError = validateAuthForm(mode, { email, password, displayName });
    if (validationError) {
      setStatus(validationError);
      return;
    }

    setBusyAction("email");
    setStatus("");
    try {
      if (mode === "login") {
        await onEmailLogin({ email: email.trim(), password });
      } else if (mode === "register") {
        await onEmailRegister({ email: email.trim(), password, displayName: displayName.trim() });
      } else {
        await onPasswordReset({ email: email.trim() });
        setMode("login");
        setPassword("");
        setStatus("重置邮件已发送，请查看邮箱后回到这里登录。");
      }
    } catch (error) {
      setStatus(formatAuthErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const submitGoogle = async () => {
    setBusyAction("google");
    setStatus("");
    try {
      await onGoogleLogin();
    } catch (error) {
      setStatus(formatAuthErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const isBusy = busyAction !== null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#FDFBF7] text-[#292521] selection:bg-[#FFD166]/40">
      <div className="relative min-h-screen px-5 py-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,209,102,0.22),transparent_34%),linear-gradient(315deg,rgba(78,168,222,0.16),transparent_38%)]" />
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.08] [background-image:radial-gradient(#292521_1px,transparent_1px)] [background-size:22px_22px]" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_430px]"
        >
          <section className="pt-4 sm:pt-0">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD166] text-white shadow-[0_12px_30px_rgba(255,159,28,0.24)]">
                <Sun size={28} strokeWidth={2.4} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-normal text-[#292521]">Hina</h1>
                <p className="text-sm font-bold text-[#8A817C]">国际版账户中心</p>
              </div>
            </div>

            <div className="mt-10 max-w-[620px] space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D6] bg-white/70 px-4 py-2 text-xs font-black text-[#7A6544] shadow-sm backdrop-blur">
                <Sparkles size={15} />
                适合手机端使用
              </div>
              <p className="text-[2.65rem] font-black leading-[0.98] tracking-normal text-[#292521] sm:text-[4.2rem]">
                先把账号安顿好，再开始今天的英语闲聊。
              </p>
              <p className="max-w-xl text-base font-medium leading-8 text-[#6F675D] sm:text-lg">
                邮箱、Google、找回密码都放在同一个入口。Hina 会记住你的历史记录、头像和主动聊天偏好。
              </p>
            </div>
          </section>

          <section className="mb-3 rounded-[28px] border border-[#E8E2D6] bg-white/90 p-4 shadow-[0_26px_80px_rgba(69,52,29,0.14)] backdrop-blur-xl sm:p-6">
            <div className="rounded-3xl border border-[#F0EADF] bg-[#FDFBF7] p-2">
              <div className="grid grid-cols-3 gap-1">
                {modes.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => switchMode(item.key)}
                    className={cn(
                      "h-11 rounded-2xl text-sm font-black transition",
                      mode === item.key
                        ? "bg-[#292521] text-white shadow-sm"
                        : "text-[#8A817C] hover:bg-white hover:text-[#292521]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-widest text-[#B58845]">{modeCopy.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-black tracking-normal text-[#292521]">{modeCopy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#7A7168]">{modeCopy.helper}</p>
            </div>

            <div className="mt-6 space-y-4">
              {mode === "register" && (
                <label className="block">
                  <span className="text-xs font-black text-[#7A7168]">昵称</span>
                  <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 focus-within:border-[#FF9F1C] focus-within:ring-2 focus-within:ring-[#FFD166]/60">
                    <UserRound size={18} className="text-[#B5A48B]" />
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#B5A48B]"
                      placeholder="比如：Sokie"
                      autoComplete="name"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="text-xs font-black text-[#7A7168]">邮箱</span>
                <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 focus-within:border-[#FF9F1C] focus-within:ring-2 focus-within:ring-[#FFD166]/60">
                  <Mail size={18} className="text-[#B5A48B]" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#B5A48B]"
                    placeholder="name@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </label>

              {mode !== "reset" && (
                <label className="block">
                  <span className="text-xs font-black text-[#7A7168]">密码</span>
                  <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 focus-within:border-[#FF9F1C] focus-within:ring-2 focus-within:ring-[#FFD166]/60">
                    <KeyRound size={18} className="text-[#B5A48B]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#B5A48B]"
                      placeholder={mode === "register" ? "至少 8 位" : "输入密码"}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="rounded-full p-1.5 text-[#8A817C] transition hover:bg-white hover:text-[#292521]"
                      title={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}

              {status && (
                <p className="rounded-2xl border border-[#F2D7B6] bg-[#FFF8EC] px-4 py-3 text-sm font-semibold leading-6 text-[#835328]">
                  {status}
                </p>
              )}

              <button
                type="button"
                onClick={submitEmail}
                disabled={isBusy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF9F1C] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,159,28,0.22)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:bg-[#E8E2D6] disabled:text-[#A89D8A] disabled:shadow-none"
              >
                {busyAction === "email" ? "处理中..." : modeCopy.submit}
                {busyAction !== "email" && <ArrowRight size={17} />}
              </button>

              {mode !== "reset" && (
                <>
                  <div className="flex items-center gap-3 text-xs font-bold text-[#B5A48B]">
                    <span className="h-px flex-1 bg-[#E8E2D6]" />
                    或
                    <span className="h-px flex-1 bg-[#E8E2D6]" />
                  </div>

                  <button
                    type="button"
                    onClick={submitGoogle}
                    disabled={isBusy}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#DCE5EF] bg-white text-sm font-black text-[#263747] shadow-sm transition hover:-translate-y-0.5 hover:border-[#AFC8E5] disabled:translate-y-0 disabled:opacity-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4285F4] text-[13px] font-black text-white">G</span>
                    使用 Google 登录
                  </button>
                </>
              )}

              <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#8A817C]">
                {mode !== "login" ? (
                  <button type="button" onClick={() => switchMode("login")} className="hover:text-[#292521]">
                    返回登录
                  </button>
                ) : (
                  <button type="button" onClick={() => switchMode("reset")} className="hover:text-[#292521]">
                    忘记密码？
                  </button>
                )}
                {mode !== "register" && (
                  <button type="button" onClick={() => switchMode("register")} className="hover:text-[#292521]">
                    创建新账号
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-2xl bg-[#F1F7F5] px-4 py-3 text-xs font-bold leading-5 text-[#3D695E]">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              国际版继续使用 Firebase Auth，第三方登录入口统一走 Google。
            </div>
          </section>
        </motion.div>
      </div>
    </main>
  );
}
