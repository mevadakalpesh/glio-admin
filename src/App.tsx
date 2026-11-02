import {NativeSelect} from '@/components/ui/native-select';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {accessibleModules} from "./moduleAccess";
import {WorkspaceErrorBoundary} from "./WorkspaceErrorBoundary";
import {Policies} from "./Policies";
import {StaffAlerts} from './StaffAlerts';
import { OperationsOverview, People } from "./Inspection";
import { lazy, Suspense, useState } from "react";
import { AuthProvider } from "./auth";
import { useAuth } from "./useAuth";
import { Login, RecoveryCodes, AuthFrame } from "./Login";
import {
  BrowserRouter,
  Navigate,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  UserRound,
  LogOut,
  PanelLeft,
  Search,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { modules, phases } from "./modules";
const VerificationTemplates = lazy(() => import('./VerificationTemplates').then(module => ({default:module.VerificationTemplates})));
const CancellationTemplates = lazy(() => import('./CancellationTemplates').then(module => ({default:module.CancellationTemplates})));
const ResumeTemplates = lazy(() => import('./ResumeTemplates').then(module => ({default:module.ResumeTemplates})));
const RefundTemplates = lazy(() => import('./RefundTemplates').then(module => ({default:module.RefundTemplates})));
const WalletCreditTemplates = lazy(() => import('./WalletCreditTemplates').then(module => ({default:module.WalletCreditTemplates})));
const ResolutionTemplates = lazy(() => import('./ResolutionTemplates').then(module => ({default:module.ResolutionTemplates})));
const AgreementEvidence = lazy(() => import('./AgreementEvidence').then(module => ({default:module.AgreementEvidence})));
const RideLegalDocuments = lazy(() => import('./RideLegalDocuments').then(module => ({default:module.RideLegalDocuments})));
const TripLegalDocuments = lazy(() => import('./TripLegalDocuments').then(module => ({default:module.TripLegalDocuments})));
const SupportTemplates = lazy(() => import('./SupportTemplates').then(module => ({default:module.SupportTemplates})));
const Banners = lazy(() => import('./Banners').then(module => ({default:module.Banners})));
const HelpTopics = lazy(() => import("./HelpTopics").then(module => ({default: module.HelpTopics})));
const SupportTickets = lazy(() => import("./SupportTickets").then(module => ({default: module.SupportTickets})));
const PaymentReview = lazy(() => import("./PaymentReview").then(module => ({default: module.PaymentReview})));
const PaymentAgingReports = lazy(() => import("./PaymentAgingReports").then(module => ({default: module.PaymentAgingReports})));
const CohortReports = lazy(() => import("./CohortReports").then(module => ({default: module.CohortReports})));
const LifecycleReports = lazy(() => import("./LifecycleReports").then(module => ({default: module.LifecycleReports})));
const RouteReports = lazy(() => import("./RouteReports").then(module => ({default: module.RouteReports})));
const Reports = lazy(() => import("./Reports").then(module => ({default: module.Reports})));
const Tracking = lazy(() => import("./Tracking").then(module => ({default: module.Tracking})));
const Settlements = lazy(() => import("./Settlements").then(module => ({default: module.Settlements})));
const SystemHealth = lazy(() => import("./SystemHealth").then(module => ({default: module.SystemHealth})));
const Payments = lazy(() => import("./Payments").then(module => ({default: module.Payments})));
const BankAccountReviews = lazy(() => import("./BankAccountReviews").then(module => ({default: module.BankAccountReviews})));
const PayoutOperationsHealth = lazy(() => import("./PayoutOperationsHealth").then(module => ({default: module.PayoutOperationsHealth})));
const PayoutRecovery = lazy(() => import("./PayoutRecovery").then(module => ({default: module.PayoutRecovery})));
const WithdrawalPayouts = lazy(() => import("./WithdrawalPayouts").then(module => ({default: module.WithdrawalPayouts})));
const SandboxPayouts = lazy(() => import("./SandboxPayouts").then(module => ({default: module.SandboxPayouts})));
const PayoutBeneficiaryLinks = lazy(() => import("./PayoutBeneficiaryLinks").then(module => ({default: module.PayoutBeneficiaryLinks})));
const SandboxPayoutBeneficiaries = lazy(() => import("./SandboxPayoutBeneficiaries").then(module => ({default: module.SandboxPayoutBeneficiaries})));
const Withdrawals = lazy(() => import("./Withdrawals").then(module => ({default: module.Withdrawals})));
const SystemSettings = lazy(() => import("./SystemSettings").then(module => ({default: module.SystemSettings})));
const IntegrationConfiguration = lazy(() => import("./IntegrationConfiguration").then(module => ({default: module.IntegrationConfiguration})));
const PaymentWebhookHealth = lazy(() => import("./PaymentWebhookHealth").then(module => ({default: module.PaymentWebhookHealth})));
const MapHealth = lazy(() => import("./MapHealth").then(module => ({default: module.MapHealth})));
const NotificationCampaigns = lazy(() => import("./NotificationCampaigns").then(module => ({default: module.NotificationCampaigns})));
const NotificationHealth = lazy(() => import("./NotificationHealth").then(module => ({default: module.NotificationHealth})));
const NotificationDelivery = lazy(() => import("./NotificationDelivery").then(module => ({default: module.NotificationDelivery})));
const Cases = lazy(() => import("./Cases").then(module => ({default: module.Cases})));
const Catalog = lazy(() => import("./Catalog").then(module => ({default: module.Catalog})));
const Sessions = lazy(() => import("./Sessions").then(module => ({default: module.Sessions})));
const Verification = lazy(() => import("./Verification").then(module => ({default: module.Verification})));
const Journeys = lazy(() => import("./Journeys").then(module => ({default: module.Journeys})));
const Access = lazy(() => import("./Access").then(module => ({default: module.Access})));
const groups = ["Workspace", "Operations", "People", "Finance", "Administration", "Configuration"];
function Workspace() {
  const auth = useAuth();
  const visibleModules = accessibleModules(auth.session?.staff.permissions || []);
  const [navigationSearch, setNavigationSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchedModules = visibleModules.filter(module => `${module.title} ${module.group}`.toLowerCase().includes(navigationSearch.trim().toLowerCase()));
  const [signOutError, setSignOutError] = useState("");
  const signOut = async (all = false) => {
    try {
      await auth.logout(all);
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Could not sign out.");
    }
  };
  const { pathname } = useLocation(),
    navigate = useNavigate();
  const current = modules.find(
    (m) => pathname === `/${m.id}` || pathname.startsWith(`/${m.id}/`) || (pathname === "/" && m.id === "overview"),
  );
  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside id="workspace-sidebar" className={`fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#f7f7f8] ${sidebarOpen ? "lg:flex" : ""}`}>
        <Link
          to="/"
          className="flex h-20 shrink-0 items-center gap-3 px-6"
          aria-label="Gilo Admin home"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-xl font-bold text-white">
            G
          </span>
          <span>
            <strong className="text-xl tracking-tight">Gilo</strong>
            <span className="block text-xs font-medium tracking-widest text-slate-500">
              ADMIN WORKSPACE
            </span>
          </span>
        </Link>
        <div className="relative mx-4 mb-3">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <Input aria-label="Search modules" type="search" value={navigationSearch} onChange={event => setNavigationSearch(event.target.value)} placeholder="Search modules…" className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" />
        </div>
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto px-4 pb-6"
        >
          {groups.filter(group => searchedModules.some(module => module.group === group)).map((group) => (
            <div key={group} className="mt-4">
              <p className="px-3 pb-2 text-xs font-medium text-slate-500">
                {group}
              </p>
              {searchedModules
                .filter((m) => m.group === group)
                .map((m) => (
                  <NavLink
                    key={m.id}
                    to={m.id === "overview" ? "/" : `/${m.id}`}
                    end
                    className={({ isActive }) =>
                      `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-50"}`
                    }
                  >
                    <m.icon size={17} strokeWidth={1.7} />
                    {m.title}
                  </NavLink>
                ))}
            </div>
          ))}
          {searchedModules.length === 0 && <p role="status" className="px-3 py-6 text-sm text-slate-500">No matching modules.</p>}
        </nav>
        <div className="border-t p-5 text-xs leading-5 text-slate-500">
          <span className="font-semibold text-slate-800">
            Ride & trip operations
          </span>
          <br />
          Gilo Admin · India
        </div>
      </aside>
      <div className={`min-w-0 ${sidebarOpen ? "lg:pl-64" : ""} lg:py-3 lg:pr-3`}>
      <div className="min-h-screen bg-white lg:min-h-[calc(100vh-1.5rem)] lg:rounded-2xl lg:border lg:shadow-sm">
        <header className="flex min-h-18 flex-wrap items-center justify-between gap-3 border-b px-5 py-3 md:px-7">
          <div className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen} aria-controls="workspace-sidebar" onClick={() => setSidebarOpen(value => !value)}><PanelLeft size={18} /></Button>
            <span className="text-slate-500">Gilo workspace</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="font-medium">
              {current?.title ||
                (pathname === "/roadmap"
                  ? "Implementation plan"
                  : "Page not found")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StaffAlerts/>
            <Badge
              variant="outline"
              className="gap-1.5 border-amber-200 bg-amber-50 text-amber-800"
            >
              <ShieldCheck size={12} /> {auth.session?.staff.role}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="rounded-full" />} aria-label="Staff account menu"><UserRound size={17} /></DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="mb-1 border-b px-3 py-3"><p className="max-w-64 truncate text-sm font-semibold">{auth.session?.staff.name}</p><p className="mt-1 text-xs text-slate-500">Gilo staff account</p></div>
                <DropdownMenuItem onClick={() => navigate('/sessions')}><ShieldCheck size={16}/>Account security</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut()}><LogOut size={16}/>Sign out</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut(true)}><LogOut size={16}/>Sign out everywhere</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="hidden text-xs text-slate-500 sm:block">
              Asia/Kolkata · INR
            </span>
          </div>
        </header>
        <div className="border-b bg-white p-4 lg:hidden">
          <label htmlFor="mobile-nav" className="sr-only">
            Open module
          </label>
          <NativeSelect
            id="mobile-nav"
            value={visibleModules.some(module => module.id === current?.id) ? current?.id : ""}
            onChange={(e) =>
              navigate(
                e.target.value === "overview" ? "/" : `/${e.target.value}`,
              )
            }
            className="w-full rounded-lg border p-3"
          >
            {!visibleModules.some(module => module.id === current?.id) && <option value="" disabled>Choose a module</option>}
            {visibleModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <main
          id="main"
          className="mx-auto max-w-[1600px] px-5 py-7 md:px-7 md:py-8"
        >
          {signOutError && (
            <p role="alert" className="mb-4 text-red-700">
              {signOutError}
            </p>
          )}
          <WorkspaceErrorBoundary key={pathname}>
          <Suspense fallback={<p role="status" className="rounded-lg border bg-white p-6">Loading workspace…</p>}>
          <Routes>
            <Route path="/" element={visibleModules.some(module => module.id === "overview") ? <OperationsOverview /> : <Navigate replace to={`/${visibleModules[0]?.id || "sessions"}`} />} />
            <Route path="/support/help-topics" element={<HelpTopics/>}/>
                  <Route path="/support/tickets" element={<SupportTickets />} />
            <Route path="/payments/review" element={<PaymentReview />} />
            <Route path="/reports/payment-aging" element={<PaymentAgingReports />} />
            <Route path="/reports/cohorts" element={<CohortReports />} />
            <Route path="/reports/lifecycle" element={<LifecycleReports />} />
            <Route path="/reports/routes" element={<RouteReports />} />
            <Route path="/roadmap" element={<Overview />} />
            <Route path="/activate" element={<Navigate to="/" replace />} />
            {modules
              .filter((m) => m.id !== "overview")
              .map((m) => (
                <Route
                  key={m.id}
                  path={`/${m.id}`}
                  element={
                    m.id === "reports" ? (
                      <Reports />
                    ) : m.id === "tracking" ? (
                      <Tracking />
                    ) : m.id === "wallets" ? (
                      <Settlements />
                    ) : m.id === "system" ? (
                      <SystemHealth />
                    ) : m.id === "payments" ? (
                      <Payments />
                    ) : m.id === "bank-account-reviews" ? (
                      <BankAccountReviews />
                    ) : m.id === "payout-operations-health" ? (
                      <PayoutOperationsHealth />
                    ) : m.id === "payout-recovery" ? (
                      <PayoutRecovery />
                    ) : m.id === "withdrawal-payouts" ? (
                      <WithdrawalPayouts />
                    ) : m.id === "sandbox-payouts" ? (
                      <SandboxPayouts />
                    ) : m.id === "payout-beneficiary-links" ? (
                      <PayoutBeneficiaryLinks />
                    ) : m.id === "sandbox-payout-beneficiaries" ? (
                      <SandboxPayoutBeneficiaries />
                    ) : m.id === "withdrawals" ? (
                      <Withdrawals />
                    ) : m.id === "system-settings" ? (
                      <SystemSettings />
                    ) : m.id === "integration-configuration" ? (
                      <IntegrationConfiguration />
                    ) : m.id === "payment-webhook-health" ? (
                      <PaymentWebhookHealth />
                    ) : m.id === "map-health" ? (
                      <MapHealth />
                    ) : m.id === "notification-campaigns" ? (
                      <NotificationCampaigns />
                    ) : m.id === "notification-health" ? (
                      <NotificationHealth />
                    ) : m.id === "notifications" ? (
                      <NotificationDelivery />
                    ) : m.id === "support" ? (
                      <>{auth.session?.staff.permissions.includes("support.tickets.read")&&<Link className="mb-5 inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted" to="/support/tickets">Customer support tickets</Link>}<Cases /></>
                    ) : m.id === "policies" ? (
                      <Policies />
                    ) : m.id === "resolution-templates" ? (<ResolutionTemplates/>) : m.id === "wallet-credit-templates" ? (<WalletCreditTemplates/>) : m.id === "refund-templates" ? (<RefundTemplates/>) : m.id === "resume-templates" ? (<ResumeTemplates/>) : m.id === "cancellation-templates" ? (<CancellationTemplates/>) : m.id === "verification-templates" ? (<VerificationTemplates/>) : m.id === "agreement-evidence" ? (<AgreementEvidence/>) : m.id === "trip-legal-documents" ? (<TripLegalDocuments/>) : m.id === "ride-legal-documents" ? (<RideLegalDocuments/>) : m.id === "support-templates" ? (<SupportTemplates/>) : m.id === "banners" ? (<Banners/>) : m.id === "master-data" ? (
                      <Catalog />
                    ) : m.id === "sessions" ? (
                      <Sessions />
                    ) : m.id === "verification" ? (
                      <Verification />
                    ) : m.id === "people" ? (
                      <People />
                    ) : m.id === "trips" ? (
                      <Journeys />
                    ) : m.id === "access" ? (
                      <Access key="access" />
                    ) : m.id === "audit" ? (
                      <Access key="audit" audit />
                    ) : (
                      <ModulePage module={m} />
                    )
                  }
                />
              ))}
            <Route
              path="*"
              element={
                <Card>
                  <CardHeader>
                    <CardTitle>Page not found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link className="text-emerald-700 underline" to="/">
                      Return to overview
                    </Link>
                  </CardContent>
                </Card>
              }
            />
          </Routes>
          </Suspense>
          </WorkspaceErrorBoundary>
        </main>
      </div>
      </div>
    </div>
  );
}
function Overview() {
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-emerald-700">
            Built around your journeys
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            A clear view of Gilo.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            One workspace for people, journeys and the decisions that keep them
            moving.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/ADMIN_PLAN.md" download />}
        >
          <ArrowDownToLine size={16} />
          Full implementation plan
        </Button>
      </div>
      <Card className="mb-7 overflow-hidden border-emerald-900 bg-[#103d32] text-white shadow-none">
        <CardContent className="grid gap-6 p-7 md:grid-cols-[1fr_auto] md:p-9">
          <div>
            <Badge className="mb-5 border-emerald-700 bg-emerald-900 text-emerald-100">
              STAFF ACCESS
            </Badge>
            <h2 className="text-2xl font-medium tracking-tight">
              Secure access for your Gilo team.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/80">
              Staff sign-in, authenticator verification, invitations and access
              audit are connected. Owners can inspect people, trips and rides,
              and view recorded status counts. Operational actions remain
              planned.
            </p>
          </div>
          <div className="flex items-end">
            <Button
              nativeButton={false}
              render={<Link to="/access" />}
              className="bg-white text-emerald-950 hover:bg-emerald-50"
            >
              Open team & access
              <ArrowRight size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="mb-9 grid gap-4 md:grid-cols-3">
        {[
          [
            "Scope",
            "Rides & trips",
            "Packages are planned for a later release.",
          ],
          [
            "Data connection",
            "Staff & journey APIs",
            "Owner journey inspection is read-only; money actions remain planned.",
          ],
          [
            "Design foundation",
            "shadcn/ui",
            "Free components, tailored for Gilo.",
          ],
        ].map(([label, value, copy]) => (
          <Card key={label} className="shadow-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight">
                {value}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-7 xl:grid-cols-[1.1fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your operational workspace
            </h2>
            <span className="text-xs text-slate-500">Planned modules</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules
              .filter((m) =>
                [
                  "trips",
                  "tracking",
                  "support",
                  "payments",
                  "verification",
                  "master-data",
                ].includes(m.id),
              )
              .map((m) => (
                <Link
                  key={m.id}
                  to={`/${m.id}`}
                  className="group rounded-xl border bg-white p-5 transition-colors hover:border-emerald-300 focus-visible:outline-emerald-700"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <m.icon size={19} />
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-slate-300 group-hover:text-emerald-700"
                    />
                  </div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {m.description}
                  </p>
                </Link>
              ))}
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Build sequence</h2>
          <Card className="shadow-none">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-3 border-b pb-4">
                <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Plan & frontend foundation
                  </p>
                  <p className="text-xs text-slate-500">Current delivery</p>
                </div>
              </div>
              <ol className="space-y-5">
                {phases.map(([n, title, copy]) => (
                  <li key={n} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border text-xs font-medium text-slate-400">
                      {n}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      </div>
      <p className="mt-8 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={14} /> Staff sessions are separate from rider and
        traveler accounts.
      </p>
    </>
  );
}
function ModulePage({ module: m }: { module: (typeof modules)[number] }) {
  return (
    <>
      <Badge variant="outline" className="mb-4">
        {m.phase} · Planned
      </Badge>
      <h1 className="text-3xl font-semibold tracking-tight">{m.title}</h1>
      <p className="mb-8 mt-3 text-slate-500">{m.description}</p>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>What this module will cover</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-5">
              {m.features.map((f) => (
                <li key={f} className="flex gap-3 text-sm leading-6">
                  <Layers3
                    className="mt-1 shrink-0 text-emerald-700"
                    size={16}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Implementation status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-500">
              This is the planned module scope. Live data and actions will be
              enabled with dedicated admin APIs and server-enforced permissions.
            </p>
            <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Planned permissions
            </h2>
            <div className="flex flex-wrap gap-2">
              {m.permissions.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="font-mono text-[10px]"
                >
                  {p}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-6"
              nativeButton={false}
              render={<a href="/ADMIN_PLAN.md" download />}
            >
              Read the complete plan
              <ArrowDownToLine size={14} />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
function Gate() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <AuthFrame>
        <p role="status">Checking your session…</p>
      </AuthFrame>
    );
  if (!auth.session) return <Login />;
  if (auth.recovery.length) return <RecoveryCodes />;
  return <Workspace />;
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
