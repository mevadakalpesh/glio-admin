export type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  assigned_states?: string[];
  active: boolean;
  mfa_enabled: boolean;
  mfa_required?: boolean;
  permissions: string[];
  invitation_state?: string;
  invitation_expires_at?: string | null;
  invitation_revision?: string;
};
export type Session = {
  staff: Staff;
  csrf_token: string;
  recovery_codes?: string[];
  recovery_codes_remaining?: number;
};
export type Auth = {
  session: Session | null;
  loading: boolean;
  unavailable: string;
  accept: (value: Session) => void;
  reload: () => Promise<void>;
  logout: (all?: boolean) => Promise<void>;
  recovery: string[];
  acknowledgeRecovery: () => void;
};
