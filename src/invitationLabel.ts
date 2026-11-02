export const invitationLabel = (state?: string) =>
  ({
    password_only: "Password sign-in (development)",
    pending: "Invitation pending",
    expired: "Invitation expired",
    not_invited: "No active invitation",
    mfa_pending: "MFA setup pending",
    enrolled: "MFA enrolled",
  })[state || ""] || "Setup status unavailable";
