declare global {
  namespace App {
    interface Locals {
      user?: {
        id: number;
        email: string;
        displayName: string;
        role: 'master' | 'staff';
        isActive: boolean;
      };
    }
  }
}

export {};