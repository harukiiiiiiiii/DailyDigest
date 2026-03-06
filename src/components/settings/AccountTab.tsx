"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { User, Lock, LogOut, Check, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccountTab() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const user = session?.user;

  // Initialize name from session once loaded
  if (user && !name && !nameLoading) {
    setName(user.name);
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameLoading(true);
    setNameMsg(null);
    try {
      const res = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("更新失败");
      setNameMsg({ type: "ok", text: "用户名已更新" });
    } catch {
      setNameMsg({ type: "err", text: "更新失败，请稍后重试" });
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPwd.length < 8) {
      setPwdMsg({ type: "err", text: "新密码至少 8 位" });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "err", text: "两次输入的新密码不一致" });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: curPwd,
          newPassword: newPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "修改失败");
      setPwdMsg({ type: "ok", text: "密码已修改" });
      setCurPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setPwdMsg({ type: "err", text: err instanceof Error ? err.message : "修改失败" });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (isPending) {
    return <div className="py-12 text-center text-text-muted">加载中…</div>;
  }

  if (!user) {
    return <div className="py-12 text-center text-text-muted">未登录</div>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* User Info */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          帐号信息
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-text-secondary">邮箱</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <form onSubmit={handleUpdateName} className="space-y-3 pt-1">
            <div>
              <label className="block text-text-secondary mb-1.5">用户名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            {nameMsg && (
              <div className={`flex items-center gap-1.5 text-xs ${nameMsg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                {nameMsg.type === "ok" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {nameMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={nameLoading || name === user.name}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white
                hover:bg-gray-800 disabled:opacity-40 transition-all"
            >
              {nameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "保存"}
            </button>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          修改密码
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">当前密码</label>
            <input
              type="password"
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">新密码</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={8}
              placeholder="至少 8 位"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">确认新密码</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          {pwdMsg && (
            <div className={`flex items-center gap-1.5 text-xs ${pwdMsg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
              {pwdMsg.type === "ok" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {pwdMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={pwdLoading || !curPwd || !newPwd || !confirmPwd}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white
              hover:bg-gray-800 disabled:opacity-40 transition-all"
          >
            {pwdLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "修改密码"}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              退出登录
            </h3>
            <p className="text-xs text-text-muted mt-1">退出当前帐号</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600
              hover:bg-red-50 transition-all"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  );
}
