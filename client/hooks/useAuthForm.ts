import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import * as api from '@/lib/api';
import toastLib from '@/lib/toast';

export function useAuthForm() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [mode, setMode] = useState<"login" | "signup">("login");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    async function login(creds?: { email: string; password: string }) {
        if (loading) return;
        setLoading(true);
        const e = creds?.email ?? email;
        const p = creds?.password ?? password;

        try {
            const res = await api.post("/auth/login", { email: e, password: p });
            if (res && res.user) {
                setUser(res.user, res.token);
                // Note: Token is also handled via HttpOnly cookie for browsers that support it
                toastLib.showToast("Signed in", "success");
                router.replace("/");
            } else {
                toastLib.showToast(res?.error || "Invalid credentials", "error");
            }
        } catch (err: any) {
            toastLib.errorToToast(err, "Login failed");
        } finally {
            setLoading(false);
        }
    }

    async function signup() {
        if (loading) return;
        setLoading(true);
        try {
            const res = await api.post("/auth/signup", { name, email, password });
            if (res && res.user) {
                toastLib.showToast("Signup successful! You can now login.", "success");
                setMode("login");
            } else {
                toastLib.showToast(res?.error || "Signup failed", "error");
            }
        } catch (err: any) {
            toastLib.errorToToast(err, "Signup failed");
        } finally {
            setLoading(false);
        }
    }

    return {
        mode, setMode,
        loading,
        email, setEmail,
        password, setPassword,
        name, setName,
        login, signup
    };
}
