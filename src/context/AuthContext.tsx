import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Customer } from '../types';
import { userRepo } from '../services/db';
import { INITIAL_USERS } from '../services/initialData';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isCustomer: boolean;
  loginAs: (role: UserRole) => Promise<void>;
  loginWithEmail: (email: string) => Promise<boolean>;
  loginWithCredentials: (
    identifier: string,
    password?: string
  ) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => void;
  setUser: (user: User) => void;
  switchCustomer: (customer: Customer) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'tanimakmur_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Read from localStorage on mount. If not set, start as unauthenticated guest so visitors can browse or register freely
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    // Default to unauthenticated guest mode
    setCurrentUser(null);
  }, []);

  const loginAs = async (role: UserRole) => {
    const users = await userRepo.getAll();
    const target = users.find((u) => u.role === role) || (role === 'admin' ? INITIAL_USERS[0] : INITIAL_USERS[1]);
    setCurrentUser(target);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(target));
  };

  const loginWithCredentials = async (
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, message: 'Silakan masukkan Email atau Nomor WhatsApp Anda' };
    }

    const user = await userRepo.getByEmailOrPhone(cleanId);
    if (!user) {
      return {
        success: false,
        message: 'Akun dengan Email atau Nomor WhatsApp tersebut tidak ditemukan. Silakan periksa kembali atau daftar akun petani baru.',
      };
    }

    const trimmedPassword = (password || '').trim();

    // Password validation
    if (user.password) {
      if (!trimmedPassword) {
        return { success: false, message: 'Kata sandi wajib diisi.' };
      }
      if (trimmedPassword !== user.password) {
        return { success: false, message: 'Kata sandi tidak sesuai. Silakan periksa kembali.' };
      }
    }

    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return { success: true, user };
  };

  const loginWithEmail = async (email: string): Promise<boolean> => {
    const res = await loginWithCredentials(email);
    return res.success;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const setUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  };

  const switchCustomer = (customer: Customer) => {
    const customerUser: User = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      role: 'customer',
      phone: customer.phone,
      address: customer.address,
      farmerGroup: customer.farmerGroup,
    };
    setCurrentUser(customerUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customerUser));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin: currentUser?.role === 'admin',
        isCustomer: currentUser?.role === 'customer',
        loginAs,
        loginWithEmail,
        loginWithCredentials,
        logout,
        setUser,
        switchCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
