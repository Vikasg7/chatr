import { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth";
import { SERVER_URL, API_BASE } from "@/lib/api";
import toastLib from "@/lib/toast";

interface ProfileModalProps {
    open: boolean;
    onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
    const { user, updateUser } = useAuthStore();
    const [name, setName] = useState(user?.name || "");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(user?.avatarUrl ? `${SERVER_URL}${user.avatarUrl}` : null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            if (fileInputRef.current?.files?.[0]) {
                formData.append("avatar", fileInputRef.current.files[0]);
            }

            // Use fetch directly for FormData as our api wrapper might strict JSON
            // But let's see if api wrapper handles FormData? 
            // api.ts likely sends Content-Type: application/json. 
            // We need multipart/form-data.
            // Let's us direct fetch with token.

            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_BASE}/auth/profile`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update profile");

            updateUser(data.user);
            toastLib.showToast("Profile updated!", "success");
            onClose();
        } catch (err: any) {
            toastLib.showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <Dialog static as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} open={open} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <Dialog.Panel as={motion.div} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <Dialog.Title className="text-xl font-bold text-white mb-4">Edit Profile</Dialog.Title>

                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800">
                                    {preview ? (
                                        <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-3xl font-bold">
                                            {name[0]?.toUpperCase() || "?"}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-medium">Change</span>
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
                                <input
                                    className="input"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </Dialog.Panel>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
